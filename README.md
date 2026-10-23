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
