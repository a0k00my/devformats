# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (always use background mode)
npx astro dev --background
npx astro dev stop
npx astro dev status
npx astro dev logs

# Build & preview
npx astro build
npx astro preview
```

No test framework is configured.

## Architecture

This is a bare-bones **Astro 7** static site — a starter template that has not yet implemented its intended JSON formatter functionality.

**Routing**: Astro uses file-based routing. Files under `src/pages/` map directly to URL routes. `index.astro` → `/`.

**Component model**: `.astro` files are the native component format. The frontmatter block (between `---` fences) runs at build time server-side only. Client-side interactivity requires either a `<script>` tag or a framework component (React/Vue/Svelte) added via an Astro integration.

**Layout pattern**: `src/layouts/Layout.astro` wraps pages via Astro's `<slot />` mechanism. Pages import and wrap their content with it.

**No framework components yet** — if adding interactive JSON formatter UI, either use a `<script>` tag in an `.astro` component (for simple interactivity) or install a framework integration (`npx astro add react`) and add `.tsx` components.

**API routes**: Not yet present. To add server-side logic, create files under `src/pages/api/` — they export `GET`/`POST` handlers and are only available when running in SSR mode (requires setting `output: 'server'` in `astro.config.mjs`).

## Documentation

- [Routing](https://docs.astro.build/en/guides/routing/)
- [Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Framework components](https://docs.astro.build/en/guides/framework-components/)
- [Styling / Tailwind](https://docs.astro.build/en/guides/styling/)
