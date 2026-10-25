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

Weekly tasks are read-only in the dashboard. `/api/tasks?week=YYYY-MM-DD` reads the Monday-to-Sunday task records from the `schedule_79fca2b43a5edc834a8f3b15770a19042455751b5a789575e13b65001b237197` D1 table. Each row stores its date in `date` and the task-list JSON in `tasks`.
