# DevFormats — Step-by-Step Build Prompt

> **How to use this file:** Don't paste the whole thing at once. Paste **Phase 0** first, complete it, then Phase 1, and so on. Each phase is self-contained. If using Claude Code, run it from inside the new project folder so it can read the existing code.

---

## Project Context (paste this at the start of every new session)

I am migrating and expanding an existing developer-tools site.

**Current state:**
- Existing site: `jsonformatteronline.in` — Astro static site, deployed on Cloudflare Pages
- Existing tools: JSON Formatter (homepage), JSON Validator, JSON Minifier, JSON to CSV, JSON Diff
- All processing is 100% client-side. No backend. No server calls after page load.
- Existing site has 8 language variants (EN, ES, FR, DE, ZH, HI, PT, JA)

**Target state:**
- New domain: `devformats.com`
- New brand: **DevFormats**
- Tagline: *Fast, private developer tools for formatting, validating, converting and generating structured data.*
- ~30 tools across JSON / YAML / XML / Converters / Generators / Encoding / JWT
- Still: Astro, static output, 100% client-side, Cloudflare Pages, no backend

**Hard constraints (do not violate):**
1. **Astro only.** Do NOT migrate to Next.js/React Router/Remix. Astro's zero-JS-by-default output is the competitive advantage.
2. **Static output only.** `output: 'static'`. No SSR, no server endpoints, no API routes.
3. **Zero network calls after page load.** Every tool runs in the browser. This is the product's entire differentiation.
4. **No i18n in v1.** English only. We are dropping the 8-language setup — it's translation debt across 30 tools. Revisit at 20K visits/mo.
5. **Bundle budget:** each tool page ≤ 100KB gzipped JS. Homepage ≤ 40KB.
6. **Lighthouse target:** Performance 95+, Accessibility 95+, Best Practices 100, SEO 100.
7. **No ads in v1**, but reserve ad slots in the layout (see Phase 6).

**Ask me before:** changing the framework, adding a state-management library, adding a build-time dependency over 500KB, or introducing any server-side behavior.

---

# PHASE 0 — Project setup & migration prep

**Goal:** clean new project, old code copied in, nothing broken.

## Tasks

### 0.1 Fork the project
I have copied `jsonformatteronline.in` to a new folder. Read the existing structure and tell me:
- What the current folder layout is
- Which components are reusable as-is
- Which are JSON-specific and need to be generalized
- What the current i18n implementation looks like (so we can rip it out cleanly)

### 0.2 Strip i18n
Remove the 8-language routing, translation files, and language switcher. Keep only English. Remove all `hreflang` tags except `x-default` (or remove entirely — single-language sites don't need them).

### 0.3 Update `astro.config.mjs`
```
site: 'https://devformats.com'
output: 'static'
```
Add `@astrojs/sitemap`. Confirm Tailwind is wired.

### 0.4 Global find-and-replace
- `jsonformatteronline.in` → `devformats.com`
- "JSON Formatter Online" → "DevFormats" (brand references only, not tool names)
- Update all canonical URLs, OG URLs, sitemap references

### 0.5 Fix the sins from the old site
- **Delete every `<meta name="keywords">` tag.** Google has ignored these since 2009.
- **De-stuff the FAQ copy.** The old homepage repeats "free online JSON formatter", "pretty JSON formatter" etc. excessively, often bolded. New rule: each target keyword appears **max 3–4 times across the entire page**, never bolded for SEO reasons. Rewrite naturally.
- **Verify `robots.txt` exists** at root: allow all, reference `https://devformats.com/sitemap-index.xml`

### 0.6 Deliver
Show me the updated config, the list of files you deleted, and a diff summary. Don't build any new tools yet.

---

# PHASE 1 — Design system

**Goal:** the visual foundation everything else inherits.

## Reference quality bar
GitHub, Vercel, Linear, Raycast. **Do not** look like CodeBeautify or jsonformatter.org — those are ad-choked and dated. We are the premium alternative.

## Design principles
- Extremely clean, minimal, zero clutter
- Excellent whitespace — generous, not cramped
- Modern typography
- Rounded corners, subtle shadows
- Light AND dark mode, both first-class. Dark mode must be as polished as GitHub's.
- Accessibility first — WCAG AA contrast minimum, full keyboard nav, visible focus rings
- **No** gradients-for-decoration, **no** distracting accent colors, **no** hero blob animations
- Animations sparingly (Framer Motion is optional — prefer CSS transitions; only reach for FM if there's a real need, and if so, load it only on the island that needs it)

## Deliver
1. **Color tokens** — CSS custom properties for light + dark. Neutral-heavy palette, one restrained accent. Define: bg, bg-subtle, bg-muted, border, border-strong, fg, fg-muted, fg-subtle, accent, accent-fg, success, warning, danger.
2. **Typography scale** — font stack (system UI for prose, a real mono for editors), sizes, weights, line-heights.
3. **Spacing scale** — stick to Tailwind's, document exceptions.
4. **Radius + shadow tokens.**
5. **Theme toggle** — respects `prefers-color-scheme`, persists to localStorage, **no flash of wrong theme** (inline script in `<head>`).
6. A `/styleguide` page rendering every token and component state so I can eyeball it.

Show me the tokens before building components.

---

# PHASE 2 — Layout shell & components

**Goal:** every page inherits one consistent shell.

## 2.1 Top navigation
Lightweight. **No mega menu.**
- Logo (DevFormats)
- Search (triggers command palette — see 2.4)
- Tools (link to `/tools`)
- Categories (link to `/categories`)
- Blog
- GitHub
- Theme toggle

Mobile: hamburger → simple slide-out.

## 2.2 Footer
Columns:
- **Categories** — JSON, YAML, XML, Converters, Generators, Encoding, JWT
- **Popular Tools** — top 8
- **Resources** — Documentation, Blog, GitHub
- **Company** — Privacy, Terms, About

Include the "all processing happens in your browser" line. This is the brand promise — repeat it.

## 2.3 Tool registry (do this before anything else)
Create `src/data/tools.ts` — a single typed source of truth:

```ts
export type Tool = {
  slug: string;              // 'json-formatter'
  name: string;              // 'JSON Formatter'
  category: Category;        // 'json'
  description: string;       // one line, used in cards
  metaTitle: string;
  metaDescription: string;
  keywords: string[];        // for search filtering, NOT meta tags
  icon: string;              // lucide icon name
  related: string[];         // slugs
  status: 'live' | 'planned';
  addedAt: string;           // ISO date, drives "Recently Added"
};
```

**Everything reads from this:** nav, footer, homepage cards, category pages, search index, sitemap, related-tools sections. Adding a tool should mean adding one registry entry + one page file. Never hardcode a tool list anywhere else.

## 2.4 Search / command palette
- `Cmd/Ctrl+K` opens it, `/` also opens it
- Instant client-side fuzzy filter over the registry (name + keywords + category)
- Full keyboard nav: arrows, Enter, Esc
- Searching `json` → all JSON tools. `validator` → all validators. `yaml` → all YAML tools.
- **This is the one place a React/shadcn island is worth it.** Everything else stays static Astro. If shadcn's Command component costs more than ~20KB gz, hand-roll it instead.

## 2.5 Reusable components
- `ToolCard` — icon, name, one-line description
- `CategoryCard` — icon, name, tool count, description
- `Breadcrumb` — with schema
- `FAQ` — accordion, emits FAQPage schema
- `RelatedTools` — reads from registry
- `SEO` — the head component (Phase 5)

## Deliver
Folder structure, component hierarchy, the registry file with all 30 tools stubbed (`status: 'planned'` for unbuilt ones), and the shell rendering.

---

# PHASE 3 — Homepage

## Hero
Centered. Generous vertical space.
- Logo + **DevFormats**
- H1: **Fast Developer Tools for Structured Data**
- Sub: *Format, validate, convert and generate JSON, YAML, XML, JWT, CSV and more — all processed locally in your browser.*
- Large search box below. Placeholder: `Search developer tools...`
- Typing shows instant suggestions (JSON Formatter, JSON Validator, YAML Formatter, JWT Decoder, CSV → JSON…)

## Popular Tools
Responsive card grid, 10 cards: JSON Formatter, JSON Validator, JSON Parser, JSON Viewer, YAML Formatter, XML Formatter, JWT Decoder, Base64 Encode/Decode, CSV → JSON, JSON → YAML.

## Browse by Category
Large cards: JSON, YAML, XML, Converters, Validators, Generators, Encoding, API Tools. Each: icon, tool count (from registry), description, clickable.

## Recently Added
Horizontal cards, sorted by `addedAt` from the registry — auto-updating, not hardcoded.

## Why DevFormats
Four cards:
- ⚡ **Fast** — Runs instantly, no upload, no queue.
- 🔒 **Privacy First** — Everything stays in your browser. Nothing is uploaded, ever.
- 🌍 **Free** — Unlimited usage. No signup, no limits, no watermarks.
- 💻 **Built for Developers** — Keyboard shortcuts, dark mode, responsive.

> **Note on the privacy claim:** make it *provable*. Add a line like "Turn off your wifi — the tools still work." That's the wedge against iLovePDF/CodeBeautify-class competitors who upload everything. Consider a small "0 requests sent" indicator on tool pages.

## Constraints
- Homepage JS ≤ 40KB gz (search island + theme toggle only)
- No hero animation beyond a subtle fade-in

---

# PHASE 4 — Tool page template

**This is the most important artifact in the project.** Build it once, use it 30 times.

## Above the fold
- Breadcrumb: `JSON > Formatter` (with BreadcrumbList schema)
- H1: tool name (natural, not stuffed)
- One-line description
- **The tool itself** — no throat-clearing, no marketing copy before it

## Tool area
- Two panels: input left, output right
- Stacks vertically below 768px
- Resizable divider on desktop
- Syntax highlighting, line numbers, error highlighting with line/col
- **Lazy-load the editor.** Don't ship CodeMirror/Monaco to users who bounce. Consider CodeMirror 6 (~60KB gz, tree-shakeable) over Monaco (~2MB+ — too heavy, do not use).

## Toolbar
Format · Minify · Validate · Sort Keys · Copy · Download · Upload File · Sample Data · Clear

## Behavior rules (carry these over from the old site — they were right)
- **No auto-run on keystroke.** User clicks the action button explicitly. Show a subtle "dirty" indicator when input has changed since last run.
- **Persist input to localStorage**, restore on return
- Keyboard: `Cmd/Ctrl+Enter` = run, `Cmd/Ctrl+K` = search, `Esc` = clear focus
- Show input size (chars / bytes) inline
- File upload reads locally via FileReader — never uploads

## Below the tool
- **Related Tools** — 3–6 cards from the registry
- **Related Converters** — where relevant
- **Documentation** — collapsible so it doesn't overwhelm. Sections:
  1. What is {Tool}?
  2. How it works
  3. Features
  4. Examples (real code/data, not lorem)
  5. Common Errors
  6. Best Practices
  7. FAQ (8–12 questions, natural long-tail phrasing)
  8. Spec links (RFC 8259 for JSON, YAML 1.2 spec, RFC 7519 for JWT, etc.)

## Content rules — do NOT repeat the old site's mistakes
**DO:**
- Write for the developer who needs this tool right now
- Short paragraphs, 2–3 sentences
- Concrete examples with actual code
- Link out to specs

**DON'T:**
- Bold the target keyword every paragraph
- Write "this is the best free tool available"
- Stuff every keyword synonym into the FAQ
- Exceed ~1500 words total on-page copy

## Deliver
The template + `/json-formatter` built on it as the reference implementation. I'll review before you build the other 29.

---

# PHASE 5 — SEO layer

Every page, no exceptions:

- Unique `<title>`: `{Tool Name} — {Value Prop} | DevFormats`
- Unique meta description, 150–160 chars, natural, one keyword mention
- Canonical URL (absolute, `https://devformats.com/...`)
- OG tags: title, description, image, url, type, site_name
- Twitter card tags
- **JSON-LD:** `SoftwareApplication` + `FAQPage` + `BreadcrumbList`
- **NO `meta keywords`**

Plus:
- `sitemap-index.xml` via `@astrojs/sitemap`, auto-generated from the registry
- `robots.txt` referencing the sitemap
- OG images — generate at build time per tool (Satori/`astro-og-canvas`), don't hand-make 30 PNGs
- Internal linking: every tool links to ≥3 siblings; every category page links to all its tools; homepage links to all categories

---

# PHASE 6 — Ad slots (build now, enable later)

I will monetize with AdSense once traffic justifies it, but v1 ships **ad-free** — bad first impressions kill sharing.

Build in now:
- A `<AdSlot />` component that renders **nothing** when `PUBLIC_ADS_ENABLED !== 'true'`
- Reserved placements: **below the tool output**, and **between the FAQ and footer**. Never above the fold, never beside the editor, never inside the tool panel.
- Reserve fixed height so enabling ads later doesn't cause CLS
- Env-flag controlled so I can flip it in Cloudflare Pages without a code change

---

# PHASE 7 — Build the tools

Build in this order. **One at a time.** After each: show me the page file, new components, new utils, npm packages to install, and the registry entry.

### Wave 1 — port existing (already written, just re-skin to the new template)
1. `/json-formatter` — homepage tool, also lives at its own URL
2. `/json-validator`
3. `/json-minifier`
4. `/json-to-csv`
5. `/json-compare` (was JSON Diff)

### Wave 2 — highest ROI new tools
6. `/yaml-formatter` — `js-yaml`. Format / validate / minify. 2sp/4sp. Error line+col.
7. `/xml-formatter` — DOMParser + custom pretty-printer. Handle namespaces, CDATA, comments.
8. `/json-to-yaml` — preserve key order
9. `/yaml-to-json` — mirror
10. `/jwt-decoder` — `jose`. Header/Payload/Signature panels. Show alg, expiry with relative time ("expires in 2h 15m"). Signature verify (paste secret/JWK). **Warn on `alg: none` and expired tokens.** Support HS256/384/512, RS256/384/512, ES256/384.

### Wave 3 — volume plays
11. `/base64` — encode/decode toggle, text + file, URL-safe variant, Unicode-safe via `TextEncoder` (not naive `btoa`)
12. `/csv-to-json` — `papaparse`. Delimiter detection, header toggle, array-of-objects vs array-of-arrays, quoted/escaped fields, newlines in fields
13. `/json-to-typescript` — interface vs type alias, optional fields, root name, `unknown` vs `any`
14. `/json-viewer` — collapsible tree, search within, path copy
15. `/json-parser` — parse + explain errors clearly

### Wave 4 — depth
16. `/json-schema-validator` — `ajv`, errors with JSON pointers
17. `/jsonpath` — `jsonpath-plus`, live query, show matched values + paths
18. `/json-to-xml`
19. `/xml-to-json`
20. `/xml-validator`
21. `/xml-parser`
22. `/yaml-validator`
23. `/yaml-parser`

### Wave 5 — generators & encoding
24. `/go-struct-generator`
25. `/python-dataclass-generator`
26. `/url-encode`
27. `/url-decode`
28. `/html-encode`
29. `/html-decode`

### Category index pages
`/json`, `/yaml`, `/xml`, `/converters`, `/generators`, `/encoding`, `/jwt`, `/tools`, `/categories` — all generated from the registry.

## Library choices (client-side only)
| Need | Use |
|---|---|
| YAML | `js-yaml` |
| XML | DOMParser (native) + custom printer |
| JWT | `jose` |
| JSON Schema | `ajv` |
| JSONPath | `jsonpath-plus` |
| CSV | `papaparse` |
| Base64 | native `btoa`/`atob` + `TextEncoder` |
| Editor | CodeMirror 6 (lazy-loaded). **Not Monaco.** |

Do not add heavy runtime frameworks. Every dependency must be justified against the 100KB/page budget.

---

# PHASE 8 — Migration cutover

**Only after devformats.com is live and complete.**

1. **301 redirect map** — every `jsonformatteronline.in` URL → its devformats.com equivalent. Old JSON Formatter → `/json-formatter`, etc. Cloudflare Bulk Redirects or a `_redirects` file.
2. **Do not redirect to the homepage.** Map each URL to its true equivalent or the redirect gets treated as a soft 404.
3. **Search Console** — add devformats.com property, verify, then use **Change of Address** on the old `.in` property.
4. **Keep the `.in` registered for 2+ years** so the redirects keep passing authority.
5. Submit the new sitemap. Request indexing on the top 5 pages.
6. Update any existing backlinks you control.

Expect a 2–8 week dip. Normal.

---

# PHASE 9 — Ship checklist

Before I announce anything:
- [ ] Lighthouse 95+/95+/100/100 on homepage + 3 random tool pages
- [ ] Every tool works with wifi off (open devtools Network tab — should be zero requests after load)
- [ ] Dark mode has no flash on load
- [ ] Cmd+K works everywhere
- [ ] Mobile: every tool usable on a 375px viewport
- [ ] `sitemap-index.xml` lists every page
- [ ] Zero `meta keywords` tags remain
- [ ] Every tool page has SoftwareApplication + FAQPage + BreadcrumbList schema (test in Google Rich Results Test)
- [ ] 301s from the old domain all resolve correctly (test 10 URLs)
- [ ] No console errors on any page

---

# Deliverable format

For each task, give me:
1. Full file contents for new/changed files (not fragments)
2. npm packages to install
3. Registry entries to add
4. A one-line summary of what changed

Stop and ask before architectural decisions. Don't build ahead — one phase at a time.

---

## START HERE

**Run Phase 0.** Read my existing project structure and report back what you find before changing anything.
