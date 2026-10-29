export function mergePosts(posts) {
  const merged = [];
  const byId = new Map();

  for (const post of posts) {
    const existing = post.ids.map((id) => byId.get(id)).find(Boolean);
    if (existing) {
      existing.ids = [...new Set([...existing.ids, ...post.ids])];
      for (const id of existing.ids) byId.set(id, existing);
      if (!existing.publishedAtMs && post.publishedAtMs) {
        existing.publishedAtMs = post.publishedAtMs;
      }
      if (post.text.length > existing.text.length) existing.text = post.text;
      continue;
    }

    const added = { ...post, ids: [...post.ids] };
    merged.push(added);
    for (const id of added.ids) byId.set(id, added);
  }

  return merged;
}

export function postWasSeen(post, seen) {
  return post.ids.some((id) => seen.has(id));
}

export function allPostIds(posts) {
  return [...new Set(posts.flatMap((post) => post.ids))];
}
