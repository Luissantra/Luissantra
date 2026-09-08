# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start        # Static preview of the public site at http://localhost:8080 (python3 -m http.server)
npm run admin    # Local CMS (Express) at http://localhost:3030/admin, also serves the site at :3030
npm run build    # Image pipeline + regenerates data/galleries.json (scripts/build.js)
```

`start-cms.command` is a macOS double-click wrapper around `npm run admin`.

There is no test suite, linter, or bundler.
Verification is manual: run the site and look at it.
`scratch/puppeteer-test.js` is an ad-hoc screenshot script and puppeteer is **not** a declared dependency, so install it on demand if you want automated screenshots.

## Architecture

Vanilla static site: two HTML pages, native ES modules, no framework and no build step for JS/CSS.
`scripts/main.js` is the only entry point for both pages and acts as the router: it sniffs `window.location.pathname` for `gallery.html` and calls `initGalleryPage()`, otherwise `initHomePage()`.
Everything else is an `init*` function exported from a single-purpose module (`theme.js`, `ui.js`, `home.js`, `gallery.js`, `lightbox.js`).

`styles/main.css` contains only `@import` statements; the cascade order there (variables → reset → layout → components → lightbox → utilities) is load-bearing, so add new modules in the right slot rather than appending.
Design tokens live in `styles/variables.css` under `:root` and are redefined under `[data-theme="dark"]`.

### Data flow (the important part)

Two JSON files under `data/`, with different roles:

- `data/favourites.json` is **hand/CMS-edited source of truth** for the Favourites collection. Entries are either a plain string or `{ "src": "gallery-id/file.webp", "featured": true }`. All consumers must handle both shapes.
- `data/galleries.json` is **generated output** of `scripts/build.js` and is what the browser actually fetches. Build scans `images/*/`, then prepends a synthetic gallery with `id: "favourites"` built from `favourites.json`.

Path conventions differ per field and are easy to get wrong:

- A normal gallery's `images[]` holds **bare filenames**, resolved at render time as `images/<gallery.id>/<file>`.
- The favourites gallery's `images[]` holds **gallery-relative paths** (`japan/japan-13.webp`), resolved as `images/<src>`.
- `coverImage` always holds a **full path already prefixed with `images/`**.

`build.js` is stateful and partly destructive.
It reads the existing `galleries.json` to preserve manual image ordering and a still-valid `coverImage`, converts JPEG/PNG to 1920px-wide WebP via `sharp`, and **moves the originals into the gitignored `originals/` directory**.
Everything else in a gallery object is derived, so hand edits are overwritten on the next build: `title` comes from `formatTitle(folderName)`, and `description`/`category` come from the hardcoded folder list in `getDescription`/`getCategory` in [scripts/build.js](scripts/build.js).
**Adding a new real-world photography gallery requires adding its folder name to those two lists**, otherwise it is categorised as `in-game`.

### CMS (`admin-server.js` + `tools/admin/`)

Express server on port 3030 that statically serves the repo root (so the CMS can preview real image files) and mounts the admin UI at `/admin`.
All JSON mutations go through a serialized `AsyncQueue` (`dbQueue.enqueue`) to avoid interleaved read-modify-write corruption of the data files; new mutating endpoints must use it too.
`/api/build` shells out to `npm run build`.
Uploads go straight to `images/<galleryId>/` under the original filename via multer; uploading directly to `favourites` is rejected by design because favourites are references, not files.
The admin frontend is plain globals + inline `onclick` handlers with SortableJS from a CDN, deliberately unmodularised.

## Things that break silently

- **Mosaic sizing is JS/CSS duplicated state.** `resizeAllGridItems` in [scripts/gallery.js](scripts/gallery.js) hardcodes the column count breakpoints (600 / 1024 / 1440) and the 10px row height that also appear in the `.mosaic-grid` rules in [styles/components.css](styles/components.css). Change one and you must change the other, or masonry spans will be computed against the wrong column width.
- **Deleting an image must clean up three places**: the file on disk, the owning gallery's `images[]`, and any `favourites.json` reference. `/api/photo/delete` does this; keep it that way.
- Scroll-driven reveal animations only run when `initScrollAnimations` adds `scroll-animations-enabled` to `<html>`, which it skips under `prefers-reduced-motion`. The favourites carousel and theme icon animation respect the same query.
- The header auto-hide uses a shared `isNavigating` flag in `ui.js`; programmatic smooth scrolling must set it, or the header hides mid-navigation.

## Conventions

- Public-site copy and code identifiers are in English; the CMS UI, project docs, and commit messages are in Spanish.
- Dynamic UI is built with template literals assigned via `innerHTML`; component classes follow simplified BEM (`gallery-card__title`).
- Third-party runtime dependencies are deliberately avoided on the public site. `sharp`, `express`, and `multer` are build/CMS-only.
