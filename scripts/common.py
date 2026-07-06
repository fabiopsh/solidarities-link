"""Shared helpers: PostgreSQL connection + Keycloak Admin REST API client."""
import sys
import psycopg2
import requests

from config import PG, KEYCLOAK


# ------------------------------------------------------------------ Postgres
def db_connect():
    """Open a psycopg2 connection to the SOLI database."""
    try:
        return psycopg2.connect(**PG)
    except psycopg2.OperationalError as e:
        sys.exit(f"[ERR] Cannot connect to Postgres at {PG['host']}:{PG['port']} — {e}\n"
                 f"      Is the 'soli-postgres' container running?")


def list_soli_tables(conn):
    """Return every public table whose name starts with 'soli_'."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name LIKE 'soli_%' "
            "ORDER BY table_name"
        )
        return [r[0] for r in cur.fetchall()]


# ------------------------------------------------------------------ Keycloak
class Keycloak:
    """Thin wrapper over the Keycloak Admin REST API for the SOLI realm."""

    def __init__(self):
        self.base = KEYCLOAK["base_url"]
        self.realm = KEYCLOAK["realm"]
        self._token = None

    def _admin_token(self):
        if self._token:
            return self._token
        url = f"{self.base}/realms/master/protocol/openid-connect/token"
        try:
            r = requests.post(url, data={
                "client_id": KEYCLOAK["admin_client"],
                "username": KEYCLOAK["admin_user"],
                "password": KEYCLOAK["admin_password"],
                "grant_type": "password",
            }, timeout=15)
        except requests.exceptions.ConnectionError as e:
            sys.exit(f"[ERR] Cannot reach Keycloak at {self.base} — {e}\n"
                     f"      Is the 'soli-keycloak' container running?")
        if r.status_code != 200:
            sys.exit(f"[ERR] Keycloak admin login failed ({r.status_code}): {r.text}")
        self._token = r.json()["access_token"]
        return self._token

    def _headers(self):
        return {"Authorization": f"Bearer {self._admin_token()}",
                "Content-Type": "application/json"}

    def _realm_url(self, path):
        return f"{self.base}/admin/realms/{self.realm}{path}"

    def list_users(self, first=0, maximum=1000):
        r = requests.get(self._realm_url(f"/users?first={first}&max={maximum}"),
                         headers=self._headers(), timeout=30)
        r.raise_for_status()
        return r.json()

    def find_user_id(self, username):
        r = requests.get(self._realm_url(f"/users?username={username}&exact=true"),
                         headers=self._headers(), timeout=15)
        r.raise_for_status()
        data = r.json()
        return data[0]["id"] if data else None

    def create_user(self, username, email, first_name, last_name, password):
        """Create an enabled, email-verified user with a permanent password.

        Returns the Keycloak user id. If the user already exists, returns the
        existing id (and resets the password to keep test logins predictable).
        """
        payload = {
            "username": username,
            "email": email,
            "firstName": first_name,
            "lastName": last_name,
            "enabled": True,
            "emailVerified": True,
            "credentials": [{"type": "password", "value": password, "temporary": False}],
        }
        r = requests.post(self._realm_url("/users"), json=payload,
                          headers=self._headers(), timeout=15)
        if r.status_code == 201:
            return r.headers["Location"].rstrip("/").split("/")[-1]
        if r.status_code == 409:
            uid = self.find_user_id(username)
            if uid:
                self.set_password(uid, password)
                return uid
        raise RuntimeError(f"Keycloak create_user failed ({r.status_code}): {r.text}")

    def set_password(self, user_id, password):
        r = requests.put(self._realm_url(f"/users/{user_id}/reset-password"),
                         json={"type": "password", "value": password, "temporary": False},
                         headers=self._headers(), timeout=15)
        r.raise_for_status()

    def delete_user(self, user_id):
        r = requests.delete(self._realm_url(f"/users/{user_id}"),
                            headers=self._headers(), timeout=15)
        # 204 on success, 404 if already gone
        if r.status_code not in (204, 404):
            raise RuntimeError(f"Keycloak delete_user failed ({r.status_code}): {r.text}")
