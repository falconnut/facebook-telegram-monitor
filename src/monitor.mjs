import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const PAGE_URL = process.env.FB_PAGE_URL
  || "https://www.facebook.com/people/Golfclub-by-benz/100083124501694/";
const STATE_PATH = process.env.STATE_PATH || "data/state.json";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const DRY_RUN = process.env.DRY_RUN === "1";
const TEST_NOTIFICATION = process.env.TEST_NOTIFICATION === "1";
const MAX_SEEN = 200;

function normalizeSpace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizePostUrl(rawUrl) {
  const url = new URL(rawUrl, "https://www.facebook.com");
  const storyId = url.searchParams.get("story_fbid");
  const pageId = url.searchParams.get("id");

  if (storyId) {
    const normalized = new URL("https://www.facebook.com/permalink.php");
    normalized.searchParams.set("story_fbid", storyId);
    if (pageId) normalized.searchParams.set("id", pageId);
    return normalized.toString();
  }

  const postMatch = url.pathname.match(/\/(?:posts|videos)\/([^/?]+)/);
  if (postMatch) {
    return `https://www.facebook.com${url.pathname.replace(/\/$/, "")}`;
  }

  return `${url.origin}${url.pathname}`;
}

function postIdFromUrl(url) {
  const parsed = new URL(url);
  return parsed.searchParams.get("story_fbid")
    || parsed.pathname.match(/\/(?:posts|videos)\/([^/?]+)/)?.[1]
    || url;
}

async function loadState() {
  try {
    const parsed = JSON.parse(await readFile(STATE_PATH, "utf8"));
    return {
      seen: Array.isArray(parsed.seen) ? parsed.seen : [],
      updatedAt: parsed.updatedAt || null,
    };
  } catch (error) {
    if (error.code === "ENOENT") return { seen: [], updatedAt: null };
    throw error;
  }
}

async function saveState(state) {
  const output = {
    seen: [...new Set(state.seen)].slice(0, MAX_SEEN),
    updatedAt: new Date().toISOString(),
  };
  await writeFile(STATE_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
}

async function collectPosts() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "th-TH",
    timezoneId: "Asia/Bangkok",
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      + "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    await page.goto(PAGE_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    const closeButton = page.getByRole("button", { name: "Close", exact: true });
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click().catch(() => {});
    }

    await page.waitForTimeout(2_000);
    for (let index = 0; index < 2; index += 1) {
      await page.mouse.wheel(0, 1_500);
      await page.waitForTimeout(1_000);
    }

    const articles = await page.locator('[role="article"]').evaluateAll((nodes) => (
      nodes.map((article) => {
        const anchors = [...article.querySelectorAll("a[href]")];
        const permalink = anchors.find((anchor) => {
          const href = anchor.getAttribute("href") || "";
          return href.includes("permalink.php")
            || href.includes("story_fbid=")
            || href.includes("/posts/")
            || href.includes("/videos/");
        });

        if (!permalink) return null;
        const text = article.innerText || article.textContent || "";
        const timeText = permalink.textContent?.trim() || "";
        return { href: permalink.href, text, timeText };
      }).filter(Boolean)
    ));

    const unique = new Map();
    for (const article of articles) {
      const url = normalizePostUrl(article.href);
      const id = postIdFromUrl(url);
      const text = normalizeSpace(article.text)
        .replace(/\b(?:Like|Comment|Send message|See more)\b/gi, "")
        .trim();
      if (!unique.has(id) && text) {
        unique.set(id, {
          id,
          url,
          timeText: normalizeSpace(article.timeText),
          text: text.slice(0, 2_500),
        });
      }
    }

    return [...unique.values()];
  } catch (error) {
    await page.screenshot({ path: "debug-facebook.png", fullPage: true }).catch(() => {});
    throw error;
  } finally {
    await browser.close();
  }
}

async function sendTelegramMessage(message) {
  if (DRY_RUN) {
    console.log(`[dry-run] ${message}`);
    return;
  }

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID secret");
  }

  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message.slice(0, 4_096),
        disable_web_page_preview: false,
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram sendMessage failed (${response.status}): ${body.slice(0, 300)}`);
  }
}

async function sendTelegram(post) {
  const prefix = post.timeText ? `โพสต์ใหม่ (${post.timeText})` : "โพสต์ใหม่";
  await sendTelegramMessage(`${prefix}\n\n${post.text}\n\n${post.url}`);
}

async function main() {
  const state = await loadState();
  const posts = await collectPosts();

  if (posts.length === 0) {
    throw new Error("No Facebook posts with permanent links were found");
  }

  if (TEST_NOTIFICATION) {
    await sendTelegramMessage(
      `✅ ทดสอบระบบสำเร็จ\n\nตรวจสอบเพจ Golfclub by benz ได้ตามปกติ\nพบโพสต์ล่าสุด ${posts.length} โพสต์\n\n${posts[0].url}`,
    );
    console.log("Test notification sent to Telegram.");
    return;
  }

  if (state.seen.length === 0) {
    await saveState({ seen: posts.map((post) => post.id) });
    console.log(`Baseline created with ${posts.length} posts; no alerts sent.`);
    return;
  }

  const seen = new Set(state.seen);
  const newPosts = posts.filter((post) => !seen.has(post.id)).reverse();

  for (const post of newPosts) {
    await sendTelegram(post);
    seen.add(post.id);
    console.log(`Sent post ${post.id}`);
  }

  await saveState({ seen: [...newPosts.map((post) => post.id), ...state.seen] });
  console.log(newPosts.length === 0 ? "No new posts." : `Sent ${newPosts.length} new posts.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
