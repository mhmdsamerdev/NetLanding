"""Keep ``static/`` (the compiled React UI) in sync with ``frontend/``.

Stdlib-only on purpose: the hatchling build hook loads this file by path.
In an installed package there is no ``frontend/`` directory, so every check
is a silent no-op.
"""

import hashlib
import shutil
import subprocess
import sys
from pathlib import Path

PACKAGE_DIR = Path(__file__).resolve().parent
STATIC_DIR = PACKAGE_DIR / "static"
FRONTEND_DIR = PACKAGE_DIR.parent.parent / "frontend"
STAMP_NAME = ".frontend-hash"

_INPUT_FILES = ("index.html", "package.json", "package-lock.json", "vite.config.ts")
_INPUT_GLOBS = ("tsconfig*.json",)
_INPUT_DIRS = ("src", "public")


def frontend_dir() -> Path | None:
    return FRONTEND_DIR if (FRONTEND_DIR / "package.json").is_file() else None


def _input_paths(root: Path) -> list[Path]:
    paths = [root / name for name in _INPUT_FILES]
    for pattern in _INPUT_GLOBS:
        paths.extend(root.glob(pattern))
    for name in _INPUT_DIRS:
        paths.extend(p for p in (root / name).rglob("*") if p.is_file())
    return sorted(p for p in paths if p.is_file())


def compute_hash(root: Path | None = None) -> str:
    root = root or FRONTEND_DIR
    digest = hashlib.sha256()
    for path in _input_paths(root):
        digest.update(path.relative_to(root).as_posix().encode())
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()


def is_stale(root: Path | None = None, static: Path | None = None) -> bool:
    root = root or FRONTEND_DIR
    static = static or STATIC_DIR
    stamp = static / STAMP_NAME
    if not (static / "index.html").is_file() or not stamp.is_file():
        return True
    return stamp.read_text().strip() != compute_hash(root)


def build(root: Path | None = None, static: Path | None = None) -> None:
    root = root or FRONTEND_DIR
    static = static or STATIC_DIR
    npm = shutil.which("npm")
    if not npm:
        raise RuntimeError("npm not found - install Node 18+ to build the frontend")
    try:
        if not (root / "node_modules").is_dir():
            subprocess.run([npm, "ci" if (root / "package-lock.json").is_file() else "install"], cwd=root, check=True)
        subprocess.run([npm, "run", "build"], cwd=root, check=True)
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(f"frontend build failed ({' '.join(map(str, exc.cmd))} exited {exc.returncode})") from exc
    # written after the build: vite empties the output dir first
    (static / STAMP_NAME).write_text(compute_hash(root) + "\n")


def ensure(strict: bool = False) -> bool:
    """Rebuild the frontend if it is out of date. Returns True if a rebuild ran.

    strict=False: on failure warn and carry on with the existing build.
    strict=True: on failure raise RuntimeError.
    """
    root = frontend_dir()
    if root is None or not is_stale(root):
        return False
    print("netlanding: frontend is out of date, rebuilding...", file=sys.stderr, flush=True)
    try:
        build(root)
    except RuntimeError as exc:
        if strict:
            raise
        print(f"netlanding: warning: {exc}; using the existing build", file=sys.stderr)
        return False
    return True
