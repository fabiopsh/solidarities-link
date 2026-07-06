"""Reset the SOLI system to a clean state for testing.

- PostgreSQL: TRUNCATE every `soli_%` table (RESTART IDENTITY CASCADE).
- Keycloak: delete every user in the `soli` realm except the protected admin(s).

Usage:
    python reset.py            # wipe both DB and Keycloak
    python reset.py --db-only  # wipe only PostgreSQL
    python reset.py --kc-only  # wipe only Keycloak users
"""
import sys

from config import PROTECTED_KC_USERNAMES
from common import db_connect, list_soli_tables, Keycloak


def reset_db():
    conn = db_connect()
    try:
        tables = list_soli_tables(conn)
        if not tables:
            print("[db] No soli_ tables found (nothing to truncate).")
            return
        with conn.cursor() as cur:
            cur.execute("TRUNCATE TABLE " + ", ".join(tables) + " RESTART IDENTITY CASCADE")
        conn.commit()
        print(f"[db] Truncated {len(tables)} tables: {', '.join(tables)}")
    finally:
        conn.close()


def reset_keycloak():
    kc = Keycloak()
    users = kc.list_users()
    deleted = 0
    for u in users:
        if u.get("username") in PROTECTED_KC_USERNAMES:
            continue
        kc.delete_user(u["id"])
        deleted += 1
    print(f"[kc] Deleted {deleted} realm users "
          f"(kept protected: {', '.join(sorted(PROTECTED_KC_USERNAMES))}).")


def main():
    args = set(sys.argv[1:])
    do_db = "--kc-only" not in args
    do_kc = "--db-only" not in args
    if do_db:
        reset_db()
    if do_kc:
        reset_keycloak()
    print("[ok] Reset complete.")


if __name__ == "__main__":
    main()
