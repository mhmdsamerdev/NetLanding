import argparse
import json
import os
import signal
import socket
import sys
import threading
import time
import webbrowser

from . import __version__
from .database import DATA_DIR

PID_FILE = DATA_DIR / "netlanding.pid"


def _parse_args(argv=None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="netlanding",
        description="NetLanding - a locally hosted income tracker for freelancers.",
    )
    parser.add_argument("--host", default="127.0.0.1", help="host to bind (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="port to listen on (default: 8000)")
    parser.add_argument("--no-browser", action="store_true", help="do not open the browser")
    parser.add_argument("--log", action="store_true", help="show debug output (server logs and request access log)")
    parser.add_argument("--version", action="version", version=f"netlanding {__version__}")
    sub = parser.add_subparsers(dest="command", metavar="{stop,backup,backups,export}")
    sub.add_parser("stop", help="stop the running server")
    sub.add_parser("backup", help="create a database snapshot now")
    sub.add_parser("backups", help="list database snapshots")
    exp = sub.add_parser("export", help="export data to a file")
    exp.add_argument("--format", choices=["json", "csv"], default="json")
    exp.add_argument("-o", "--output", help="output path (default: ./netlanding-<date>.<ext>)")
    return parser.parse_args(argv)


# ── Running-instance tracking ───────────────────────────────────────────────
def _pid_alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    except OSError:
        return False
    return True


def _read_instance():
    """Return {'pid','host','port'} of a live instance, or None (cleans stale files)."""
    try:
        info = json.loads(PID_FILE.read_text())
        if _pid_alive(int(info["pid"])):
            return info
    except (OSError, ValueError, KeyError, TypeError):
        pass
    PID_FILE.unlink(missing_ok=True)
    return None


def _port_in_use(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        return s.connect_ex((host, port)) == 0


def _open_browser_when_ready(host: str, port: int) -> None:
    def _run():
        for _ in range(100):
            if _port_in_use(host, port):
                break
            time.sleep(0.1)
        else:
            return
        try:
            webbrowser.open(f"http://{host}:{port}")
        except Exception:  # noqa: BLE001
            pass

    threading.Thread(target=_run, daemon=True).start()


# ── Commands ────────────────────────────────────────────────────────────────
def _stop() -> int:
    info = _read_instance()
    if not info:
        print("NetLanding is not running.")
        return 0
    pid = int(info["pid"])
    try:
        os.kill(pid, signal.SIGTERM)
    except OSError as exc:
        print(f"netlanding: could not stop process {pid}: {exc}", file=sys.stderr)
        return 1
    for _ in range(50):
        if not _pid_alive(pid):
            break
        time.sleep(0.1)
    else:
        print(f"netlanding: process {pid} did not exit in time", file=sys.stderr)
        return 1
    PID_FILE.unlink(missing_ok=True)
    print("NetLanding stopped.")
    return 0


def _backup() -> int:
    from . import backup

    try:
        path = backup.create_snapshot("manual")
    except RuntimeError as exc:
        print(f"netlanding: {exc}", file=sys.stderr)
        return 1
    backup.prune()
    print(f"Snapshot saved: {path}")
    return 0


def _backups() -> int:
    from . import backup

    print(f"Backups in {backup.backups_dir()}")
    for s in backup.list_snapshots():
        print(f"  {s['name']}  {s['size'] / 1024:.0f} KiB")
    return 0


def _export(args) -> int:
    from datetime import date
    from pathlib import Path

    from . import export, models
    from .database import SessionLocal, engine

    models.Base.metadata.create_all(bind=engine)
    out = Path(args.output or f"netlanding-{date.today():%Y%m%d}.{args.format}")
    with SessionLocal() as db:
        if args.format == "json":
            out.write_text(json.dumps(export.export_json(db), indent=2, ensure_ascii=False), encoding="utf-8")
        else:
            out.write_text(export.export_entries_csv(db), encoding="utf-8-sig", newline="")
    print(f"Exported to {out}")
    return 0


def _start(args) -> int:
    if not 1 <= args.port <= 65535:
        print(f"netlanding: invalid port {args.port}", file=sys.stderr)
        return 2

    running = _read_instance()
    if running:
        url = f"http://{running['host']}:{running['port']}"
        print(f"NetLanding is already running at {url}")
        if not args.no_browser:
            webbrowser.open(url)
        return 0

    if _port_in_use(args.host, args.port):
        print(f"netlanding: {args.host}:{args.port} is already in use (try --port)", file=sys.stderr)
        return 1

    import uvicorn

    url = f"http://{args.host}:{args.port}"
    print(f"NetLanding {__version__} running at {url}  (Ctrl+C or `netlanding stop` to stop)")

    PID_FILE.write_text(json.dumps({"pid": os.getpid(), "host": args.host, "port": args.port}))
    if not args.no_browser:
        _open_browser_when_ready(args.host, args.port)

    try:
        uvicorn.run(
            "netlanding.main:app",
            host=args.host,
            port=args.port,
            reload=False,
            log_level="debug" if args.log else "critical",
            access_log=args.log,
        )
    except KeyboardInterrupt:
        pass
    except Exception as exc:  # noqa: BLE001
        if args.log:
            raise
        print(f"netlanding: {exc} (run with --log for details)", file=sys.stderr)
        return 1
    finally:
        PID_FILE.unlink(missing_ok=True)

    print("Stopped.")
    return 0


def main(argv=None) -> int:
    args = _parse_args(argv)
    if args.command == "stop":
        return _stop()
    if args.command == "backup":
        return _backup()
    if args.command == "backups":
        return _backups()
    if args.command == "export":
        return _export(args)
    return _start(args)


if __name__ == "__main__":
    sys.exit(main())
