import sqlite3
import json
from pathlib import Path

DB_PATH = Path(__file__).parent / "loop.db"

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn()
    cur = conn.cursor()

    cur.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            username    TEXT    UNIQUE,
            city        TEXT    NOT NULL DEFAULT 'Bengaluru',
            email       TEXT    UNIQUE,
            password    TEXT,
            is_verified INTEGER DEFAULT 0,
            bio         TEXT    DEFAULT '',
            avatar_url  TEXT    DEFAULT '',
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS otp_store (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            email       TEXT    NOT NULL,
            otp         TEXT    NOT NULL,
            expires_at  TEXT    NOT NULL,
            used        INTEGER DEFAULT 0,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL,
            token       TEXT    NOT NULL UNIQUE,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL,
            date        TEXT,
            merchant    TEXT,
            amount      REAL,
            category    TEXT,
            co2_kg      REAL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS loop_scores (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL UNIQUE,
            score       INTEGER DEFAULT 0,
            personality TEXT    DEFAULT 'Explorer',
            total_co2   REAL    DEFAULT 0,
            updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS circles (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            code        TEXT    NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS circle_members (
            circle_id   INTEGER NOT NULL,
            user_id     INTEGER NOT NULL,
            PRIMARY KEY (circle_id, user_id),
            FOREIGN KEY (circle_id) REFERENCES circles(id),
            FOREIGN KEY (user_id)   REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS rank_streaks (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            circle_id       INTEGER NOT NULL,
            user_id         INTEGER NOT NULL,
            streak_days     INTEGER DEFAULT 1,
            streak_start    DATE    DEFAULT (date('now')),
            last_checked    DATE    DEFAULT (date('now')),
            reward_earned   INTEGER DEFAULT 0,
            reward_date     DATE,
            UNIQUE(circle_id, user_id),
            FOREIGN KEY (circle_id) REFERENCES circles(id),
            FOREIGN KEY (user_id)   REFERENCES users(id)
        );
    """)

    # Seed demo peer users and city circles if not already present
    existing = cur.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    if existing == 0:

        # One circle per city with unique name and code
        CITY_CIRCLES = {
            "Bengaluru":  ("Bengaluru Green Squad",      "BGS2026"),
            "Mumbai":     ("Mumbai Climate Collective",  "MCC2026"),
            "Delhi":      ("Delhi Carbon Cutters",       "DCC2026"),
            "Chennai":    ("Chennai Eco Circle",         "CEC2026"),
            "Hyderabad":  ("Hyderabad Green Brigade",    "HGB2026"),
            "Pune":       ("Pune Zero Heroes",           "PZH2026"),
            "Kolkata":    ("Kolkata Climate Crew",       "KCC2026"),
            "Ahmedabad":  ("Ahmedabad Green Force",      "AGF2026"),
        }

        city_circle_ids = {}
        for city, (name, code) in CITY_CIRCLES.items():
            cur.execute("INSERT INTO circles (name, code) VALUES (?, ?)", (name, code))
            city_circle_ids[city] = cur.lastrowid

        # Seed 3 demo peers per city so every circle has members
        demo_peers = [
            # Bengaluru
            ("Priya Sharma",    "Bengaluru", 720, "Conscious Optimizer", 18.4),
            ("Arjun Mehta",     "Bengaluru", 610, "Mindful Consumer",    24.1),
            ("Rahul Verma",     "Bengaluru", 480, "Convenience Consumer",31.7),
            # Mumbai
            ("Neha Kapoor",     "Mumbai",    680, "Mindful Consumer",    20.8),
            ("Rohit Sharma",    "Mumbai",    520, "Convenience Consumer",28.4),
            ("Aisha Khan",      "Mumbai",    390, "Habitual Spender",    37.9),
            # Delhi
            ("Vikram Singh",    "Delhi",     540, "Convenience Consumer",27.2),
            ("Pooja Gupta",     "Delhi",     430, "Habitual Spender",    35.1),
            ("Amit Joshi",      "Delhi",     310, "Carbon Heavy",        44.6),
            # Chennai
            ("Kavya Rajan",     "Chennai",   750, "Conscious Optimizer", 16.9),
            ("Suresh Kumar",    "Chennai",   600, "Mindful Consumer",    23.5),
            ("Divya Menon",     "Chennai",   470, "Convenience Consumer",30.8),
            # Hyderabad
            ("Sai Reddy",       "Hyderabad", 690, "Mindful Consumer",    19.6),
            ("Ananya Rao",      "Hyderabad", 550, "Convenience Consumer",26.3),
            ("Kiran Babu",      "Hyderabad", 400, "Habitual Spender",    36.7),
            # Pune
            ("Shreya Desai",    "Pune",      770, "Conscious Optimizer", 15.2),
            ("Ravi Kulkarni",   "Pune",      630, "Mindful Consumer",    22.1),
            ("Meera Joshi",     "Pune",      490, "Convenience Consumer",29.5),
            # Kolkata
            ("Subhadeep Das",   "Kolkata",   580, "Mindful Consumer",    25.0),
            ("Rina Chatterjee", "Kolkata",   450, "Convenience Consumer",32.4),
            ("Debashis Roy",    "Kolkata",   330, "Habitual Spender",    41.8),
            # Ahmedabad
            ("Hetal Shah",      "Ahmedabad", 710, "Conscious Optimizer", 17.7),
            ("Niral Patel",     "Ahmedabad", 560, "Mindful Consumer",    25.9),
            ("Foram Modi",      "Ahmedabad", 420, "Habitual Spender",    34.3),
        ]

        for name, city, score, personality, total_co2 in demo_peers:
            cur.execute(
                "INSERT INTO users (name, city) VALUES (?, ?)", (name, city)
            )
            uid = cur.lastrowid
            cur.execute(
                "INSERT INTO loop_scores (user_id, score, personality, total_co2) VALUES (?,?,?,?)",
                (uid, score, personality, total_co2)
            )
            # Join city circle
            circle_id = city_circle_ids.get(city)
            if circle_id:
                cur.execute(
                    "INSERT OR IGNORE INTO circle_members (circle_id, user_id) VALUES (?,?)",
                    (circle_id, uid)
                )

    conn.commit()
    conn.close()

def migrate_db():
    """Add new columns to existing databases without breaking anything."""
    conn = get_conn()
    cur  = conn.cursor()
    existing_cols = {row[1] for row in cur.execute("PRAGMA table_info(users)").fetchall()}
    if "bio" not in existing_cols:
        cur.execute("ALTER TABLE users ADD COLUMN bio TEXT DEFAULT ''")
    if "avatar_url" not in existing_cols:
        cur.execute("ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT ''")

    # Add cumulative_co2 to loop_scores for milestone tracking
    loop_scores_cols = {row[1] for row in cur.execute("PRAGMA table_info(loop_scores)").fetchall()}
    if "cumulative_co2" not in loop_scores_cols:
        cur.execute("ALTER TABLE loop_scores ADD COLUMN cumulative_co2 REAL DEFAULT 0")
        # Initialize cumulative from existing total_co2
        cur.execute("UPDATE loop_scores SET cumulative_co2 = total_co2 WHERE cumulative_co2 = 0 OR cumulative_co2 IS NULL")

    # Create user_milestones table for tracking unlocked milestones
    cur.execute("""
        CREATE TABLE IF NOT EXISTS user_milestones (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         INTEGER NOT NULL,
            milestone_id    TEXT    NOT NULL,
            unlocked_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
            notified        INTEGER DEFAULT 0,
            UNIQUE(user_id, milestone_id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # Create csv_uploads table to prevent duplicate uploads
    cur.execute("""
        CREATE TABLE IF NOT EXISTS csv_uploads (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         INTEGER NOT NULL,
            file_hash       TEXT    NOT NULL,
            filename        TEXT,
            total_co2       REAL,
            transaction_count INTEGER,
            uploaded_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, file_hash),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # Auto-join verified users to their city circle if they're not already in one
    verified_users = cur.execute(
        "SELECT id, city FROM users WHERE is_verified = 1 AND email IS NOT NULL"
    ).fetchall()
    for user in verified_users:
        already_in = cur.execute(
            "SELECT 1 FROM circle_members WHERE user_id = ?", (user["id"],)
        ).fetchone()
        if not already_in:
            circle = cur.execute(
                "SELECT id FROM circles WHERE LOWER(name) LIKE LOWER(?) LIMIT 1",
                (f"%{user['city']}%",)
            ).fetchone()
            if circle:
                cur.execute(
                    "INSERT OR IGNORE INTO circle_members (circle_id, user_id) VALUES (?, ?)",
                    (circle["id"], user["id"])
                )

    conn.commit()
    conn.close()

def get_city_circle_id(city: str, cur) -> int | None:
    """Return the circle id for a given city, or None if not found."""
    row = cur.execute(
        """SELECT c.id FROM circles c
           WHERE LOWER(c.name) LIKE LOWER(?)
           OR c.code IN (
             SELECT code FROM circles
             WHERE LOWER(name) LIKE LOWER(?)
           )
           LIMIT 1""",
        (f"%{city}%", f"%{city}%")
    ).fetchone()
    return row["id"] if row else None
