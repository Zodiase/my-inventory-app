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
