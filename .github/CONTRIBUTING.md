# Contributing to Bati

Welcome! This guide helps you contribute quality code to Bati.

---

## 🔄 Workflow

### Before You Code

1. **Check the roadmap** — See [ROADMAP.md](docs/ROADMAP.md) for current priorities
2. **Understand the style** — Read [UI_GUIDE.md](docs/UI_GUIDE.md) for design principles
3. **Plan your changes** — Break large features into small, reviewable pieces

### Development Cycle

```bash
# 1. Create a feature branch
git checkout -b feat/my-feature

# 2. Make your changes
# ... write code ...

# 3. Check quality
npm run check       # Biome lint + TypeScript
npm test            # Run all tests
npm run format      # Auto-format

# 4. Commit with convention
git commit -m "feat: add victory confetti animation"

# 5. Push and create PR
git push origin feat/my-feature
```

---

## ✅ Quality Checklist

Before every commit, verify:

### Code

- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] Biome lint passes: `npm run check`
- [ ] Code is formatted: `npm run format`
- [ ] No `any` types (use proper TypeScript)
- [ ] No hardcoded strings (use i18n keys)

### Tests

- [ ] Tests pass: `npm test`
- [ ] New DB functions have tests
- [ ] Critical UI has component tests

### Localization

- [ ] New strings added to `locales/en.json`
- [ ] New strings added to `locales/fr.json`

### UI

- [ ] Consistent with design tokens (colors, spacing)
- [ ] Safe areas respected
- [ ] Touch targets ≥44pt

---

## 📝 Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | When to Use |
| ------ | ----------- |
| `feat:` | New feature |
| `fix:` | Bug fix |
| `refactor:` | Code improvement (no behavior change) |
| `docs:` | Documentation only |
| `test:` | Adding or fixing tests |
| `chore:` | Build, config, dependencies |

### Examples

```bash
feat: add boss HP bar component
fix: timer continues in background
refactor: extract XP calculation to utility
docs: update REWARDS.md with building tiers
test: add db-completed integration tests
chore: upgrade expo to SDK 52
```

---

## 📁 Project Structure

```text
app/           # Screens (Expo Router)
components/    # Reusable UI components
db/            # Database (Drizzle ORM)
stores/        # State (Zustand)
constants/     # Static values
hooks/         # Custom React hooks
locales/       # Translations (EN/FR)
__tests__/     # Test files
docs/          # Documentation
```

### Naming Conventions

| Type | Convention | Example |
| ---- | ---------- | ------- |
| Components | PascalCase | `VictoryView.tsx` |
| Hooks | camelCase + use | `useSessionTimer.ts` |
| DB functions | camelCase + verb | `getQuestById`, `createSession` |
| Constants | SCREAMING_SNAKE | `MAX_ROUNDS` |

---

## 🧪 Testing

### Run Tests

```bash
npm test                    # All tests
npm test -- db-quests       # Specific file
npm test -- --coverage      # With coverage
```

### Test Patterns

```typescript
// DB tests use test helper
import { createTestDb, closeTestDb } from "./helpers/testDb"

beforeAll(async () => {
  await createTestDb()
})

afterAll(() => {
  closeTestDb()
})

test("should create exercise", async () => {
  const result = await createExercise({ ... })
  expect(result.id).toBeDefined()
})
```

---

## 🎨 Code Style

### Biome Configuration

- **Indent:** 2 spaces (tabs in config)
- **Quotes:** Double quotes
- **Line width:** 100 characters
- **No semicolons** (except where required)

### Imports Order

```typescript
// 1. External packages
import { useRouter } from "expo-router"
import { Button, YStack } from "tamagui"

// 2. Internal (@/ alias)
import { AppButton } from "@/components/common/AppButton"
import { useSessionStore } from "@/stores/session"
import type { Quest } from "@/db/quests"
```

---

## 🚫 Avoid

- ❌ Inline styles (use Tamagui tokens)
- ❌ Hardcoded strings (use i18n)
- ❌ `any` types
- ❌ Direct SQL (use Drizzle ORM)
- ❌ `console.log` in production (use `__DEV__`)
- ❌ Blocking main thread

---

## 💬 Questions?

Open an issue or check existing documentation:

- [VISION.md](docs/VISION.md) — Product overview
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — Technical stack
- [ROADMAP.md](docs/ROADMAP.md) — Current priorities
