# Source Recovery Required

The repository's `SOURCE_MANIFEST.sha256` lists 120 production source files, but the current `main` branch contains only 27 changed/root files from the production conversion.

The following required source trees are absent from `main`:

- `app/`
- `components/`
- `lib/`
- `supabase/`
- `tests/`
- most of `scripts/`
- `types/`
- production documentation under `docs/`

This explains the Vercel build error reporting that no `app` or `pages` directory could be found.

The RC3 login repair files have been reconstructed on `fix/supabase-login-profile`, but a clean production build still requires the complete source from `church-visitor-attendance-production-rc3-login-fix.zip` or the equivalent local production project to be committed.

Do not replace the current branch with the retired SQLite/Python testing build. Restore the complete Next.js/Supabase source, preserve this branch's RC3 files, and then run:

```text
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

No environment files, service-role values, passwords, or other secrets should be committed during recovery.
