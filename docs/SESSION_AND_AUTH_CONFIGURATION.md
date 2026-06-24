# Session and authentication configuration

## Required production settings

Configure these in the Supabase production project and verify them in staging:

- public signup: disabled;
- anonymous sign-in: disabled;
- minimum password length: 14;
- leaked-password protection: enabled where supported;
- email confirmation and secure password change: enabled;
- administrator TOTP MFA: mandatory;
- JWT lifetime: 15 minutes;
- inactivity timeout: 15 minutes, or the church-approved value;
- absolute session time-box: 8 hours, or the church-approved shift duration;
- single-session-per-user: enable unless concurrent staff devices are approved;
- sign-in/signup rate limit: no more than 10 attempts per five-minute provider window;
- password-reset email frequency limit: enabled;
- allowed redirect URLs: exact production and staging Auth callback URLs only.

Role or active-state changes advance `auth_not_before`; database access from
older JWTs is denied even before their normal expiry.
