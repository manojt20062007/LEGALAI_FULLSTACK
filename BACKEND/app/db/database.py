import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Engine configuration
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency for yielding database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables and run lightweight migrations if needed."""
    from app.db.models import Base, User
    Base.metadata.create_all(bind=engine)

    # Seed default admin user
    try:
        from sqlalchemy.orm import Session
        from app.core.security import get_password_hash
        with Session(engine) as session:
            admin = session.query(User).filter(User.email == "admin@legalai.com").first()
            if not admin:
                new_admin = User(
                    email="admin@legalai.com",
                    hashed_password=get_password_hash("admin123"),
                    role="admin"
                )
                session.add(new_admin)
                session.commit()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Failed to seed default admin: {e}")

    # ── SQLite auto-migration (add missing columns non-destructively) ────────
    if settings.DATABASE_URL.startswith("sqlite"):
        import sqlite3
        db_path = settings.DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")
        if os.path.exists(db_path):
            try:
                conn = sqlite3.connect(db_path)
                c = conn.cursor()
                c.execute("PRAGMA table_info(inspections);")
                existing_cols = {row[1] for row in c.fetchall()}
                if existing_cols:
                    _new_cols = [
                        ("image_paths",  "TEXT"),
                        ("image_urls",   "TEXT"),
                        ("product_name", "VARCHAR(256)"),
                        ("brand",        "VARCHAR(128)"),
                        ("user_id",      "VARCHAR(36)"),
                    ]
                    for col_name, col_type in _new_cols:
                        if col_name not in existing_cols:
                            c.execute(f"ALTER TABLE inspections ADD COLUMN {col_name} {col_type};")
                    conn.commit()
                conn.close()
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"SQLite auto-migration note: {e}")

    # ── PostgreSQL auto-migration (idempotent ALTER TABLE … IF NOT EXISTS) ──
    elif "postgresql" in settings.DATABASE_URL or "postgres" in settings.DATABASE_URL:
        try:
            with engine.connect() as conn:
                from sqlalchemy import text
                _pg_cols = [
                    ("product_name", "VARCHAR(256)"),
                    ("brand",        "VARCHAR(128)"),
                    ("user_id",      "VARCHAR(36)"),
                ]
                for col_name, col_type in _pg_cols:
                    conn.execute(
                        text(f"ALTER TABLE inspections ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                    )
                conn.commit()
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"PostgreSQL auto-migration note: {e}")

