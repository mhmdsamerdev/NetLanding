from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os
from pathlib import Path

# ── Locally-saved Data root ──────────────────────────────────────────────────────────────────
DATA_DIR: Path = Path(
    os.environ.get("NETLANDING_DATA_DIR", Path.home() / ".netlanding")
).expanduser().resolve()

DATA_DIR.mkdir(parents=True, exist_ok=True)

# ── Database ───────────────────────────────────────────────────────────────────
SQLALCHEMY_DATABASE_URL: str = os.environ.get(
    "NETLANDING_DB_URL",
    f"sqlite:///{DATA_DIR / 'netlanding.db'}",
)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
