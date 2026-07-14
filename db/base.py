from core.config import settings

def get_connection():
    if "sqlite" in settings.DATABASE_URL:
        import sqlite3
        db_path = settings.DATABASE_URL.replace("sqlite:///", "")
        conn = sqlite3.connect(db_path)
        def dict_factory(cursor, row):
            d = {}
            for idx, col in enumerate(cursor.description):
                d[col[0]] = row[idx]
            return d
        conn.row_factory = dict_factory
        return conn
    else:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        return psycopg2.connect(settings.DATABASE_URL, cursor_factory=RealDictCursor)

