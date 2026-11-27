# Collections

A mobile app (Android and iOS) for keeping track of collections of anything. Each collection holds
items with a title, an optional photo, an optional description and free-form tags. Items can be
filtered by tag ("match any" or "match all") and searched by text.

Everything is stored on the device: item data in SQLite, photos in the app's private storage.

## Running it

```powershell
npm install
npx expo start
```

Scan the QR code with the **Expo Go** app on your phone (Android or iPhone) — no Android Studio,
Xcode or Mac needed.

## Checks

```powershell
npm run typecheck
npx expo-doctor
```

## Project layout

| Path | What it holds |
|---|---|
| `src/app/` | Screens (Expo Router — every file is a route) |
| `src/components/` | Shared UI pieces (tag chips, tag editor, thumbnails, add button) |
| `src/db/` | SQLite schema migrations and all database queries |
| `src/storage/images.ts` | Copying, resolving and deleting stored photos |
| `src/lib/` | Tag normalisation and filtering, error messages |
