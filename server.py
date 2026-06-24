#!/usr/bin/env python3
"""
Church Visitor Attendance System
Standard-library server with SQLite-backed authentication, sessions, and app state.
"""

from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import threading
import time
import webbrowser
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "church_attendance.db"
INDEX_PATH = ROOT / "index.html"

TEST_USERS = (
    {
        "id": "00000000-0000-4000-8000-000000000001",
        "username": os.getenv("CHURCH_ADMIN_USERNAME", "churchadmin"),
        "password": os.getenv("CHURCH_ADMIN_PASSWORD", "ChurchAdmin!2026"),
        "display_name": "Church Administrator",
        "role": "admin",
    },
    {
        "id": "00000000-0000-4000-8000-000000000002",
        "username": os.getenv("CHURCH_USHER_USERNAME", "churchusher"),
        "password": os.getenv("CHURCH_USHER_PASSWORD", "ChurchUsher!2026"),
        "display_name": "Church Usher",
        "role": "usher",
    },
    {
        "id": "00000000-0000-4000-8000-000000000003",
        "username": os.getenv("CHURCH_VIEWER_USERNAME", "churchviewer"),
        "password": os.getenv("CHURCH_VIEWER_PASSWORD", "ChurchViewer!2026"),
        "display_name": "Church Viewer",
        "role": "auditor",
    },
)
COOKIE_NAME = "cvas_session"
SESSION_IDLE_SECONDS = 15 * 60
SESSION_ABSOLUTE_SECONDS = 4 * 60 * 60
MAX_JSON_BYTES = 2 * 1024 * 1024
PBKDF2_ITERATIONS = 310_000
COOKIE_SECURE = os.getenv("CHURCH_COOKIE_SECURE", "0") == "1"

login_attempts: dict[str, list[float]] = {}
login_locks: dict[str, float] = {}
attempt_lock = threading.Lock()


def db_connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def hash_password(password: str, salt: bytes | None = None) -> tuple[bytes, bytes]:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return salt, digest


def verify_password(password: str, salt: bytes, expected: bytes) -> bool:
    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return hmac.compare_digest(actual, expected)


def init_db() -> bool:
    created = not DB_PATH.exists()
    with db_connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS auth_users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE COLLATE NOCASE,
                display_name TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('admin','usher','auditor')),
                password_salt BLOB NOT NULL,
                password_hash BLOB NOT NULL,
                active INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
                csrf_token TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                last_seen INTEGER NOT NULL,
                expires_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS app_state (
                id INTEGER PRIMARY KEY CHECK(id = 1),
                state_json TEXT NOT NULL,
                updated_at INTEGER NOT NULL,
                updated_by TEXT NOT NULL REFERENCES auth_users(id)
            );
            """
        )
        for account in TEST_USERS:
            existing = conn.execute(
                "SELECT id FROM auth_users WHERE username = ? COLLATE NOCASE",
                (account["username"],),
            ).fetchone()
            if existing:
                continue
            salt, digest = hash_password(account["password"])
            conn.execute(
                """
                INSERT INTO auth_users
                    (id, username, display_name, role, password_salt, password_hash, active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 1, ?)
                """,
                (
                    account["id"],
                    account["username"],
                    account["display_name"],
                    account["role"],
                    salt,
                    digest,
                    int(time.time()),
                ),
            )
        conn.execute("DELETE FROM sessions WHERE expires_at < ?", (int(time.time()),))
    return created

def set_password(username: str, password: str) -> None:
    if len(password) < 12:
        raise ValueError("Password must contain at least 12 characters.")
    salt, digest = hash_password(password)
    with db_connect() as conn:
        row = conn.execute(
            "UPDATE auth_users SET password_salt = ?, password_hash = ? WHERE username = ?",
            (salt, digest, username),
        )
        if row.rowcount != 1:
            raise ValueError(f"Unknown username: {username}")
        user = conn.execute("SELECT id FROM auth_users WHERE username = ?", (username,)).fetchone()
        conn.execute("DELETE FROM sessions WHERE user_id = ?", (user["id"],))


def parse_json(handler: BaseHTTPRequestHandler, max_bytes: int = MAX_JSON_BYTES) -> Any:
    length_text = handler.headers.get("Content-Length", "")
    try:
        length = int(length_text)
    except ValueError:
        raise ValueError("Invalid Content-Length")
    if length <= 0 or length > max_bytes:
        raise ValueError("Request body size is invalid")
    raw = handler.rfile.read(length)
    try:
        return json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError("Invalid JSON") from exc


def validate_state(state: Any) -> None:
    required = {
        "organization": dict,
        "users": list,
        "visitors": list,
        "services": list,
        "attendance": list,
        "audit": list,
        "retention_actions": list,
        "settings": dict,
        "selected_service_id": str,
    }
    if not isinstance(state, dict):
        raise ValueError("State must be a JSON object")
    for key, expected_type in required.items():
        if key not in state or not isinstance(state[key], expected_type):
            raise ValueError(f"State field '{key}' is missing or invalid")
    if len(state["visitors"]) > 10_000 or len(state["attendance"]) > 100_000:
        raise ValueError("State exceeds testing limits")


def _index_by_id(items: list[dict[str, Any]], label: str) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for item in items:
        if not isinstance(item, dict):
            raise ValueError(f"{label} entries must be objects")
        item_id = str(item.get("id", ""))
        if not item_id or item_id in result:
            raise ValueError(f"{label} contains a missing or duplicate id")
        result[item_id] = item
    return result


def validate_usher_update(old_state: dict[str, Any], new_state: dict[str, Any], user_id: str) -> None:
    """Allow ushers to register visitors and add attendance, but not administer the system."""
    for key in ("organization", "users", "services", "settings", "retention_actions"):
        if new_state[key] != old_state[key]:
            raise PermissionError(f"Ushers cannot modify {key.replace('_', ' ')}")

    old_visitors = _index_by_id(old_state["visitors"], "visitors")
    new_visitors = _index_by_id(new_state["visitors"], "visitors")
    for item_id, old_item in old_visitors.items():
        if new_visitors.get(item_id) != old_item:
            raise PermissionError("Ushers cannot edit or delete existing visitor records")
    added_visitors = [v for item_id, v in new_visitors.items() if item_id not in old_visitors]
    if len(added_visitors) > 20:
        raise PermissionError("Too many visitor records in one request")
    allowed_visitor_fields = {
        "id", "full_name", "preferred_name", "first_visit_date", "optional_contact",
        "contact_consent", "active", "created_at", "created_by"
    }
    for visitor in added_visitors:
        if set(visitor) - allowed_visitor_fields:
            raise PermissionError("Visitor record contains fields ushers cannot create")
        if visitor.get("created_by") != user_id or visitor.get("active") is not True:
            raise PermissionError("Invalid visitor creator or status")

    old_attendance = _index_by_id(old_state["attendance"], "attendance")
    new_attendance = _index_by_id(new_state["attendance"], "attendance")
    for item_id, old_item in old_attendance.items():
        if new_attendance.get(item_id) != old_item:
            raise PermissionError("Ushers cannot alter or delete existing attendance records")
    added_attendance = [a for item_id, a in new_attendance.items() if item_id not in old_attendance]
    if len(added_attendance) > 50:
        raise PermissionError("Too many attendance records in one request")
    visitor_ids = set(new_visitors)
    service_ids = {str(s.get("id")) for s in new_state["services"]}
    seen_pairs: set[tuple[str, str]] = set()
    for record in new_state["attendance"]:
        pair = (str(record.get("visitor_id", "")), str(record.get("service_id", "")))
        if pair in seen_pairs:
            raise ValueError("A visitor cannot be checked into the same service twice")
        seen_pairs.add(pair)
    for record in added_attendance:
        if record.get("checked_in_by") != user_id:
            raise PermissionError("Invalid attendance creator")
        if str(record.get("visitor_id")) not in visitor_ids or str(record.get("service_id")) not in service_ids:
            raise ValueError("Attendance references an unknown visitor or service")

    old_audit = _index_by_id(old_state["audit"], "audit")
    new_audit = _index_by_id(new_state["audit"], "audit")
    for item_id, old_item in old_audit.items():
        if new_audit.get(item_id) != old_item:
            raise PermissionError("Audit history cannot be changed")
    added_audit = [a for item_id, a in new_audit.items() if item_id not in old_audit]
    if len(added_audit) > 100:
        raise PermissionError("Too many audit records in one request")
    for event in added_audit:
        if event.get("actor_user_id") != user_id:
            raise PermissionError("Invalid audit actor")

    if new_state["selected_service_id"] not in service_ids:
        raise ValueError("Selected service is invalid")


def sync_auth_profiles(conn: sqlite3.Connection, state: dict[str, Any]) -> None:
    """Apply administrator role/status changes to real login accounts."""
    profiles = _index_by_id(state["users"], "users")
    for row in conn.execute("SELECT id FROM auth_users").fetchall():
        profile = profiles.get(row["id"])
        if not profile:
            continue
        role = str(profile.get("role", ""))
        if role not in {"admin", "usher", "auditor"}:
            raise ValueError("Invalid user role")
        active = 1 if bool(profile.get("active", True)) else 0
        display_name = str(profile.get("display_name", "")).strip()
        if not display_name:
            raise ValueError("Display name is required")
        conn.execute(
            "UPDATE auth_users SET display_name = ?, role = ?, active = ? WHERE id = ?",
            (display_name, role, active, row["id"]),
        )


def client_key(handler: BaseHTTPRequestHandler, username: str) -> str:
    forwarded = handler.headers.get("X-Forwarded-For", "")
    ip = forwarded.split(",")[0].strip() if forwarded else handler.client_address[0]
    return f"{ip}:{username.lower()}"


def check_login_limit(key: str) -> int:
    now = time.time()
    with attempt_lock:
        locked_until = login_locks.get(key, 0)
        if locked_until > now:
            return max(1, int(locked_until - now))
        attempts = [t for t in login_attempts.get(key, []) if now - t < 60]
        login_attempts[key] = attempts
        return 0


def record_login_failure(key: str) -> None:
    now = time.time()
    with attempt_lock:
        attempts = [t for t in login_attempts.get(key, []) if now - t < 60]
        attempts.append(now)
        login_attempts[key] = attempts
        if len(attempts) >= 5:
            login_locks[key] = now + 30
            login_attempts[key] = []


def clear_login_failures(key: str) -> None:
    with attempt_lock:
        login_attempts.pop(key, None)
        login_locks.pop(key, None)


class AppHandler(BaseHTTPRequestHandler):
    server_version = "ChurchAttendance/1.0"

    def log_message(self, fmt: str, *args: Any) -> None:
        print(f"{self.address_string()} - [{self.log_date_time_string()}] {fmt % args}")

    def _security_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self' 'unsafe-inline' data:; "
            "img-src 'self' data:; connect-src 'self'; object-src 'none'; "
            "base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
        )
        self.send_header("Cache-Control", "no-store")

    def send_json(self, status: int, payload: dict[str, Any], extra_headers: list[tuple[str, str]] | None = None) -> None:
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self._security_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        for name, value in extra_headers or []:
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(body)

    def send_html(self, path: Path) -> None:
        body = path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self._security_headers()
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def session_cookie(self, token: str, max_age: int = SESSION_ABSOLUTE_SECONDS) -> str:
        parts = [
            f"{COOKIE_NAME}={token}",
            "Path=/",
            "HttpOnly",
            "SameSite=Strict",
            f"Max-Age={max_age}",
        ]
        if COOKIE_SECURE:
            parts.append("Secure")
        return "; ".join(parts)

    def clear_cookie(self) -> str:
        parts = [
            f"{COOKIE_NAME}=",
            "Path=/",
            "HttpOnly",
            "SameSite=Strict",
            "Max-Age=0",
        ]
        if COOKIE_SECURE:
            parts.append("Secure")
        return "; ".join(parts)

    def get_cookie_token(self) -> str | None:
        cookie_header = self.headers.get("Cookie")
        if not cookie_header:
            return None
        cookie = SimpleCookie()
        try:
            cookie.load(cookie_header)
        except Exception:
            return None
        morsel = cookie.get(COOKIE_NAME)
        return morsel.value if morsel else None

    def get_session(self, touch: bool = True) -> tuple[sqlite3.Row, sqlite3.Row] | None:
        token = self.get_cookie_token()
        if not token:
            return None
        token_hash = hashlib.sha256(token.encode("ascii")).hexdigest()
        now = int(time.time())
        with db_connect() as conn:
            row = conn.execute(
                """
                SELECT s.*, u.username, u.display_name, u.role, u.active
                FROM sessions s
                JOIN auth_users u ON u.id = s.user_id
                WHERE s.token_hash = ?
                """,
                (token_hash,),
            ).fetchone()
            if not row:
                return None
            if (
                not row["active"]
                or row["expires_at"] < now
                or now - row["last_seen"] > SESSION_IDLE_SECONDS
            ):
                conn.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash,))
                return None
            if touch:
                conn.execute(
                    "UPDATE sessions SET last_seen = ? WHERE token_hash = ?",
                    (now, token_hash),
                )
            user = {
                "id": row["user_id"],
                "username": row["username"],
                "display_name": row["display_name"],
                "role": row["role"],
                "active": bool(row["active"]),
            }
            return row, user  # type: ignore[return-value]

    def require_session(self, require_csrf: bool = False) -> tuple[sqlite3.Row, dict[str, Any]] | None:
        session = self.get_session()
        if not session:
            self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "Authentication required"})
            return None
        row, user = session
        if require_csrf:
            supplied = self.headers.get("X-CSRF-Token", "")
            if not supplied or not hmac.compare_digest(supplied, row["csrf_token"]):
                self.send_json(HTTPStatus.FORBIDDEN, {"error": "Invalid CSRF token"})
                return None
        return row, user

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/health":
            self.send_json(HTTPStatus.OK, {"ok": True, "service": "church-attendance"})
            return
        if path in ("/", "/index.html"):
            self.send_html(INDEX_PATH)
            return
        if path == "/api/session":
            session = self.require_session()
            if not session:
                return
            row, user = session
            self.send_json(
                HTTPStatus.OK,
                {"user": user, "csrf_token": row["csrf_token"]},
            )
            return
        if path == "/api/state":
            session = self.require_session()
            if not session:
                return
            with db_connect() as conn:
                row = conn.execute("SELECT state_json, updated_at FROM app_state WHERE id = 1").fetchone()
            self.send_json(
                HTTPStatus.OK,
                {
                    "state": json.loads(row["state_json"]) if row else None,
                    "updated_at": row["updated_at"] if row else None,
                },
            )
            return
        self.send_json(HTTPStatus.NOT_FOUND, {"error": "Not found"})

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/login":
            try:
                payload = parse_json(self, 16 * 1024)
                username = str(payload.get("username", "")).strip()
                password = str(payload.get("password", ""))
            except ValueError as exc:
                self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                return

            key = client_key(self, username)
            retry_after = check_login_limit(key)
            if retry_after:
                self.send_json(
                    HTTPStatus.TOO_MANY_REQUESTS,
                    {"error": f"Too many failed attempts. Try again in {retry_after} seconds."},
                    [("Retry-After", str(retry_after))],
                )
                return

            with db_connect() as conn:
                user = conn.execute(
                    "SELECT * FROM auth_users WHERE username = ? COLLATE NOCASE",
                    (username,),
                ).fetchone()

            valid = bool(
                user
                and user["active"]
                and verify_password(password, user["password_salt"], user["password_hash"])
            )
            if not valid:
                # Perform dummy work to reduce username timing differences.
                if not user:
                    dummy_salt = b"\x00" * 16
                    hash_password(password, dummy_salt)
                record_login_failure(key)
                self.send_json(
                    HTTPStatus.UNAUTHORIZED,
                    {"error": "Sign-in failed. Check your username and password."},
                )
                return

            clear_login_failures(key)
            token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(token.encode("ascii")).hexdigest()
            csrf = secrets.token_urlsafe(24)
            now = int(time.time())
            with db_connect() as conn:
                conn.execute(
                    """
                    INSERT INTO sessions
                        (token_hash, user_id, csrf_token, created_at, last_seen, expires_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        token_hash,
                        user["id"],
                        csrf,
                        now,
                        now,
                        now + SESSION_ABSOLUTE_SECONDS,
                    ),
                )
            response_user = {
                "id": user["id"],
                "username": user["username"],
                "display_name": user["display_name"],
                "role": user["role"],
                "active": True,
            }
            # Return the current application state with the login response.
            # This makes the UI transition independent of a second immediate
            # request while the browser is applying the new session cookie.
            with db_connect() as conn:
                state_row = conn.execute(
                    "SELECT state_json, updated_at FROM app_state WHERE id = 1"
                ).fetchone()
            response_state = json.loads(state_row["state_json"]) if state_row else None
            self.send_json(
                HTTPStatus.OK,
                {
                    "user": response_user,
                    "csrf_token": csrf,
                    "state": response_state,
                    "state_updated_at": state_row["updated_at"] if state_row else None,
                },
                [("Set-Cookie", self.session_cookie(token))],
            )
            return

        if path == "/api/logout":
            session = self.require_session(require_csrf=True)
            if not session:
                return
            row, _ = session
            with db_connect() as conn:
                conn.execute("DELETE FROM sessions WHERE token_hash = ?", (row["token_hash"],))
            self.send_json(
                HTTPStatus.OK,
                {"ok": True},
                [("Set-Cookie", self.clear_cookie())],
            )
            return

        if path == "/api/reauthenticate":
            session = self.require_session(require_csrf=True)
            if not session:
                return
            _, session_user = session
            try:
                payload = parse_json(self, 16 * 1024)
                password = str(payload.get("password", ""))
            except ValueError as exc:
                self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                return
            with db_connect() as conn:
                user = conn.execute(
                    "SELECT * FROM auth_users WHERE id = ?", (session_user["id"],)
                ).fetchone()
            if not user or not verify_password(password, user["password_salt"], user["password_hash"]):
                self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "Reauthentication failed"})
                return
            self.send_json(HTTPStatus.OK, {"ok": True})
            return

        self.send_json(HTTPStatus.NOT_FOUND, {"error": "Not found"})

    def do_PUT(self) -> None:
        path = urlparse(self.path).path
        if path != "/api/state":
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "Not found"})
            return
        session = self.require_session(require_csrf=True)
        if not session:
            return
        _, user = session
        if user["role"] == "auditor":
            self.send_json(HTTPStatus.FORBIDDEN, {"error": "Read-only accounts cannot save changes"})
            return
        try:
            payload = parse_json(self)
            state = payload.get("state")
            validate_state(state)
            with db_connect() as conn:
                old_row = conn.execute(
                    "SELECT state_json FROM app_state WHERE id = 1"
                ).fetchone()
                old_state = json.loads(old_row["state_json"]) if old_row else None
                if user["role"] == "usher" and old_state is not None:
                    validate_usher_update(old_state, state, user["id"])
                serialized = json.dumps(state, separators=(",", ":"), ensure_ascii=False)
                now = int(time.time())
                conn.execute(
                    """
                    INSERT INTO app_state (id, state_json, updated_at, updated_by)
                    VALUES (1, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        state_json = excluded.state_json,
                        updated_at = excluded.updated_at,
                        updated_by = excluded.updated_by
                    """,
                    (serialized, now, user["id"]),
                )
                if user["role"] == "admin":
                    sync_auth_profiles(conn, state)
        except PermissionError as exc:
            self.send_json(HTTPStatus.FORBIDDEN, {"error": str(exc)})
            return
        except ValueError as exc:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
            return
        self.send_json(HTTPStatus.OK, {"ok": True, "updated_at": now})


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Church Visitor Attendance System")
    parser.add_argument("--host", default="127.0.0.1", help="Bind address (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Port (default: 8000)")
    parser.add_argument(
        "--open-browser",
        action="store_true",
        help="Open the application in the default browser after the server starts",
    )
    parser.add_argument(
        "--set-password",
        nargs=2,
        metavar=("USERNAME", "PASSWORD"),
        help="Change a testing account password and exit",
    )
    args = parser.parse_args()

    created = init_db()
    if args.set_password:
        username, password = args.set_password
        set_password(username, password)
        print(f"Password updated for {username}. Existing sessions were revoked.")
        return

    selected_port = args.port
    server = None
    bind_error = None
    for candidate in range(args.port, args.port + 11):
        try:
            server = ThreadingHTTPServer((args.host, candidate), AppHandler)
            selected_port = candidate
            break
        except OSError as exc:
            bind_error = exc
    if server is None:
        raise OSError(
            f"Could not start the application on ports {args.port}-{args.port + 10}"
        ) from bind_error

    print("=" * 72)
    print("Church Visitor Attendance System — login fix build")
    print(f"Open: http://{args.host}:{selected_port}")
    if selected_port != args.port:
        print(f"Port {args.port} was already in use, so the app moved to {selected_port}.")
    print("Testing accounts:")
    for account in TEST_USERS:
        print(
            f"  {account['role']:<7}  {account['username']:<16}  "
            f"{account['password'] if created else '(existing database password)'}"
        )
    print("Change a password with: python server.py --set-password USERNAME NEW_PASSWORD")
    print("Press Ctrl+C to stop.")
    print("=" * 72)

    if args.open_browser:
        browser_host = "127.0.0.1" if args.host in ("0.0.0.0", "::") else args.host
        url = f"http://{browser_host}:{selected_port}"
        threading.Timer(0.8, lambda: webbrowser.open(url, new=2)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
