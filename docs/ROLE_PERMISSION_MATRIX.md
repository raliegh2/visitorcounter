# Role and permission matrix

| Capability | Administrator | Usher | Read-only leader |
|---|---:|---:|---:|
| Sign in with individual account | Yes | Yes | Yes |
| View aggregate dashboard | Yes | Yes | Yes |
| Search visitor directory | Yes | Yes | No |
| Register visitor | Yes | Yes | No |
| Check in visitor | Yes | Assigned services only | No |
| View named attendance | Yes | Authorized services only | No |
| Create/manage services | Yes | No | No |
| Assign ushers | Yes | No | No |
| Correct attendance | Yes, MFA | No | No |
| View aggregate reports | Yes | No | Yes |
| Export personal data | Yes, MFA and audit | No | No |
| Manage accounts and roles | Yes, MFA | No | No |
| Review audit logs | Yes, MFA | No | No |
| Configure/apply retention | Yes, MFA | No | No |

Client-side navigation filtering is not an authorization boundary. The same
rules are enforced in server code and PostgreSQL.
