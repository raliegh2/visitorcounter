# Security acceptance checklist

## Identity and access

- [ ] Public signup disabled
- [ ] Individual accounts only
- [ ] Administrator TOTP MFA tested
- [ ] Password reset and recovery tested
- [ ] Deactivated user blocked
- [ ] Session refresh and revocation tested
- [ ] Quarterly access review scheduled

## Authorization

- [ ] Anonymous access tests pass
- [ ] Usher admin-route tests pass
- [ ] Auditor write tests pass
- [ ] Direct API bypass tests pass
- [ ] Cross-organization tests pass
- [ ] RLS tests pass
- [ ] Service assignment restrictions pass
- [ ] Last-administrator protection passes

## Application security

- [ ] Input validation tests pass
- [ ] SQL injection tests pass
- [ ] stored/reflected XSS tests pass
- [ ] CSRF protections reviewed
- [ ] CSP is present without production `unsafe-eval`
- [ ] HSTS and security headers verified
- [ ] no secrets in client bundles or repository
- [ ] high/critical dependency findings resolved
- [ ] logs contain no prohibited data

## Data and recovery

- [ ] Duplicate attendance constraint tested concurrently
- [ ] Correction audit event tested
- [ ] Export audit event tested
- [ ] Retention preview and execution tested
- [ ] Encrypted backup configured
- [ ] Restoration test completed successfully
- [ ] RPO and RTO approved
