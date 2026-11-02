# Space / Work

Personal workspace built with React, Vite, Framer Motion, and Lucide.

The dashboard includes a movie watchlist backed by D1. Paste a public movie-page URL from `hhkungfu.ee` to read its title, poster, two latest episode links, and next episode number. The Worker checks the source's `robots.txt` before fetching pages and only reads page metadata; it does not fetch or embed video streams. A Cloudflare Cron Trigger refreshes saved titles and showtime schedules daily at 02:00 UTC (09:00 Vietnam time).

## Development

```sh
npm install
npm run dev
```

## Build and deploy

```sh
npm run build
npx wrangler d1 migrations apply db_duyvu --remote
npx wrangler deploy
```

Vite builds the static site into `dist/`, which is served by the Cloudflare Worker configured in `wrangler.jsonc`. The Worker continues to serve the `/api/*` endpoints.

Apply the D1 migration once before the first deployment of the watchlist API. The daily refresh trigger becomes active when the Worker is deployed.

Weekly tasks are read-only in the dashboard. `/api/tasks?week=YYYY-MM-DD` reads the Monday-to-Sunday task records from the `schedule_79fca2b43a5edc834a8f3b15770a19042455751b5a789575e13b65001b237197` D1 table. Each row stores its date in `date` and the task-list JSON in `tasks`.
