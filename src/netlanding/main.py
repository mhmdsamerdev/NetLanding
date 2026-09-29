import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .database import engine
from . import models, backup, migrations, __version__
from .routers import entries, sources, banks, settings, dashboard, data

STATIC_DIR = Path(__file__).parent / "static"

models.Base.metadata.create_all(bind=engine)
migrations.migrate(engine)

log = logging.getLogger("netlanding")


def _safe(fn, *args):
    try:
        fn(*args)
    except Exception:  # noqa: BLE001 - backups must never take the app down
        log.exception("backup failed")


async def _backup_loop():
    while True:
        await asyncio.to_thread(_safe, backup.snapshot_if_due)
        await asyncio.sleep(3600)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    task = asyncio.create_task(_backup_loop())
    yield
    task.cancel()
    await asyncio.to_thread(_safe, backup.create_snapshot, "shutdown")
    await asyncio.to_thread(_safe, backup.prune)


app = FastAPI(title="NetLanding API", version=__version__, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(entries.router)
app.include_router(sources.router)
app.include_router(banks.router)
app.include_router(settings.router)
app.include_router(dashboard.router)
app.include_router(data.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Serve bundled React frontend (present only in installed/packaged builds)
# ---------------------------------------------------------------------------
if STATIC_DIR.is_dir() and (STATIC_DIR / "index.html").exists():
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/", include_in_schema=False)
    async def serve_root():
        return FileResponse(STATIC_DIR / "index.html")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        candidate = (STATIC_DIR / full_path).resolve()
        if candidate.is_relative_to(STATIC_DIR.resolve()) and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")
