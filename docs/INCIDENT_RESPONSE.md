# Incident-response guide

## Severity examples

- **Critical:** confirmed visitor-data disclosure, service-role key exposure, database compromise.
- **High:** administrator account takeover, unauthorized export, RLS bypass.
- **Medium:** lost logged-in tablet, repeated authorization failures, malicious record alteration.
- **Low:** isolated usability defect without data exposure.

## Immediate actions

1. Preserve logs and record the incident start time.
2. Revoke affected Supabase sessions and disable involved profiles.
3. Rotate exposed server secrets and redeploy.
4. Restrict exports and administrative actions where relevant.
5. Preserve database and hosting evidence without putting personal data into tickets or chat.
6. Assess affected organizations, records, time range, and legal notification duties.
7. Communicate through the church’s approved incident channel.
8. Recover from a verified clean state and validate RLS before reopening access.

## Evidence sources

- Supabase Auth logs
- Next.js hosting request/error logs
- `audit_logs`
- provider database logs
- export events
- deployment and secret-change history

Do not include passwords, tokens, full visitor names, or contact information in
incident summaries unless an authorized investigator explicitly requires them.
