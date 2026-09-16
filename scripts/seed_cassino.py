"""Demo scenario for the CassiTrack + OmniMove integration (Cassino).

The Cassino TPL network simulated by the backend covers only Cassino, while the main seed spreads data over
Pisa / Milano / Roma. This script ADDS (without wiping anything else) a coherent Cassino scenario:

- 2 login accounts: a volunteer living near the Folcara campus and a caregiver requester
- an elderly beneficiary and 7 DB-only volunteers spread across the city (near stops, off-network, outside radius)
- accompaniment tasks (open, accepted, in progress, completed history) plus a few other open tasks for the map

Re-running it removes the previous Cassino scenario and recreates it with fresh timestamps.

Usage:
    python seed_cassino.py
"""
import sys
import random
from datetime import datetime, timedelta
from uuid import uuid4

from psycopg2.extras import Json

from config import TEST_PASSWORD
from common import db_connect, Keycloak

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

random.seed(2026)
NOW = datetime.now().replace(microsecond=0)
CITY = "Cassino"
DEMO_DOMAIN = "cassino.soli.test"

# Login accounts (Keycloak + DB)
VOLUNTEER = ("chiara.colella@soli.it", "Chiara", "Colella", (41.4966, 13.8446), ["MOBILITY", "SOCIAL", "DIGITAL"], 2500)
REQUESTER = ("paolo.iannone@soli.it", "Paolo", "Iannone", (41.4912, 13.8290))

# DB-only volunteers: (first, last, home, categories, action radius m) — placed to show TPL-aware matching
OTHER_VOLUNTEERS = [
    ("Giuseppe", "Mancini", (41.4929, 13.8327), ["MOBILITY", "PHYSICAL_SUPPORT"], 2000),   # centre, walks
    ("Elena", "Rossetti", (41.4889, 13.8158), ["MOBILITY", "SOCIAL"], 1500),               # Colosseo, bus L2
    ("Davide", "Pontone", (41.5001, 13.8266), ["MOBILITY"], 1000),                         # Liceo, outside radius
    ("Sara", "Evangelista", (41.5009, 13.8456), ["MOBILITY", "DIGITAL"], 1800),            # DiSCo, outside radius, bus
    ("Marco", "Tamburrini", (41.4853, 13.8226), ["MOBILITY", "PET_SUPPORT"], 3000),        # Stazione
    ("Luigi", "Capuano", (41.4610, 13.8690), ["MOBILITY", "PHYSICAL_SUPPORT"], 5000),      # off-network
    ("Francesca", "Grossi", (41.4752, 13.8303), ["MOBILITY", "SOCIAL"], 2500),             # Ospedale, L3
]

ELDERLY = ("Maria Grazia", "Di Mambro", (41.4876, 13.8283), "Via Garigliano 42, 03043 Cassino")

CHAT = [
    "Buongiorno Paolo, ho preso in carico l'accompagnamento.",
    "Grazie Chiara! Mia madre sarà pronta al portone.",
    "Perfetto, prendo il bus e vi raggiungo in Via Garigliano.",
]


def insert(cur, table, **cols):
    keys = list(cols.keys())
    cur.execute(f"INSERT INTO {table} ({', '.join(keys)}) VALUES ({', '.join(['%s'] * len(keys))})",
                [cols[k] for k in keys])


def fiscal():
    return "CSN" + uuid4().hex[:13].upper()


def token():
    return uuid4().hex[:11]


def cleanup(cur):
    emails = [VOLUNTEER[0], REQUESTER[0]]
    cur.execute("SELECT id FROM soli_users WHERE email = ANY(%s) OR email LIKE %s", (emails, f"%@{DEMO_DOMAIN}"))
    user_ids = [r[0] for r in cur.fetchall()]
    cur.execute("SELECT id FROM soli_tasks WHERE target_location = %s", (CITY,))
    task_ids = [r[0] for r in cur.fetchall()]
    if task_ids:
        cur.execute("DELETE FROM soli_chat_messages WHERE chat_session_id IN (SELECT id FROM soli_chat_sessions WHERE task_id = ANY(%s::uuid[]))", (task_ids,))
        cur.execute("DELETE FROM soli_chat_sessions WHERE task_id = ANY(%s::uuid[])", (task_ids,))
        cur.execute("DELETE FROM soli_task_notifications WHERE task_id = ANY(%s::uuid[])", (task_ids,))
        cur.execute("DELETE FROM soli_audit_logs WHERE entity_id = ANY(%s::uuid[])", (task_ids,))
        cur.execute("DELETE FROM soli_tasks WHERE id = ANY(%s::uuid[])", (task_ids,))
    if user_ids:
        cur.execute("DELETE FROM soli_transactions WHERE wallet_id IN (SELECT id FROM soli_wallets WHERE user_id = ANY(%s::uuid[]))", (user_ids,))
        cur.execute("DELETE FROM soli_wallets WHERE user_id = ANY(%s::uuid[])", (user_ids,))
        cur.execute("DELETE FROM soli_task_notifications WHERE volunteer_id = ANY(%s::uuid[])", (user_ids,))
        cur.execute("DELETE FROM soli_volunteer_service_categories WHERE volunteer_profile_id IN "
                    "(SELECT id FROM soli_volunteer_profiles WHERE user_id = ANY(%s::uuid[]))", (user_ids,))
        cur.execute("DELETE FROM soli_volunteer_profiles WHERE user_id = ANY(%s::uuid[])", (user_ids,))
        cur.execute("DELETE FROM soli_caregiver_relations WHERE caregiver_id = ANY(%s::uuid[]) OR beneficiary_id = ANY(%s::uuid[])", (user_ids, user_ids))
        cur.execute("DELETE FROM soli_users WHERE id = ANY(%s::uuid[])", (user_ids,))
    print(f"[cassino] Previous scenario removed: {len(task_ids)} tasks, {len(user_ids)} users")


def seed(conn):
    cur = conn.cursor()
    cleanup(cur)
    kc = Keycloak()

    def user(email, first, last, home, kc_login):
        uid = str(uuid4())
        kc_id = kc.create_user(email, email, first, last, TEST_PASSWORD) if kc_login else None
        created = NOW - timedelta(days=random.randint(40, 120))
        insert(cur, "soli_users", id=uid, keycloak_id=kc_id, email=email, first_name=first, last_name=last,
               fiscal_code=fiscal(), role="USER", certification_level=("LV1_SPID" if kc_login else "LV2_TRAINED"),
               status="ACTIVE", last_known_location=f"{home[0]:.5f},{home[1]:.5f}", created_at=created, updated_at=created)
        insert(cur, "soli_wallets", id=str(uuid4()), user_id=uid, balance=0, updated_at=NOW)
        return uid

    def profile(uid, home, categories, radius):
        pid = str(uuid4())
        insert(cur, "soli_volunteer_profiles", id=pid, user_id=uid,
               availability_schedule=Json({"mon": ["09:00-13:00"], "wed": ["15:00-19:00"], "sat": ["10:00-18:00"]}),
               constraints_json=Json({"noHeavyLifting": False, "petFriendly": True, "ownCar": False}),
               max_task_distance_meters=radius, target_location=CITY, latitude=home[0], longitude=home[1])
        for c in categories:
            insert(cur, "soli_volunteer_service_categories", volunteer_profile_id=pid, category=c)

    # ---- people -------------------------------------------------------------
    chiara = user(VOLUNTEER[0], VOLUNTEER[1], VOLUNTEER[2], VOLUNTEER[3], True)
    profile(chiara, VOLUNTEER[3], VOLUNTEER[4], VOLUNTEER[5])
    paolo = user(REQUESTER[0], REQUESTER[1], REQUESTER[2], REQUESTER[3], True)
    others = []
    for first, last, home, cats, radius in OTHER_VOLUNTEERS:
        uid = user(f"{first.lower()}.{last.lower()}@{DEMO_DOMAIN}", first, last, home, False)
        profile(uid, home, cats, radius)
        others.append(uid)
    maria = user(f"mariagrazia.dimambro@{DEMO_DOMAIN}", ELDERLY[0], ELDERLY[1], ELDERLY[2], False)
    insert(cur, "soli_caregiver_relations", id=str(uuid4()), caregiver_id=paolo, beneficiary_id=maria,
           relationship_type="figlio", created_at=NOW - timedelta(days=60))
    all_volunteers = [chiara] + others
    print(f"[cassino] Users: {VOLUNTEER[0]} (volontaria), {REQUESTER[0]} (richiedente), "
          f"{len(others)} volontari DB-only, 1 beneficiaria")

    # ---- tasks --------------------------------------------------------------
    def task(creator, beneficiary, category, title, desc, address, coords, urgency, status, created,
             volunteer=None, scheduled=None, accepted=None, check_in=None, check_out=None, credits=0):
        tid = str(uuid4())
        insert(cur, "soli_tasks", id=tid, creator_id=creator, beneficiary_id=beneficiary, volunteer_id=volunteer,
               category=category, title=title, description=desc, urgency_level=urgency,
               scheduled_at=scheduled, has_scheduled_time=scheduled is not None,
               target_location=CITY, target_address=address, latitude=coords[0], longitude=coords[1],
               status=status, reward_credits=credits,
               check_in_token=(token() if status in ("ACCEPTED", "IN_PROGRESS", "COMPLETED") else None),
               check_out_token=(token() if status in ("IN_PROGRESS", "COMPLETED") else None),
               check_in_at=check_in, check_out_at=check_out, accepted_at=accepted,
               creator_confirmed=(status == "COMPLETED"), volunteer_confirmed=(status == "COMPLETED"),
               created_at=created, updated_at=check_out or check_in or accepted or created)
        return tid

    def notify(tid, when, volunteers, accepted_by=None):
        for v in volunteers:
            status = "ACCEPTED" if v == accepted_by else ("PENDING" if accepted_by is None else "IGNORED")
            insert(cur, "soli_task_notifications", id=str(uuid4()), task_id=tid, volunteer_id=v, status=status,
                   notified_at=when + timedelta(minutes=2), responded_at=(when + timedelta(minutes=20) if v == accepted_by else None))

    def audit(tid, old, new, actor, ts):
        insert(cur, "soli_audit_logs", id=str(uuid4()), entity_type="TASK", entity_id=tid, action="STATUS_CHANGE",
               old_value=Json({"status": old}), new_value=Json({"status": new}), actor_id=actor, timestamp=ts)

    def chat(tid, lines, start):
        sid = str(uuid4())
        insert(cur, "soli_chat_sessions", id=sid, task_id=tid, is_active=True, created_at=start)
        for k, text in enumerate(lines):
            insert(cur, "soli_chat_messages", id=str(uuid4()), chat_session_id=sid,
                   sender_id=(chiara if k % 2 == 0 else paolo), content=text, is_flagged=False,
                   sent_at=start + timedelta(minutes=3 * (k + 1)))

    tomorrow = (NOW + timedelta(days=1)).replace(hour=10, minute=30, second=0)

    # 1. OPEN accompaniment: TPL-aware matching (requester view) + TPL card (volunteer view)
    created = NOW - timedelta(hours=2)
    t_open = task(paolo, maria, "MOBILITY", "Accompagnamento a visita cardiologica",
                  "Mia madre ha una visita cardiologica all'Ospedale Santa Scolastica. Serve qualcuno che la accompagni "
                  "in autobus e la aiuti durante l'attesa: cammina lentamente e preferisce mezzi con pedana.",
                  ELDERLY[3], ELDERLY[2], "HIGH", "OPEN", created, scheduled=tomorrow)
    notify(t_open, created, all_volunteers[:6])

    # 2. ACCEPTED accompaniment on LINEA 3 (affected by the protest in Via XX Settembre)
    created = NOW - timedelta(hours=5)
    accepted = created + timedelta(minutes=25)
    t_acc = task(paolo, maria, "MOBILITY", "Accompagnamento alle analisi del sangue in ospedale",
                 "Prelievo al centro analisi dell'Ospedale Santa Scolastica. Mia madre va accompagnata all'andata e al ritorno.",
                 "Piazza Aldo Moro 3, 03043 Cassino", (41.4866, 13.8252), "MEDIUM", "ACCEPTED", created,
                 volunteer=chiara, scheduled=(NOW + timedelta(minutes=90)).replace(second=0), accepted=accepted)
    notify(t_acc, created, all_volunteers[:4], accepted_by=chiara)
    audit(t_acc, "OPEN", "ACCEPTED", chiara, accepted)
    chat(t_acc, CHAT, accepted)

    # 3. IN_PROGRESS accompaniment on LINEA 1 (regular service)
    created = NOW - timedelta(hours=3)
    accepted = created + timedelta(minutes=15)
    check_in = NOW - timedelta(minutes=25)
    t_prog = task(others[0], others[0], "MOBILITY", "Accompagnamento in Università per iscrizione",
                  "Serve un accompagnamento al Campus Folcara per consegnare i documenti di iscrizione in segreteria.",
                  "Corso della Repubblica 118, 03043 Cassino", (41.4962, 13.8293), "LOW", "IN_PROGRESS", created,
                  volunteer=chiara, scheduled=(NOW - timedelta(minutes=30)).replace(second=0), accepted=accepted, check_in=check_in)
    audit(t_prog, "OPEN", "ACCEPTED", chiara, accepted)
    audit(t_prog, "ACCEPTED", "IN_PROGRESS", chiara, check_in)

    # 4. Other open tasks for the map
    extra = [
        (others[1], "SOCIAL", "Compagnia e passeggiata all'anfiteatro", "Un'ora di compagnia e una breve passeggiata nell'area archeologica.",
         "Via Montecassino 12, 03043 Cassino", (41.4898, 13.8163), "LOW"),
        (others[4], "DIGITAL", "Prenotazione visita sul portale ASL", "Aiuto per prenotare una visita specialistica online e stampare il promemoria.",
         "Piazza De Gasperi 8, 03043 Cassino", (41.4921, 13.8344), "MEDIUM"),
        (others[2], "PHYSICAL_SUPPORT", "Aiuto a portare la spesa al secondo piano", "Borse della spesa e casse d'acqua dal supermercato a casa.",
         "Via Casilina Nord 55, 03043 Cassino", (41.5030, 13.8322), "MEDIUM"),
        (others[6], "MOBILITY", "Accompagnamento in stazione per il treno per Roma", "Accompagnamento con valigia fino al binario della Stazione FS.",
         "Via San Pasquale 20, 03043 Cassino", (41.4795, 13.8281), "MEDIUM"),
    ]
    for creator, cat, title, desc, address, coords, urg in extra:
        created = NOW - timedelta(hours=random.randint(1, 20))
        tid = task(creator, creator, cat, title, desc, address, coords, urg, "OPEN", created,
                   scheduled=(NOW + timedelta(days=random.randint(1, 4))).replace(hour=random.choice([9, 11, 15, 16]), minute=0, second=0))
        notify(tid, created, [v for v in all_volunteers if v != creator][:3])

    # 5. Completed accompaniment history (admin analytics: demand by hour vs TPL crowding)
    history = [
        ("Accompagnamento a visita medica", "Visita di controllo all'Ospedale Santa Scolastica.", (41.4880, 13.8290)),
        ("Accompagnamento in Comune", "Rinnovo della carta d'identità all'ufficio anagrafe.", (41.4945, 13.8305)),
        ("Accompagnamento in stazione", "Accompagnamento al treno regionale con bagagli.", (41.4910, 13.8335)),
        ("Accompagnamento in farmacia e commissioni", "Commissioni in centro e ritiro farmaci.", (41.4870, 13.8200)),
        ("Accompagnamento a fisioterapia", "Seduta di fisioterapia all'ambulatorio dell'ospedale.", (41.4990, 13.8270)),
    ]
    completed = 0
    for i in range(18):
        title, desc, base = random.choice(history)
        coords = (base[0] + random.uniform(-0.002, 0.002), base[1] + random.uniform(-0.002, 0.002))
        day = NOW - timedelta(days=random.randint(2, 60))
        hour = random.choice([9, 9, 10, 10, 11, 15, 16, 16, 17])
        scheduled = day.replace(hour=hour, minute=random.choice([0, 15, 30, 45]), second=0)
        vol = chiara if i % 3 == 0 else random.choice(others[:5])
        creator = paolo if i % 2 == 0 else random.choice(others)
        if creator == vol:
            creator = paolo
        created = scheduled - timedelta(days=1)
        accepted = created + timedelta(minutes=40)
        check_in = scheduled
        check_out = scheduled + timedelta(minutes=random.randint(60, 120))
        credits = max(1, round((check_out - check_in).total_seconds() / 3600 * 6 * 1.2))
        tid = task(creator, maria if creator == paolo else creator, "MOBILITY", title, desc,
                   f"Cassino ({coords[0]:.4f}, {coords[1]:.4f})", coords, "MEDIUM", "COMPLETED", created,
                   volunteer=vol, scheduled=scheduled, accepted=accepted, check_in=check_in, check_out=check_out, credits=credits)
        audit(tid, "OPEN", "ACCEPTED", vol, accepted)
        audit(tid, "ACCEPTED", "IN_PROGRESS", vol, check_in)
        audit(tid, "IN_PROGRESS", "COMPLETED", vol, check_out)
        cur.execute("SELECT id FROM soli_wallets WHERE user_id = %s", (vol,))
        wid = cur.fetchone()[0]
        insert(cur, "soli_transactions", id=str(uuid4()), wallet_id=wid, amount=credits,
               transaction_type="EARN_TASK_REWARD", reference_id=tid, timestamp=check_out)
        cur.execute("UPDATE soli_wallets SET balance = balance + %s WHERE id = %s", (credits, wid))
        completed += 1

    conn.commit()
    cur.close()
    print(f"[cassino] Tasks: 1 open + 1 accepted + 1 in progress accompaniments, {len(extra)} other open, {completed} completed")


def main():
    conn = db_connect()
    try:
        seed(conn)
    finally:
        conn.close()
    print(f"[ok] Cassino scenario ready. Login (password {TEST_PASSWORD}):")
    print(f"     - {VOLUNTEER[0]}  volontaria (Folcara)  -> dashboard, task accettato, avvisi percorso")
    print(f"     - {REQUESTER[0]}  richiedente           -> task aperto, matching con TPL")
    print("     - admin@soli.it                        -> Statistiche > Mobilità territoriale")


if __name__ == "__main__":
    main()
