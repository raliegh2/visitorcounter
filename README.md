# Church Visitor Attendance System — Login Fix Build

This build corrects the login-page failure shown in the screenshot.

## What was fixed

The previous page initialized application data before its JavaScript helper
functions existed. That stopped the script before the login submit handler was
registered. The browser then submitted the form as a normal GET request, which
left the user on the login page and placed credentials in the address bar.

This build:

- initializes the application in the correct order;
- immediately transitions to the dashboard after successful login;
- prevents credentials from being submitted in the URL;
- removes old query strings from the address bar;
- creates three real server-side testing accounts;
- enforces administrator, usher, and read-only permissions on the server;
- lets ushers register visitors and create check-ins;
- prevents ushers from changing services, users, settings, or existing records;
- prevents read-only users from saving changes;
- stores data in SQLite;
- uses PBKDF2 password hashes, HTTP-only cookies, CSRF protection, session
  expiration, and login throttling.

## Start with a clean copy

1. Close the command window running the older application.
2. Close the old browser tab that contains credentials in its URL.
3. Extract this ZIP into a new folder. Do not merge it into the older folder.
4. Start the application using the instructions below.
5. Use the new browser tab opened by the launcher.

## Windows

Double-click:

```text
start_app.bat
```

## macOS or Linux

Run:

```bash
sh start_app.sh
```

The launcher normally opens:

```text
http://127.0.0.1:8000
```

If port 8000 is already occupied, the server automatically tries the next
available port. Use the exact address printed in the command window.

## Testing accounts

### Administrator

- Username: `churchadmin`
- Password: `ChurchAdmin!2026`
- Access: dashboard, visitors, attendance, services, reports, users and roles,
  audit log, privacy and retention settings, corrections, and exports.

### Usher

- Username: `churchusher`
- Password: `ChurchUsher!2026`
- Access: dashboard, visitor registration and search, and attendance check-in.
- Restrictions: cannot manage services, users, reports, audit settings, or
  retention settings.

### Read-only leader

- Username: `churchviewer`
- Password: `ChurchViewer!2026`
- Access: dashboard and aggregate reports.
- Restrictions: cannot register visitors, check in visitors, edit records, or
  save administrative changes.

## Change a testing password

Stop the server and run:

```bash
python server.py --set-password churchadmin "YourNewStrongPassword!"
```

Replace `churchadmin` with `churchusher` or `churchviewer` to change another
account.

## Reset testing data

Stop the server and delete:

```text
church_attendance.db
```

The next start creates a fresh database and restores the testing accounts.

## Important deployment note

This is a localhost testing build. It is not configured with HTTPS, a production
database, email recovery, managed backups, or an internet-facing deployment
configuration. Do not expose it directly to the public internet.
