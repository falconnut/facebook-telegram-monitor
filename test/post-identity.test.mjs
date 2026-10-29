import test from "node:test";
import assert from "node:assert/strict";
import { allPostIds, mergePosts, postWasSeen } from "../src/post-identity.mjs";

test("merges the same post returned by multiple Facebook URLs", () => {
  const posts = mergePosts([
    { id: "123", ids: ["123", "pfbid-a"], text: "short", publishedAtMs: null },
    { id: "123", ids: ["123", "pfbid-b"], text: "longer text", publishedAtMs: 456 },
  ]);

  assert.equal(posts.length, 1);
  assert.deepEqual(posts[0].ids, ["123", "pfbid-a", "pfbid-b"]);
  assert.equal(posts[0].text, "longer text");
  assert.equal(posts[0].publishedAtMs, 456);
});

test("recognizes a post through any stable or Facebook-generated alias", () => {
  const post = { ids: ["123", "pfbid-new"] };
  assert.equal(postWasSeen(post, new Set(["123"])), true);
  assert.equal(postWasSeen(post, new Set(["pfbid-new"])), true);
  assert.equal(postWasSeen(post, new Set(["different"])), false);
});

test("collects unique aliases for state migration", () => {
  assert.deepEqual(
    allPostIds([{ ids: ["123", "pfbid-a"] }, { ids: ["123", "pfbid-b"] }]),
    ["123", "pfbid-a", "pfbid-b"],
  );
});
