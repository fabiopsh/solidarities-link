"""Central configuration for the SOLI seed/reset scripts.

All values can be overridden via environment variables so the scripts work
against the local docker dev stack out of the box, but also against other
environments without code changes.
"""
import os

# ---------------------------------------------------------------- PostgreSQL
PG = {
    "host": os.getenv("SOLI_PG_HOST", "localhost"),
    "port": int(os.getenv("SOLI_PG_PORT", "5433")),
    "dbname": os.getenv("SOLI_PG_DB", "soli_db"),
    "user": os.getenv("SOLI_PG_USER", "soli"),
    "password": os.getenv("SOLI_PG_PASSWORD", "soli_password"),
}

# ------------------------------------------------------------------ Keycloak
KEYCLOAK = {
    "base_url": os.getenv("SOLI_KC_URL", "http://localhost:8180").rstrip("/"),
    "realm": os.getenv("SOLI_KC_REALM", "soli"),
    "admin_user": os.getenv("SOLI_KC_ADMIN_USER", "admin"),
    "admin_password": os.getenv("SOLI_KC_ADMIN_PASSWORD", "admin"),
    "admin_client": os.getenv("SOLI_KC_ADMIN_CLIENT", "admin-cli"),
}

# Common password for every generated test account (test data only).
TEST_PASSWORD = os.getenv("SOLI_TEST_PASSWORD", "Solidale2026!")

# The realm user that must never be deleted by reset (predefined admin).
PROTECTED_KC_USERNAMES = {"admin@soli.it"}

# Default generation volumes (overridable via CLI flags in seed.py).
DEFAULT_USERS = int(os.getenv("SOLI_SEED_USERS", "40"))
DEFAULT_TASKS = int(os.getenv("SOLI_SEED_TASKS", "300"))

# ------------------------------------------------------------------- Cities
# (lat, lon) centres + representative streets used to build realistic addresses.
CITIES = {
    "Pisa": {
        "center": (43.7228, 10.3966),
        "cap": "56100",
        "streets": [
            "Via San Martino", "Corso Italia", "Via Roma", "Lungarno Pacinotti",
            "Via Bonanno Pisano", "Via Cattaneo", "Via Livornese", "Piazza dei Miracoli",
        ],
    },
    "Milano": {
        "center": (45.4642, 9.1900),
        "cap": "20100",
        "streets": [
            "Via Torino", "Corso Buenos Aires", "Via Padova", "Viale Monza",
            "Via Dante", "Corso Vercelli", "Via Ripamonti", "Viale Certosa",
        ],
    },
    "Roma": {
        "center": (41.9028, 12.4964),
        "cap": "00100",
        "streets": [
            "Via del Corso", "Viale Trastevere", "Via Nazionale", "Via Appia Nuova",
            "Via Tuscolana", "Via Ostiense", "Via Prenestina", "Viale Marconi",
        ],
    },
}
