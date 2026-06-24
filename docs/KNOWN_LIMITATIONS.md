# Known limitations

1. No live Supabase production project or hosting environment is included in the source package.
2. Email delivery, CAPTCHA, provider rate limits, monitoring, and backup settings must be configured in the selected managed services.
3. The repository cannot prove cross-organization RLS, concurrency, restoration, or browser behavior until dependencies and local/hosted services are running.
4. The applicable privacy jurisdiction and final retention periods remain administrator/legal decisions.
5. Offline check-in is intentionally not implemented because local caching of visitor data on shared tablets would increase privacy risk.
6. The application does not store notes, prayer requests, counseling information, children’s data, or donations.
7. Account invitation uses a server-only service-role key and therefore requires careful hosting-secret configuration.
8. Audit immutability is logical at the application role level; database owners and provider administrators retain privileged access and require governance controls.
