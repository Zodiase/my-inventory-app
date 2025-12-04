# My Inventory App

A Meteor 3 application for managing inventory items and tags.

## Development

Install dependencies (Meteor manages most server/client deps):

```bash
meteor npm install
```

Start the app:

```bash
meteor run
```

The app will be available at http://localhost:3000/.

## Features

### URL Routing

The app uses client-side URL routing (via [Wouter](https://github.com/molefrog/wouter)) for navigation:

- **`/` or `/items`** - Items list view (root level)
- **`/items/:itemId`** - Individual item detail view
- **`/tags`** - Tag management view
- **`/tags/:tagId`** - Items filtered by specific tag
- **`/search`** - Search results view

Features:

- ✅ Browser back/forward buttons work
- ✅ Bookmarkable and shareable URLs
- ✅ Direct URL navigation
- ✅ Page refresh maintains view state

## Testing

Run unit and full-app tests:

```bash
npm test
npm run test-app
```

## Code Quality

Check code formatting, linting, and types:

```bash
npm run check:code-style    # Prettier + ESLint
npm run check:type          # TypeScript compilation
```

### Current Status

- ✅ **TypeScript**: Clean compilation (0 errors)
- ✅ **Prettier**: All files formatted correctly
- ✅ **Tests**: 18 passing unit tests
- ⚠️ **ESLint**: 46 issues from strict `eslint-config-love` rules (see docs/DEVELOPMENT_NOTES.md)

The ESLint issues are mostly stylistic (magic numbers, strict typing) and don't affect functionality.

## Known Issues

See `docs/KNOWN_ISSUES.md` for a list of currently known non-blocking issues (e.g. expected deprecation warnings from upstream dependencies).

## Development Notes

See `docs/DEVELOPMENT_NOTES.md` for technical context on the Meteor 3 upgrade, CI/runtime environment choices, lint fixes, and Docker image adjustments.

## License

Private project.
