"""Populate the SOLI system with realistic, coherent pseudo-random data.

Creates login users in Keycloak (+ their DB rows), volunteer profiles, wallets,
and a large body of tasks spread across the past / present / future in three
cities, each with a coherent lifecycle (audit logs, chat, notifications,
credit transactions), plus redemptions, associations and reports.

Everything except the Keycloak accounts is written directly via SQL so that
timestamps can be back-dated (impossible through the REST API, which uses now()).

Usage:
    python seed.py                     # seed with defaults (~40 users, ~300 tasks)
    python seed.py --reset             # wipe DB + Keycloak first, then seed
    python seed.py --users 60 --tasks 500
"""
import sys
import json
import random
import unicodedata
from datetime import datetime, timedelta
from uuid import uuid4

from psycopg2.extras import Json
from faker import Faker

from config import CITIES, TEST_PASSWORD, DEFAULT_USERS, DEFAULT_TASKS
from common import db_connect, Keycloak

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

fake = Faker("it_IT")
Faker.seed(42)
random.seed(42)
NOW = datetime.now()

# --------------------------------------------------------------- domain data
CATEGORIES = ["MOBILITY", "PHYSICAL_SUPPORT", "SOCIAL", "PET_SUPPORT", "DIGITAL"]
URGENCIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
URG_MULT = {"LOW": 1.0, "MEDIUM": 1.25, "HIGH": 1.5, "CRITICAL": 2.0}
CAT_MULT = {"SOCIAL": 1.0, "DIGITAL": 1.1, "PET_SUPPORT": 1.1, "MOBILITY": 1.2, "PHYSICAL_SUPPORT": 1.5}
CERT_LEVELS = [None, "LV1_SPID", "LV1_SPID", "LV2_TRAINED", "LV3_PARTNER"]

TASK_TEMPLATES = {
    "MOBILITY": [
        ("Accompagnamento a visita medica", "Serve un passaggio per raggiungere l'ospedale e tornare a casa dopo la visita."),
        ("Trasporto per la spesa settimanale", "Accompagnamento al supermercato e aiuto nel portare le borse."),
        ("Passaggio per commissioni in centro", "Necessito di un accompagnamento per alcune commissioni in centro città."),
    ],
    "PHYSICAL_SUPPORT": [
        ("Aiuto per la spesa pesante", "Aiuto nel trasportare pacchi d'acqua e borse della spesa fino al terzo piano."),
        ("Piccoli lavori domestici", "Serve una mano per spostare mobili e sistemare la cantina."),
        ("Aiuto nel giardinaggio", "Potatura siepe e sistemazione del piccolo giardino condominiale."),
    ],
    "SOCIAL": [
        ("Compagnia per una persona anziana", "Un'ora di compagnia e due chiacchiere nel pomeriggio."),
        ("Lettura ad alta voce", "Lettura del giornale e di un libro per una persona con difficoltà visive."),
        ("Passeggiata al parco", "Accompagnamento per una passeggiata rilassante al parco vicino."),
    ],
    "PET_SUPPORT": [
        ("Passeggiata con il cane", "Portare a spasso il cane due volte al giorno per qualche giorno."),
        ("Cura del gatto durante l'assenza", "Alimentazione e cura del gatto durante un breve ricovero."),
        ("Trasporto animale dal veterinario", "Accompagnamento del cane per una visita di controllo."),
    ],
    "DIGITAL": [
        ("Aiuto con lo SPID", "Assistenza per attivare e usare lo SPID e prenotare online."),
        ("Configurazione smartphone", "Aiuto nell'impostare telefono, email e videochiamate con i nipoti."),
        ("Supporto per pratiche online", "Assistenza nella compilazione di moduli e pagamenti online."),
    ],
}

CHARITIES = [
    ("Banco Alimentare", "Rete che recupera eccedenze alimentari e le dona a chi è in difficoltà.", "Alimentare", "Spesa solidale 10€", 50, 100),
    ("Croce Rossa Italiana", "Assistenza sanitaria e soccorso alle persone vulnerabili.", "Sanità", "Kit primo soccorso", 40, 100),
    ("Legambiente", "Associazione ambientalista impegnata nella tutela del territorio.", "Ambiente", "Albero piantato a tuo nome", 30, 200),
    ("Emergency", "Cure medico-chirurgiche gratuite alle vittime di guerra e povertà.", "Sanità", "Donazione visita medica", 60, 100),
]

REWARDS = [
    ("Abbonamento bus urbano", "Sconto del 20% sull'abbonamento mensile del trasporto pubblico.", 50, "Azienda Trasporti Locale", 100),
    ("Buono spesa 10€", "Buono spesa da 10€ presso i supermercati aderenti.", 80, "Coop", 100),
    ("Ingresso museo civico", "Ingresso gratuito ai musei civici per una giornata.", 30, "Comune", 150),
    ("Caffè sospeso", "Un caffè offerto presso i bar della rete solidale.", 10, "Bar Solidale", 300),
    ("Lezione di nuoto", "Ingresso singolo in piscina comunale.", 25, "Piscina Comunale", 80),
    ("Libro in omaggio", "Buono libro presso le librerie indipendenti aderenti.", 45, "Librerie Indipendenti", 60),
]

CHAT_LINES = [
    "Buongiorno, ho preso in carico la sua richiesta.",
    "Perfetto, la ringrazio molto!",
    "A che ora preferisce che passi?",
    "Va benissimo, ci vediamo lì.",
    "Sono arrivato, la aspetto all'ingresso.",
    "Grazie ancora per la disponibilità, gentilissimo.",
]

REPORT_REASONS = [
    "Il volontario non si è presentato all'orario concordato.",
    "Comportamento poco rispettoso durante il servizio.",
    "La richiesta non corrispondeva a quanto descritto.",
    "Ritardo significativo senza preavviso.",
]


# ------------------------------------------------------------------- helpers
def insert(cur, table, **cols):
    keys = list(cols.keys())
    sql = f"INSERT INTO {table} ({', '.join(keys)}) VALUES ({', '.join(['%s'] * len(keys))})"
    cur.execute(sql, [cols[k] for k in keys])


def slug(text):
    norm = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return norm.lower().replace(" ", "").replace("'", "")


def token():
    return uuid4().hex[:11]


def voucher():
    return "SOLI-" + uuid4().hex[:8].upper()


def jitter(center, delta=0.02):
    lat, lon = center
    return (lat + random.uniform(-delta, delta), lon + random.uniform(-delta, delta))


def compute_credits(check_in, check_out, urgency, category):
    seconds = (check_out - check_in).total_seconds()
    if seconds <= 0:
        return 0
    minutes = min(seconds / 60.0, 480)
    base = (minutes / 60.0) * 6.0
    credits = base * URG_MULT[urgency] * CAT_MULT[category]
    return max(1, round(credits))


def address_for(city):
    info = CITIES[city]
    return f"{random.choice(info['streets'])} {random.randint(1, 180)}, {info['cap']} {city}"


# --------------------------------------------------------------------- seed
def seed(conn, n_users, n_tasks):
    cur = conn.cursor()
    kc = Keycloak()
    used_fiscal = set()

    def uniq_fiscal():
        while True:
            fc = fake.ssn().upper()
            if fc not in used_fiscal:
                used_fiscal.add(fc)
                return fc

    # ---- catalogs: charities + rewards ------------------------------------
    charities = []  # (id, cost, stock)
    for name, desc, cause, label, cost, stock in CHARITIES:
        cid = str(uuid4())
        insert(cur, "soli_charities", id=cid, name=name, description=desc, cause=cause,
               voucher_label=label, cost_in_credits=cost, stock_remaining=stock,
               is_active=True, created_at=NOW - timedelta(days=200))
        charities.append({"id": cid, "cost": cost, "stock": stock})
    for title, desc, cost, partner, stock in REWARDS:
        insert(cur, "soli_rewards", id=str(uuid4()), title=title, description=desc,
               cost_in_credits=cost, partner_name=partner, stock_limit=stock, is_active=True)
    print(f"[seed] Catalogs: {len(charities)} charities, {len(REWARDS)} rewards")

    # ---- users ------------------------------------------------------------
    fixed = [
        ("admin@soli.it", "Admin", "SOLI", "ADMIN"),
        ("mario.rossi@soli.it", "Mario", "Rossi", "USER"),
        ("giulia.bianchi@soli.it", "Giulia", "Bianchi", "USER"),
        ("luca.verdi@soli.it", "Luca", "Verdi", "USER"),
        ("anna.russo@soli.it", "Anna", "Russo", "USER"),
        ("marco.ferrari@soli.it", "Marco", "Ferrari", "USER"),
    ]
    users = []  # dicts: id, email, first, last, role, city, home, is_volunteer, categories
    city_names = list(CITIES.keys())

    def make_user(email, first, last, role, is_volunteer):
        city = random.choice(city_names)
        home = jitter(CITIES[city]["center"], 0.03)
        uid = str(uuid4())
        kc_id = kc.create_user(email, email, first, last, TEST_PASSWORD)
        created = NOW - timedelta(days=random.randint(30, 210))
        insert(cur, "soli_users", id=uid, keycloak_id=kc_id, email=email,
               first_name=first, last_name=last, fiscal_code=uniq_fiscal(),
               role=role, certification_level=(random.choice(CERT_LEVELS) if is_volunteer else None),
               status=("SUSPENDED" if random.random() < 0.05 else "ACTIVE"),
               last_known_location=f"{home[0]:.5f},{home[1]:.5f}",
               created_at=created, updated_at=created)
        u = {"id": uid, "email": email, "first": first, "last": last, "role": role,
             "city": city, "home": home, "is_volunteer": is_volunteer, "categories": []}
        users.append(u)
        return u

    for email, first, last, role in fixed:
        make_user(email, first, last, role, is_volunteer=(role == "USER"))
    for i in range(max(0, n_users - len(fixed))):
        first, last = fake.first_name(), fake.last_name()
        email = f"{slug(first)}.{slug(last)}{i}@soli.test"
        make_user(email, first, last, "USER", is_volunteer=(random.random() < 0.75))
    print(f"[seed] Users: {len(users)} (Keycloak + DB)")

    # elderly beneficiaries: DB-only (no Keycloak login)
    elderly = []
    for _ in range(8):
        city = random.choice(city_names)
        home = jitter(CITIES[city]["center"], 0.03)
        uid = str(uuid4())
        first, last = fake.first_name(), fake.last_name()
        created = NOW - timedelta(days=random.randint(30, 210))
        insert(cur, "soli_users", id=uid, keycloak_id=None, email=f"{slug(first)}.{slug(last)}.{uid[:6]}@beneficiario.soli",
               first_name=first, last_name=last, fiscal_code=uniq_fiscal(),
               role="USER", certification_level=None, status="ACTIVE",
               last_known_location=f"{home[0]:.5f},{home[1]:.5f}", created_at=created, updated_at=created)
        elderly.append({"id": uid, "city": city, "home": home})
    # caregiver relations: each elderly cared for by a random login user in same city
    for e in elderly:
        caregiver = random.choice([u for u in users if u["role"] == "USER"])
        insert(cur, "soli_caregiver_relations", id=str(uuid4()), caregiver_id=caregiver["id"],
               beneficiary_id=e["id"], relationship_type=random.choice(["figlio", "assistente", "vicino", "parente"]),
               created_at=NOW - timedelta(days=random.randint(10, 120)))
        e["caregiver"] = caregiver["id"]
    print(f"[seed] Elderly beneficiaries: {len(elderly)} (DB-only) + caregiver relations")

    # ---- volunteer profiles ----------------------------------------------
    for u in users:
        if not u["is_volunteer"]:
            continue
        cats = random.sample(CATEGORIES, random.randint(1, 3))
        u["categories"] = cats
        pid = str(uuid4())
        insert(cur, "soli_volunteer_profiles", id=pid, user_id=u["id"],
               availability_schedule=Json({"mon": ["09:00-13:00"], "wed": ["15:00-19:00"], "sat": ["10:00-18:00"]}),
               constraints_json=Json({"noHeavyLifting": random.random() < 0.3, "petFriendly": random.random() < 0.7}),
               max_task_distance_meters=random.choice([8000, 12000, 15000, 20000, 25000]),
               target_location=u["city"], latitude=u["home"][0], longitude=u["home"][1])
        for c in cats:
            insert(cur, "soli_volunteer_service_categories", volunteer_profile_id=pid, category=c)
    volunteers = [u for u in users if u["is_volunteer"]]
    print(f"[seed] Volunteer profiles: {len(volunteers)}")

    # ---- wallets ----------------------------------------------------------
    wallet_id = {}
    balance = {}
    for u in users:
        wid = str(uuid4())
        insert(cur, "soli_wallets", id=wid, user_id=u["id"], balance=0, updated_at=NOW)
        wallet_id[u["id"]] = wid
        balance[u["id"]] = 0
    print(f"[seed] Wallets: {len(wallet_id)}")

    # ---- tasks ------------------------------------------------------------
    def pick_volunteer(city, category, exclude):
        pool = [v for v in volunteers if v["city"] == city and category in v["categories"] and v["id"] not in exclude]
        if not pool:
            pool = [v for v in volunteers if v["city"] == city and v["id"] not in exclude]
        if not pool:
            pool = [v for v in volunteers if v["id"] not in exclude]
        return random.choice(pool) if pool else None

    def audit(entity_id, old, new, actor, ts):
        insert(cur, "soli_audit_logs", id=str(uuid4()), entity_type="TASK", entity_id=entity_id,
               action="STATUS_CHANGE", old_value=Json({"status": old}), new_value=Json({"status": new}),
               actor_id=actor, timestamp=ts)

    def chat(task_id, creator_id, volunteer_id, start):
        sid = str(uuid4())
        insert(cur, "soli_chat_sessions", id=sid, task_id=task_id, is_active=True, created_at=start)
        n = random.randint(2, 5)
        for k in range(n):
            sender = volunteer_id if k % 2 == 0 else creator_id
            insert(cur, "soli_chat_messages", id=str(uuid4()), chat_session_id=sid, sender_id=sender,
                   content=CHAT_LINES[k % len(CHAT_LINES)], is_flagged=False,
                   sent_at=start + timedelta(minutes=5 * (k + 1)))

    def notify(task_id, city, category, accepted_vol, accepted_at):
        others = [v for v in volunteers if v["city"] == city and (accepted_vol is None or v["id"] != accepted_vol["id"])]
        random.shuffle(others)
        for v in others[:random.randint(1, 3)]:
            insert(cur, "soli_task_notifications", id=str(uuid4()), task_id=task_id, volunteer_id=v["id"],
                   status=random.choice(["PENDING", "IGNORED", "REJECTED"]),
                   notified_at=(accepted_at or NOW) - timedelta(minutes=random.randint(5, 60)),
                   responded_at=None)
        if accepted_vol is not None:
            insert(cur, "soli_task_notifications", id=str(uuid4()), task_id=task_id, volunteer_id=accepted_vol["id"],
                   status="ACCEPTED", notified_at=accepted_at - timedelta(minutes=random.randint(5, 30)),
                   responded_at=accepted_at)

    buckets = (["completed"] * 55 + ["in_progress"] * 6 + ["accepted"] * 7 +
               ["open_now"] * 10 + ["notified"] * 5 + ["open_future"] * 10 +
               ["released"] * 3 + ["cancelled"] * 4)

    completed_tasks = []  # (task_id, creator_id, volunteer_id)
    counts = {}
    for _ in range(n_tasks):
        bucket = random.choice(buckets)
        counts[bucket] = counts.get(bucket, 0) + 1
        city = random.choice(city_names)
        creator = random.choice([u for u in users if u["role"] == "USER"])
        category = random.choice(CATEGORIES)
        urgency = random.choices(URGENCIES, weights=[35, 35, 20, 10])[0]
        title, desc = random.choice(TASK_TEMPLATES[category])
        coords = jitter(CITIES[city]["center"])
        # beneficiary: sometimes an elderly the creator cares for
        cared = [e for e in elderly if e.get("caregiver") == creator["id"]]
        beneficiary_id = random.choice(cared)["id"] if (cared and random.random() < 0.5) else creator["id"]
        tid = str(uuid4())

        base = dict(id=tid, creator_id=creator["id"], beneficiary_id=beneficiary_id, category=category,
                    title=title, description=desc, urgency_level=urgency,
                    target_location=city, target_address=address_for(city),
                    latitude=coords[0], longitude=coords[1], reward_credits=0,
                    creator_confirmed=False, volunteer_confirmed=False, has_scheduled_time=False,
                    volunteer_id=None, scheduled_at=None, accepted_at=None,
                    check_in_token=None, check_out_token=None, check_in_at=None, check_out_at=None)

        if bucket == "completed":
            created = NOW - timedelta(days=random.randint(3, 180), hours=random.randint(0, 12))
            vol = pick_volunteer(city, category, {creator["id"], beneficiary_id})
            if vol is None:
                bucket = "open_now"  # degrade gracefully
            else:
                accepted = created + timedelta(minutes=random.randint(15, 600))
                check_in = accepted + timedelta(minutes=random.randint(10, 240))
                dur = random.randint(20, 180)
                check_out = check_in + timedelta(minutes=dur)
                if check_out > NOW:
                    check_out = NOW - timedelta(minutes=random.randint(5, 120))
                    if check_out <= check_in:
                        check_in = check_out - timedelta(minutes=dur)
                credits = compute_credits(check_in, check_out, urgency, category)
                base.update(status="COMPLETED", volunteer_id=vol["id"], accepted_at=accepted,
                            check_in_token=token(), check_out_token=token(), check_in_at=check_in,
                            check_out_at=check_out, reward_credits=credits,
                            creator_confirmed=True, volunteer_confirmed=True)
                insert(cur, "soli_tasks", created_at=created, updated_at=check_out, **base)
                audit(tid, "OPEN", "ACCEPTED", vol["id"], accepted)
                audit(tid, "ACCEPTED", "IN_PROGRESS", vol["id"], check_in)
                audit(tid, "IN_PROGRESS", "COMPLETED", vol["id"], check_out)
                chat(tid, creator["id"], vol["id"], accepted)
                notify(tid, city, category, vol, accepted)
                # credit transaction
                insert(cur, "soli_transactions", id=str(uuid4()), wallet_id=wallet_id[vol["id"]],
                       amount=credits, transaction_type="EARN_TASK_REWARD", reference_id=tid, timestamp=check_out)
                balance[vol["id"]] += credits
                completed_tasks.append((tid, creator["id"], vol["id"]))
                continue

        if bucket in ("accepted", "in_progress"):
            created = NOW - timedelta(days=random.randint(0, 6), hours=random.randint(0, 12))
            vol = pick_volunteer(city, category, {creator["id"], beneficiary_id})
            if vol is None:
                bucket = "open_now"
            else:
                accepted = created + timedelta(minutes=random.randint(15, 400))
                if bucket == "in_progress":
                    check_in = accepted + timedelta(minutes=random.randint(10, 120))
                    base.update(status="IN_PROGRESS", volunteer_id=vol["id"], accepted_at=accepted,
                                check_in_token=token(), check_out_token=token(), check_in_at=check_in)
                    last = check_in
                else:
                    base.update(status="ACCEPTED", volunteer_id=vol["id"], accepted_at=accepted,
                                check_in_token=token())
                    last = accepted
                insert(cur, "soli_tasks", created_at=created, updated_at=last, **base)
                audit(tid, "OPEN", "ACCEPTED", vol["id"], accepted)
                if bucket == "in_progress":
                    audit(tid, "ACCEPTED", "IN_PROGRESS", vol["id"], base["check_in_at"])
                chat(tid, creator["id"], vol["id"], accepted)
                notify(tid, city, category, vol, accepted)
                continue

        if bucket == "open_future":
            created = NOW - timedelta(days=random.randint(0, 3))
            base.update(status="OPEN", scheduled_at=NOW + timedelta(days=random.randint(1, 21)),
                        has_scheduled_time=random.random() < 0.6)
            insert(cur, "soli_tasks", created_at=created, updated_at=created, **base)
            notify(tid, city, category, None, None)
            continue

        if bucket == "released":
            created = NOW - timedelta(days=random.randint(3, 60))
            esc = URGENCIES[min(URGENCIES.index(urgency) + 1, 3)]
            base.update(status="RELEASED", urgency_level=esc)
            insert(cur, "soli_tasks", created_at=created, updated_at=created + timedelta(hours=2), **base)
            continue

        if bucket == "cancelled":
            created = NOW - timedelta(days=random.randint(3, 60))
            base.update(status="CANCELLED")
            insert(cur, "soli_tasks", created_at=created, updated_at=created + timedelta(hours=1), **base)
            continue

        # open_now / notified (and degraded fallbacks)
        created = NOW - timedelta(days=random.randint(0, 7), hours=random.randint(0, 12))
        base.update(status=("NOTIFIED" if bucket == "notified" else "OPEN"))
        insert(cur, "soli_tasks", created_at=created, updated_at=created, **base)
        notify(tid, city, category, None, None)

    print(f"[seed] Tasks: {n_tasks} -> {counts}")

    # ---- redemptions ------------------------------------------------------
    n_redemptions = 0
    for v in volunteers:
        if balance[v["id"]] < min(c["cost"] for c in charities):
            continue
        if random.random() > 0.5:
            continue
        for _ in range(random.randint(1, 2)):
            affordable = [c for c in charities if c["cost"] <= balance[v["id"]] and c["stock"] > 0]
            if not affordable:
                break
            c = random.choice(affordable)
            ts = NOW - timedelta(days=random.randint(0, 20))
            insert(cur, "soli_redemptions", id=str(uuid4()), user_id=v["id"], charity_id=c["id"],
                   voucher_code=voucher(), credits_spent=c["cost"], created_at=ts)
            insert(cur, "soli_transactions", id=str(uuid4()), wallet_id=wallet_id[v["id"]],
                   amount=-c["cost"], transaction_type="SPEND_DONATION", reference_id=c["id"], timestamp=ts)
            cur.execute("UPDATE soli_charities SET stock_remaining = stock_remaining - 1 WHERE id = %s", (c["id"],))
            balance[v["id"]] -= c["cost"]
            c["stock"] -= 1
            n_redemptions += 1
    print(f"[seed] Redemptions: {n_redemptions}")

    # ---- finalize wallet balances ----------------------------------------
    for uid, wid in wallet_id.items():
        cur.execute("UPDATE soli_wallets SET balance = %s, updated_at = %s WHERE id = %s",
                    (balance[uid], NOW, wid))

    # ---- associations -----------------------------------------------------
    assoc_names = [("Volontari Insieme", "#00796B"), ("Rete Solidale", "#FF6F00"), ("CittadiniAttivi", "#1565C0")]
    for name, color in assoc_names:
        creator = random.choice([u for u in users if u["role"] == "USER"])
        aid = str(uuid4())
        created = NOW - timedelta(days=random.randint(30, 200))
        insert(cur, "soli_associations", id=aid, name=name,
               description=f"Associazione di volontariato: {name}.", creator_id=creator["id"],
               accent_color=color, created_at=created, updated_at=created)
        insert(cur, "soli_association_memberships", id=str(uuid4()), association_id=aid,
               user_id=creator["id"], role="ADMIN", status="APPROVED", joined_at=created, updated_at=created)
        members = random.sample([u for u in users if u["id"] != creator["id"]],
                                min(random.randint(6, 12), len(users) - 1))
        for i, m in enumerate(members):
            approved = i >= 2  # first two left PENDING for realism
            insert(cur, "soli_association_memberships", id=str(uuid4()), association_id=aid,
                   user_id=m["id"], role=("MODERATOR" if i == 2 else "MEMBER"),
                   status=("APPROVED" if approved else "PENDING"),
                   joined_at=created + timedelta(days=random.randint(1, 60)), updated_at=NOW)
    print(f"[seed] Associations: {len(assoc_names)}")

    # ---- reports ----------------------------------------------------------
    n_reports = min(8, len(completed_tasks))
    for tid, creator_id, vol_id in random.sample(completed_tasks, n_reports):
        reporter, reported = random.choice([(creator_id, vol_id), (vol_id, creator_id)])
        status = random.choice(["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"])
        insert(cur, "soli_reports", id=str(uuid4()), task_id=tid, reporter_id=reporter,
               reported_user_id=reported, reason=random.choice(REPORT_REASONS), status=status,
               created_at=NOW - timedelta(days=random.randint(0, 30)),
               resolved_at=(NOW if status in ("RESOLVED", "DISMISSED") else None))
    print(f"[seed] Reports: {n_reports}")

    conn.commit()
    cur.close()
    return {"users": len(users), "elderly": len(elderly), "volunteers": len(volunteers),
            "tasks": n_tasks, "completed": len(completed_tasks), "redemptions": n_redemptions,
            "associations": len(assoc_names), "reports": n_reports}


def write_test_users_doc(path):
    lines = [
        "# Utenti di test — SOLI",
        "",
        "> Generato da `scripts/seed.py`. Credenziali in chiaro: **solo per test**, non usare in produzione.",
        "",
        f"Password comune per tutti gli account: `{TEST_PASSWORD}`",
        "",
        "## Account noti",
        "",
        "| Email | Ruolo | Note |",
        "| --- | --- | --- |",
        "| admin@soli.it | ADMIN | Amministratore (accesso pannello admin) |",
        "| mario.rossi@soli.it | USER | Volontario/Richiedente (toggle UI) |",
        "| giulia.bianchi@soli.it | USER | Volontario/Richiedente |",
        "| luca.verdi@soli.it | USER | Volontario/Richiedente |",
        "| anna.russo@soli.it | USER | Volontario/Richiedente |",
        "| marco.ferrari@soli.it | USER | Volontario/Richiedente |",
        "",
        "Gli altri account generati hanno email nella forma `nome.cognomeN@soli.test`",
        f"(stessa password `{TEST_PASSWORD}`). I beneficiari anziani sono righe DB senza login Keycloak.",
        "",
        "Il ruolo volontario/richiedente è un toggle nell'interfaccia (non persistito): ogni",
        "account USER può agire da entrambi.",
    ]
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def main():
    args = sys.argv[1:]
    n_users, n_tasks = DEFAULT_USERS, DEFAULT_TASKS
    if "--users" in args:
        n_users = int(args[args.index("--users") + 1])
    if "--tasks" in args:
        n_tasks = int(args[args.index("--tasks") + 1])
    if "--reset" in args:
        import reset
        reset.reset_db()
        reset.reset_keycloak()

    conn = db_connect()
    try:
        summary = seed(conn, n_users, n_tasks)
    finally:
        conn.close()

    import os
    doc_path = os.path.join(os.path.dirname(__file__), "TEST_USERS.md")
    write_test_users_doc(doc_path)
    print(f"[ok] Seed complete: {summary}")
    print(f"[ok] Test users documented in {doc_path}")


if __name__ == "__main__":
    main()
