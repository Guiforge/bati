# Security & Best Practices for Bati

## Pre-commit Hooks

This project uses **Husky** and **lint-staged** to automatically format and lint code before commits.

### What Runs Before Commit

```bash
npm run format  # Biome format
npm run check   # Biome lint
```

### Environment Variables & Secrets

**CRITICAL: Never commit secrets!**

1. **Create a `.env.local` file** (already in `.gitignore`)
   ```bash
   cp .env.example .env.local
   ```

2. **Add your sensitive data only to `.env.local`**
   - API keys
   - Database URLs
   - Auth tokens
   - Private credentials

3. **Use `EXPO_PUBLIC_` prefix for public variables**
   ```
   EXPO_PUBLIC_API_URL=http://localhost:3000
   ```
   Private variables (without prefix) won't be exposed:
   ```
   PRIVATE_API_SECRET=secret_value
   ```

4. **Files automatically ignored by Git:**
   - `.env`
   - `.env.local`
   - `.env.*.local`
   - `credentials.json`
   - `*.pem`, `*.key`
   - `secrets/`, `.secrets/`, `private/`

## Code Quality

- **Formatter**: Biome (automatic)
- **Linter**: Biome (automatic)
- **Type Check**: TypeScript (built-in)

## Git Workflow

```bash
# 1. Make changes
# 2. Stage files
git add .

# 3. Pre-commit hooks run automatically:
#    - Biome format
#    - Biome check (lint)

# 4. If there are issues:
#    - Fix the errors shown
#    - Stage again: git add .
#    - Try commit again

# 5. Commit if all checks pass
git commit -m "Your message"
```

## Best Practices

### 1. Environment Setup
```bash
# After cloning
cp .env.example .env.local
# Edit .env.local with your values
npm install
```

### 2. Before Pushing
```bash
npm run format   # Auto-fix formatting
npm run check    # Verify all checks pass
```

### 3. Secrets Checklist
- [ ] No hardcoded passwords
- [ ] No API keys in code
- [ ] No database URLs
- [ ] No tokens in files
- [ ] All secrets in `.env.local`
- [ ] `.env.local` in `.gitignore`

### 4. Commits
- One logical change per commit
- Clear, descriptive messages
- Reference issue numbers if applicable

## Troubleshooting

### Pre-commit hook failed
```bash
# See what failed:
npm run check

# Fix issues and try again:
git add .
git commit -m "..."
```

### Husky not working
```bash
# Reinstall hooks:
npm install
npx husky install
```

### Force commit (NOT RECOMMENDED)
```bash
# Only use if absolutely necessary:
git commit --no-verify
```

## References

- [Husky Docs](https://typicode.github.io/husky/)
- [lint-staged](https://github.com/okonet/lint-staged)
- [Biome](https://biomejs.dev/)
- [Environment Variables in Expo](https://docs.expo.dev/guides/environment-variables/)
