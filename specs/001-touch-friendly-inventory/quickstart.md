# Quickstart Guide - Touch-Friendly Inventory App

**Feature**: 001-touch-friendly-inventory
**Updated**: 2025-10-20

This guide helps developers onboard to the project and start contributing quickly.

---

## Prerequisites

### Required Software

1. **Node.js 18+** (LTS recommended)
   ```bash
   node --version  # Should be 18.x or higher
   ```

2. **Meteor 3.0+**
   ```bash
   curl https://install.meteor.com/ | sh
   meteor --version  # Should be 3.x
   ```

3. **MongoDB 6.0+** (included with Meteor, or use Docker)
   ```bash
   # Optional: Run MongoDB in Docker
   docker-compose up -d
   ```

4. **Git**
   ```bash
   git --version
   ```

### Recommended Tools

- **VS Code** with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - MongoDB for VS Code
- **iOS device or simulator** (for touch testing)
- **Network access** from iOS device to development machine

---

## Project Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <repo-url>
cd my-inventory-app

# Install dependencies (from meteor-app directory)
cd meteor-app
meteor npm install
```

### 2. Environment Configuration

Create `.env` file in `meteor-app/` (optional, for custom settings):
```bash
# Example .env
MONGO_URL=mongodb://localhost:27017/inventory
ROOT_URL=http://localhost:3000
PORT=3000
```

### 3. Run Development Server

```bash
# From meteor-app/ directory
meteor run

# App will be available at:
# http://localhost:3000 (desktop)
# http://<your-ip>:3000 (iOS device on same network)
```

**First run**: Meteor will download platform-specific tools and build the app. This takes 2-5 minutes.

### 4. Access from iOS Device

1. Find your development machine's local IP:
   ```bash
   # Linux/Mac
   ip addr show  # Look for 192.168.x.x or 10.x.x.x

   # Or check Meteor console output:
   # "App running at: http://192.168.1.100:3000"
   ```

2. On iOS device (same WiFi network):
   - Open Safari or Chrome
   - Navigate to `http://<dev-machine-ip>:3000`
   - Add to Home Screen for app-like experience

---

## Project Structure

```
meteor-app/
├── client/                 # Client-side entry point
│   ├── main.html          # HTML shell
│   ├── main.css           # Global styles
│   └── main.tsx           # React root
├── imports/
│   ├── api/               # Meteor Methods & Publications
│   │   ├── items.ts       # Items CRUD, properties, location ops
│   │   ├── tags.ts        # Tags CRUD, hierarchy ops
│   │   ├── attachments.ts # File upload/delete/reorder (NEW)
│   │   └── backup.ts      # Export/import operations (NEW)
│   ├── model/             # Data models & utilities
│   │   ├── CollectionItem.ts        # Base interface (createdAt, modifiedAt)
│   │   ├── InventoryItem.ts         # Item model with properties
│   │   ├── TagRecord.ts             # Tag model with hierarchy
│   │   ├── Attachment.ts            # Attachment model (NEW)
│   │   ├── PropertyValues.ts        # Property field types (NEW)
│   │   └── RecordNotFoundException.ts
│   ├── ui/                # React components
│   │   ├── App.tsx                  # Root component
│   │   ├── AllItemsView.tsx         # Main inventory view
│   │   ├── AllTagsView.tsx          # Tag management view
│   │   ├── ItemDetailView.tsx       # Item detail with properties/attachments (NEW)
│   │   ├── SearchBar.tsx            # Search with fragments (NEW)
│   │   ├── PropertyForm.tsx         # Property editing (NEW)
│   │   ├── AttachmentGallery.tsx    # Photo/PDF viewer (NEW)
│   │   └── StyledButton.tsx         # Reusable button component
│   └── utility/           # Helper functions
│       ├── reactMeteorData.ts       # useTracker hook
│       ├── NamedCollection.ts       # Collection wrapper
│       ├── strictSelector.ts        # Optimistic locking
│       ├── Logger.ts                # Logging utility
│       └── constants.ts             # App constants
├── server/                # Server-side entry point
│   ├── main.ts            # Server initialization
│   └── imageProcessing.ts # Image resize/EXIF handling (NEW)
├── tests/                 # Test files
│   └── main.ts            # Test runner
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
└── eslint.config.mjs      # ESLint config (flat format)
```

---

## Development Workflow

### Running the App

```bash
# Development mode (auto-reload on file changes)
cd meteor-app
meteor run

# Production mode (optimized bundle)
meteor run --production

# Specify custom port
meteor run --port 3001

# Reset database (clear all data)
meteor reset
```

### Running Tests

```bash
# Run all tests
meteor test --driver-package meteortesting:mocha

# Run tests in watch mode
meteor test --driver-package meteortesting:mocha --watch

# Run specific test file
TEST_BROWSER_DRIVER=nightmare meteor test --driver-package meteortesting:mocha --full-app
```

**Test organization**:
- Unit tests: `*.test.ts` files next to source files
- Integration tests: `tests/integration/`
- E2E tests: `tests/e2e/` (planned)

### Code Quality Checks

```bash
# Lint TypeScript files
meteor npm run lint

# Auto-fix lint issues
meteor npm run lint:fix

# Type checking
meteor npm run type-check

# Format code with Prettier
meteor npm run format
```

---

## Key Concepts

### 1. Meteor Methods Pattern

Server-side RPC functions for data mutations:

```typescript
// Server: Define method
export const createItem = async (data: NoId<InventoryItem>): Promise<string> => {
  // Validation
  // Business logic
  return itemId;
};

// Export as Meteor Method
asMeteorMethods('items', { createItem });

// Client: Call method
const itemId = await Meteor.callAsync('items.createItem', { name: 'Tool' });
```

### 2. Reactive Data with useTracker

Subscribe to database changes:

```typescript
const items = useTracker(() => {
  const handle = Meteor.subscribe('items.all');
  if (!handle.ready()) return null;

  return Items.find({}, { sort: { name: 1 } }).fetch();
}, []);
```

**Performance tip**: Use field projections to minimize re-renders:
```typescript
Items.find({}, { fields: { name: 1, _id: 1 } })
```

### 3. Optimistic Locking with strictSelector

Prevent race conditions on updates:

```typescript
const result = await Items.updateAsync(
  strictSelector({
    _id: itemId,
    name: currentName,          // Verify current state
    modifiedAt: currentModifiedAt
  }),
  { $set: { name: newName, modifiedAt: new Date() } }
);

if (result === 0) {
  throw new Meteor.Error('conflict', 'Item was modified by another user');
}
```

### 4. Absolute Imports

**Always use absolute imports** starting with `/`:

```typescript
// ✅ Correct
import { Items } from '/imports/api/items';
import type { InventoryItem } from '/imports/model/InventoryItem';

// ❌ Wrong
import { Items } from '../api/items';
import type { InventoryItem } from '../../model/InventoryItem';
```

### 5. Type Safety (NON-NEGOTIABLE)

- **No `any` types** without documented justification
- Use `type` imports for type-only dependencies
- Define interfaces for all data structures
- Use `NoId<T>` for create operations (excludes `_id`)

```typescript
// Creating items without _id
const itemData: NoId<InventoryItem> = {
  name: 'Tool',
  createdAt: new Date(),
  modifiedAt: new Date(),
  // No _id - MongoDB will generate it
};
```

---

## Common Tasks

### Adding a New Collection

1. **Define model** in `imports/model/`:
   ```typescript
   // MyRecord.ts
   export interface MyRecord extends CollectionItem {
     name: string;
     // ... other fields
   }
   ```

2. **Create collection** in `imports/api/`:
   ```typescript
   // myCollection.ts
   export const MyCollection = NamedCollection<MyRecord>('my_collection');
   ```

3. **Add indexes** in server startup:
   ```typescript
   // server/main.ts
   MyCollection._ensureIndex({ name: 1 });
   ```

4. **Export methods**:
   ```typescript
   // api/myCollection.ts
   export const createRecord = async (data: NoId<MyRecord>) => {
     // Implementation
   };

   asMeteorMethods('myCollection', { createRecord });
   ```

### Adding a New React Component

1. Create component in `imports/ui/`:
   ```typescript
   // MyComponent.tsx
   import React from 'react';
   import type { ComponentProps } from 'react';
   import styled from 'styled-components';

   const Container = styled.div`
     // Styles
   `;

   type Props = ComponentProps<'div'> & {
     title: string;
   };

   export const MyComponent: React.FC<Props> = ({ title, ...props }) => {
     return <Container {...props}>{title}</Container>;
   };
   ```

2. Use absolute imports:
   ```typescript
   import { MyComponent } from '/imports/ui/MyComponent';
   ```

### Adding a New Meteor Method

1. **Define function** in appropriate API file:
   ```typescript
   // imports/api/items.ts
   export const myNewOperation = async (itemId: string): Promise<void> => {
     // Validation
     if (!itemId) {
       throw new Meteor.Error('validation-error', 'itemId required');
     }

     // Business logic
     const item = await Items.findOneAsync({ _id: itemId });
     if (!item) {
       throw new RecordNotFoundException('Item', itemId);
     }

     // Mutation
     await Items.updateAsync(
       strictSelector({ _id: itemId, name: item.name }),
       { $set: { modifiedAt: new Date() } }
     );
   };
   ```

2. **Export method**:
   ```typescript
   asMeteorMethods('items', { myNewOperation });
   ```

3. **Call from client**:
   ```typescript
   await Meteor.callAsync('items.myNewOperation', itemId);
   ```

### Adding a New Test

1. Create test file next to source:
   ```typescript
   // myFunction.test.ts
   import { expect } from 'chai';
   import { describe, it } from 'mocha';
   import { myFunction } from './myFunction';

   describe('myFunction', () => {
     it('should do something', () => {
       const result = myFunction('input');
       expect(result).to.equal('expected');
     });
   });
   ```

2. Run tests:
   ```bash
   meteor test --driver-package meteortesting:mocha
   ```

---

## Constitution Principles

Follow these **5 core principles** (enforced by code review):

### 1. Type Safety (NON-NEGOTIABLE)
- **No `any` types** without justification
- Use `type` imports for type-only dependencies
- Define interfaces for all data structures
- Enable strict TypeScript checks

### 2. Test-Driven Development (TDD)
- Write tests **before** implementation
- Minimum 80% code coverage
- Unit tests for utilities, integration tests for Methods
- Use Chai + Sinon + Mocha

### 3. UX Consistency
- Follow iOS Human Interface Guidelines
- 44x44px minimum touch targets
- Consistent spacing, animations, feedback
- Touch-optimized gestures (swipe, long-press, drag-drop)

### 4. Performance
- Pagination for large lists (100 items per page)
- Field projections in subscriptions
- Memoize expensive computations (`useMemo`)
- Lazy-load images and attachments
- Index all queried fields

### 5. Documentation
- JSDoc comments for all public functions
- Explain **why**, not **what**
- Document edge cases and race conditions
- Keep README and guides up-to-date

---

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
meteor run --port 3001
```

### MongoDB Connection Failed

```bash
# Check if MongoDB is running
ps aux | grep mongod

# If using Docker:
docker-compose up -d

# Reset Meteor database
meteor reset
```

### TypeScript Errors After npm install

```bash
# Rebuild TypeScript cache
rm -rf .meteor/local/build
meteor run
```

### iOS Device Can't Connect

1. Verify same WiFi network
2. Check firewall rules (allow port 3000)
3. Use IP address, not `localhost`
4. Try `http://`, not `https://`

### Hot Module Reload Not Working

```bash
# Clear Meteor cache
meteor reset
rm -rf node_modules
meteor npm install
```

---

## Next Steps

1. **Read the spec**: `specs/001-touch-friendly-inventory/spec.md`
2. **Review data model**: `specs/001-touch-friendly-inventory/data-model.md`
3. **Check API contracts**: `specs/001-touch-friendly-inventory/contracts/`
4. **Browse existing code**: Start with `imports/api/items.ts` and `imports/ui/AllItemsView.tsx`
5. **Run tests**: Get familiar with test patterns
6. **Try the app**: Run on iOS device and test touch interactions

---

## Resources

- **Meteor Guide**: https://guide.meteor.com/
- **Meteor API Docs**: https://docs.meteor.com/
- **React Docs**: https://react.dev/
- **Grommet Components**: https://v2.grommet.io/
- **iOS HIG**: https://developer.apple.com/design/human-interface-guidelines/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/

---

## Getting Help

- **Code questions**: Check existing patterns in codebase first
- **Meteor issues**: Consult Meteor forums or GitHub issues
- **Project-specific**: Review spec and design docs in `specs/` directory
- **Constitution violations**: Refer to constitution.md for principles

---

**Happy coding! 🚀**
