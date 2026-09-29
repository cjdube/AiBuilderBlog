-- Reader comments. Every comment starts as 'pending' and shows on the post
-- only after it is approved from /admin/comments.
CREATE TABLE comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  post_slug  TEXT    NOT NULL,
  name       TEXT    NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  body       TEXT    NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  status     TEXT    NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'spam')),
  -- Salted hash of the sender's IP, kept only to rate-limit. Never the IP.
  ip_hash    TEXT    NOT NULL
);

CREATE INDEX comments_post_status ON comments (post_slug, status);
CREATE INDEX comments_ip_time ON comments (ip_hash, created_at);
