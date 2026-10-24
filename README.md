# Space / Work

Personal workspace built with React, Vite, Framer Motion, and Lucide.

## Development

```sh
npm install
npm run dev
```

## Build and deploy

```sh
npm run build
npx wrangler deploy
```

Vite builds the static site into `dist/`, which is served by the Cloudflare Worker configured in `wrangler.jsonc`. The Worker continues to serve the `/api/*` endpoints.

Weekly tasks are read-only in the dashboard. `/api/tasks?week=YYYY-MM-DD` reads the Monday-to-Sunday task records from the `web_data` D1 table, using the `tasks:YYYY-MM-DD` keys written by the `myweb` calendar app.
