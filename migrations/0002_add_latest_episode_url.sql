ALTER TABLE movie_watchlist
  ADD COLUMN latest_episode_url TEXT NOT NULL DEFAULT '';

ALTER TABLE movie_watchlist
  ADD COLUMN latest_episode_audio TEXT NOT NULL DEFAULT 'Vietsub';
