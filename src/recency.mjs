export function postAgeHours(post, nowMs = Date.now()) {
  if (Number.isFinite(post.publishedAtMs)) {
    return Math.max(0, (nowMs - post.publishedAtMs) / 3_600_000);
  }

  const value = String(post.timeText || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("th-TH");
  if (!value) return null;
  if (/^(?:ตอนนี้|เมื่อสักครู่|just now|now)$/.test(value)) return 0;

  const amount = Number(value.match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(",", "."));
  if (Number.isFinite(amount)) {
    if (/(?:วินาที|second|sec|^\d+\s*s$)/.test(value)) return amount / 3_600;
    if (/(?:นาที|minute|min|^\d+\s*m$)/.test(value)) return amount / 60;
    if (/(?:ชั่วโมง|ชม\.?|hour|hr|^\d+\s*h$)/.test(value)) return amount;
    if (/(?:วัน|day|^\d+\s*d$)/.test(value)) return amount * 24;
    if (/(?:สัปดาห์|week|wk)/.test(value)) return amount * 24 * 7;
  }

  if (/(?:เมื่อวาน|yesterday)/.test(value)) return 24;
  return null;
}

export function isFreshPost(post, maxAgeHours = 12, nowMs = Date.now()) {
  const ageHours = postAgeHours(post, nowMs);
  return ageHours !== null && ageHours <= maxAgeHours;
}
