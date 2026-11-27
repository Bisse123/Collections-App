# Collections

A website for keeping track of collections of anything, built with Expo so it can become a phone app
later. Each collection has a name, an optional photo and items; each item has a title, an optional
photo, an optional description and free-form tags. Items can be searched by text and filtered by tag
("match any" or "match all"), with a searchable tag list.

Everything is stored in the visitor's own browser (IndexedDB), including photos, which are shrunk to
at most 1280 px on their longest side. Nothing is sent to a server. Collections can be exported to a
file and imported on another device or browser.

> Safari on iPhone deletes a site's stored data if it is not visited for 7 days, unless the site has
> been added to the home screen. Export collections regularly as a backup.

## Running it

```powershell
npm install
npx expo start --web
```

Open `http://localhost:8081/Collections-App/`. To try it on a phone, open
`http://<your computer's IP>:8081/Collections-App/` (e.g. `http://192.168.1.9:8081/Collections-App/`)
in the phone's browser while both are on the same Wi-Fi.

## Tests

```powershell
npx playwright install chromium webkit   # once
npm test                                 # unit tests + browser tests
npm run test:unit                        # only the unit tests (fast)
npm run typecheck
```

`npm test` builds the site, serves it at `http://localhost:4173/Collections-App/` the way GitHub
Pages does, and runs the browser tests in desktop Chrome, Android Chrome (Pixel 7) and iPhone Safari
(iPhone 15) emulation. Tests are in `tests/`: `unit/` for the file format and import comparison,
`e2e/` for creating, editing and deleting collections and items, filtering, and import/export.

## Publishing to GitHub Pages

The workflow in `.github/workflows/pages.yml` runs the tests on every push and pull request, and on
pushes to `master` publishes the site to `https://<user>.github.io/Collections-App/`. One-time
setup: in the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.

To build the site locally: `npm run build:web` (output in `dist/`).

## Export file format

An export is a ZIP file named `<collection name>.collection.zip` containing:

- `collection.json` — `format` (`collections-app/collection`), `version` (currently `1`),
  `exportedAt`, the `collection` (`id`, `name`, `image`, `createdAt`, `updatedAt`) and its `items`
  (`id`, `title`, `description`, `tags`, `image`, `createdAt`, `updatedAt`). Times are milliseconds
  since 1970; `image` is a path inside the ZIP or `null`.
- `images/<id>.jpg` — one file per photo.

Collections and items keep their ids across devices. Importing a file whose collection id already
exists shows what would change (new, changed and removed items, and name or photo changes). Changed
items take the file's version, except where this device has the newer edit; there the user picks.
Items only on this device can be kept or removed.

## Project layout

| Path | What it holds |
|---|---|
| `src/app/` | Screens (Expo Router — every file is a route) |
| `src/components/` | Shared UI pieces (tag chips, tag editor, tag filter sheet, thumbnails, photo field, add button) |
| `src/hooks/` | Photo picking for forms, loading stored photos |
| `src/styles/` | Style sheets for each screen (`screens/`) and shared component (`components/`) |
| `src/data/` | Data types, the storage interface (`types.ts`), its IndexedDB implementation, and the operations screens use (`collections.ts`, `importExport.ts`) |
| `src/platform/` | Things that differ per platform: dialogs, saving and picking files, shrinking photos (`*.web.ts` is the website version) |
| `src/lib/` | Export file format, import comparison, tags, ids, error messages |
| `scripts/build-web.mjs` | Builds the site for GitHub Pages |
| `tests/` | Playwright unit and browser tests |

### Adding the phone apps later

The screens only talk to `src/data/store.ts` and `src/platform/*`. To support Android and iOS, add
`src/data/store.native.ts` (a `CollectionStore`, for example on `expo-sqlite`, with
`storeSupported = true`) and native versions of `src/platform/files.ts` and `photos.ts` (for example
with `expo-sharing`, `expo-document-picker` and `expo-image-manipulator`). Until then the phone apps
show a notice pointing to the website.
