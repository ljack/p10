import aiosqlite
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "vet_clinic.db")

async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db

async def init_db():
    db = await get_db()
    try:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS pets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                species TEXT NOT NULL CHECK(species IN ('dog','cat','bird','rabbit','other')),
                breed TEXT,
                age_years REAL NOT NULL,
                owner_name TEXT NOT NULL,
                owner_phone TEXT NOT NULL,
                notes TEXT
            );

            CREATE TABLE IF NOT EXISTS treatments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                duration_minutes INTEGER NOT NULL,
                description TEXT,
                price REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS appointments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pet_id INTEGER NOT NULL,
                treatment_id INTEGER NOT NULL,
                scheduled_at TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'scheduled'
                    CHECK(status IN ('scheduled','in-progress','completed','cancelled')),
                notes TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
                FOREIGN KEY (treatment_id) REFERENCES treatments(id) ON DELETE CASCADE
            );
        """)

        # Seed treatments if table is empty
        cursor = await db.execute("SELECT COUNT(*) as cnt FROM treatments")
        row = await cursor.fetchone()
        if row[0] == 0:
            await db.executemany(
                "INSERT INTO treatments (name, duration_minutes, description, price) VALUES (?, ?, ?, ?)",
                [
                    ("Vaccination", 30, "Standard vaccination for common diseases", 45.00),
                    ("Dental Cleaning", 60, "Professional dental cleaning and examination", 120.00),
                    ("X-ray", 45, "Digital radiograph imaging", 85.00),
                    ("General Checkup", 30, "Routine health examination", 55.00),
                    ("Surgery Consultation", 45, "Pre-surgery evaluation and planning", 75.00),
                ],
            )
        await db.commit()
    finally:
        await db.close()
