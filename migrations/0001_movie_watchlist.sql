CREATE TABLE IF NOT EXISTS movie_watchlist (
  id TEXT PRIMARY KEY NOT NULL,
  source_url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  poster_url TEXT NOT NULL,
  latest_episode TEXT NOT NULL,
  previous_episode TEXT NOT NULL DEFAULT '',
  upcoming_episode TEXT NOT NULL,
  release_date TEXT NOT NULL DEFAULT '',
  schedule_weekday INTEGER CHECK (schedule_weekday BETWEEN 0 AND 6),
  last_checked_at TEXT NOT NULL,
  sync_error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS movie_watchlist_created_at_idx
  ON movie_watchlist (created_at DESC);
