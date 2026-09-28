import test from "node:test";
import assert from "node:assert/strict";
import { isFreshPost, postAgeHours } from "../src/recency.mjs";

test("accepts recent Thai and English relative times", () => {
  assert.equal(isFreshPost({ timeText: "5 นาที" }, 12), true);
  assert.equal(isFreshPost({ timeText: "12 ชม." }, 12), true);
  assert.equal(isFreshPost({ timeText: "2 hr" }, 12), true);
});

test("rejects old relative times", () => {
  assert.equal(isFreshPost({ timeText: "13 ชั่วโมง" }, 12), false);
  assert.equal(isFreshPost({ timeText: "2 วันที่แล้ว" }, 12), false);
  assert.equal(isFreshPost({ timeText: "เมื่อวานนี้" }, 12), false);
});

test("rejects missing or unknown dates instead of risking an old alert", () => {
  assert.equal(isFreshPost({ timeText: "" }, 12), false);
  assert.equal(isFreshPost({ timeText: "27 ก.ย." }, 12), false);
});

test("prefers an exact published timestamp when Facebook provides one", () => {
  const nowMs = Date.UTC(2026, 8, 28, 12);
  assert.equal(postAgeHours({ publishedAtMs: nowMs - 6 * 3_600_000 }, nowMs), 6);
  assert.equal(isFreshPost({ publishedAtMs: nowMs - 6 * 3_600_000 }, 12, nowMs), true);
  assert.equal(isFreshPost({ publishedAtMs: nowMs - 24 * 3_600_000 }, 12, nowMs), false);
});
