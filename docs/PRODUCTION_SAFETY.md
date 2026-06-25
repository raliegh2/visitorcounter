# Production Safety Rules

1. `main` represents the live production application.
2. No feature development is performed directly on `main`.
3. Feature and fix branches are created from `dev`.
4. Integrated work is promoted from `dev` to `staging` by pull request.
5. Only a tested staging release is promoted from `staging` to `main`.
6. Production database migrations require a tested rollback plan.
7. Vercel production environment variables and the production Supabase project are used only by `main`.
8. Preview and staging deployments must use non-production credentials and non-production data.
