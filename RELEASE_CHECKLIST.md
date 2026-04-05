# Release Checklist

## Pre-Release

- [ ] `npm run lint` passes with no errors
- [ ] `npm run build` completes with no errors
- [ ] `dist/` contains all expected assets
- [ ] No `console.log` or debug artifacts left in source

## Version Bump

- [ ] `package.json` version updated (e.g. `0.3.1` → `0.4.0`)
- [ ] `src/components/SettingsModal.tsx` — `settings.version` label matches `package.json`
- [ ] `CHANGELOG.md` entries added for this release
- [ ] `metadata.json` version updated (if present)

## Git

- [ ] All changes committed on a release branch
- [ ] Tag created: `git tag v<version>` (e.g. `git tag v0.4.0`)
- [ ] Tag pushed: `git push origin v<version>`

## CI / Deployment

- [ ] `master` branch CI passes (`npm run release:check`)
- [ ] GitHub Pages deployment succeeds (workflow `build-and-deploy` job completes)
- [ ] Deployed URL loads correctly: `https://heeq.github.io/YesFlow/` (or custom domain)

## Post-Release

- [ ] GitHub Release created with matching tag and changelog summary
- [ ] `npm run build` output gzip sizes verified against bundle budget:
  - Landing page JS: < 150 kB gzip
  - CSS: < 30 kB gzip
  - No unexpected large chunks added
- [ ] `README.md` / `README_ZH.md` are consistent with new version

## Quick Commands

```bash
# 1. Lint check
npm run lint

# 2. Full build check
npm run release:check

# 3. Create & push tag
git tag v$(node -p "require('./package.json').version")
git push origin --tags

# 4. Verify Pages deployment
gh run list --workflow=deploy.yml --status=completed
```
