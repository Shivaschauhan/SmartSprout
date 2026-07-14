"""One-shot SQLite/Postgres column add for food catalog extension."""
from sqlalchemy import text
from db.session import engine

STMTS = [
    "ALTER TABLE food_items ADD COLUMN category VARCHAR(32) DEFAULT 'food'",
    "ALTER TABLE food_items ADD COLUMN is_drink BOOLEAN DEFAULT 0",
    "ALTER TABLE food_items ADD COLUMN source VARCHAR(32) DEFAULT 'system'",
    "ALTER TABLE food_items ADD COLUMN user_id INTEGER",
    "ALTER TABLE food_items ADD COLUMN brand TEXT",
    "ALTER TABLE food_items ADD COLUMN description TEXT",
    "ALTER TABLE food_items ADD COLUMN serving_label TEXT",
    "ALTER TABLE food_logs ADD COLUMN meal_name TEXT",
]

def main():
    with engine.begin() as conn:
        for s in STMTS:
            try:
                conn.execute(text(s))
                print("OK:", s)
            except Exception as e:
                print("SKIP:", s, "->", e)
    print("Migration complete.")

if __name__ == "__main__":
    main()
