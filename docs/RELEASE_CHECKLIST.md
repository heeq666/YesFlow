# YesFlow Release Checklist

Use this checklist whenever preparing a new YesFlow release.

## 1. Decide the version

- Confirm the target version number and release date.
- Decide whether the release is a patch (`0.3.x`) or a feature release (`0.x.0`).

## 2. Update versioned files

Update the version number and release notes in these files when needed:

- `package.json`
- `package-lock.json`
- `metadata.json`
- `CHANGELOG.md`
- `README.md`
- `README_ZH.md`
- `src/hooks/useAppSettings.ts`
- `src/components/SettingsModal.tsx`
- `src/components/ChangelogModal.tsx`

## 3. Check local workspace state

- Run `git status --short` and make sure only intended files are changing.
- Confirm local-only files are ignored, including caches, preview logs, and assistant settings.
- Verify build output directories such as `dist/` and `output/` are not accidentally staged.

## 4. Run release validation

Use the one-shot local validation script:

```bash
npm run release:check
```

This currently runs:

- `npm run lint`
- `npm run build`

## 5. Manually sanity-check key flows

Before pushing, verify these areas in the app:

- Start dialog can generate a project normally
- Project records can save, switch, and reopen without overwriting the wrong record
- Import/export JSON works correctly
- Node tools still open correctly, especially image, link, schedule, and document tools
- Top toolbar remains interactive during selection mode
- GitHub Pages build still produces a valid `dist/`

## 6. Prepare commit and push

- Stage only the intended release changes
- Use a clear release commit message such as `release: prepare 0.3.2`
- Push to `master`

## 7. Verify GitHub Actions and Pages

After pushing:

- Open the GitHub Actions run for `deploy.yml`
- Confirm the build succeeds
- Confirm the Pages deployment completes successfully
- Open the deployed site and verify the latest release is live

## 8. Create the GitHub release

- Create a tag for the release if needed
- Publish a GitHub Release with Chinese and English notes
- Keep the release notes aligned with `CHANGELOG.md`

## 9. Post-release cleanup

- Check `git status --short` again and confirm the worktree is clean
- Record any follow-up fixes for the next version
- If the release surfaced a deployment or workflow issue, add it to the next patch list immediately
