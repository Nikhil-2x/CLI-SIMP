// Posts (or updates) a PR comment via the GitHub REST API using plain fetch —
// no extra SDK dependency. Uses the minimally-scoped GITHUB_TOKEN provided by
// Actions (contents: read, pull-requests: write) — never a privileged token,
// and never executes anything from the PR itself. See plan Phase 11/constraints.

import { COMMENT_MARKER } from "../pr/comment.js";

export interface PostCommentOptions {
  token: string;
  owner: string;
  repo: string;
  prNumber: number;
  body: string;
}

interface GitHubComment {
  id: number;
  body: string;
}

const API_BASE = "https://api.github.com";

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function upsertPRComment(options: PostCommentOptions): Promise<void> {
  const { token, owner, repo, prNumber, body } = options;
  const listUrl = `${API_BASE}/repos/${owner}/${repo}/issues/${prNumber}/comments`;

  // Walk every page so a busy PR doesn't hide our earlier comment (→ duplicates).
  let existing: GitHubComment | undefined;
  for (let page = 1; !existing; page++) {
    const listRes = await fetch(`${listUrl}?per_page=100&page=${page}`, { headers: headers(token) });
    if (!listRes.ok) {
      throw new Error(`Failed to list PR comments: ${listRes.status} ${await listRes.text()}`);
    }
    const comments = (await listRes.json()) as GitHubComment[];
    existing = comments.find((c) => c.body.includes(COMMENT_MARKER));
    if (comments.length < 100) break;
  }

  if (existing) {
    const updateUrl = `${API_BASE}/repos/${owner}/${repo}/issues/comments/${existing.id}`;
    const res = await fetch(updateUrl, {
      method: "PATCH",
      headers: headers(token),
      body: JSON.stringify({ body }),
    });
    if (!res.ok) {
      throw new Error(`Failed to update PR comment: ${res.status} ${await res.text()}`);
    }
    return;
  }

  const res = await fetch(listUrl, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create PR comment: ${res.status} ${await res.text()}`);
  }
}
