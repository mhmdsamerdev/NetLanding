import pytest

from netlanding import frontend_build as fb


@pytest.fixture
def tree(tmp_path, monkeypatch):
    root = tmp_path / "frontend"
    (root / "src").mkdir(parents=True)
    (root / "src" / "App.tsx").write_text("a")
    (root / "package.json").write_text("{}")
    static = tmp_path / "static"
    static.mkdir()
    (static / "index.html").write_text("<html>")
    monkeypatch.setattr(fb, "FRONTEND_DIR", root)
    monkeypatch.setattr(fb, "STATIC_DIR", static)
    return root, static


def test_hash_changes_with_source(tree):
    root, _ = tree
    before = fb.compute_hash(root)
    (root / "src" / "App.tsx").write_text("b")
    assert fb.compute_hash(root) != before


def test_stale_without_stamp_then_fresh(tree):
    root, static = tree
    assert fb.is_stale(root, static)
    (static / fb.STAMP_NAME).write_text(fb.compute_hash(root))
    assert not fb.is_stale(root, static)
    (root / "src" / "App.tsx").write_text("changed")
    assert fb.is_stale(root, static)


def test_ensure_noop_without_frontend(tree, monkeypatch):
    monkeypatch.setattr(fb, "FRONTEND_DIR", tree[0] / "missing")
    monkeypatch.setattr(fb, "build", lambda *a: pytest.fail("should not build"))
    assert fb.ensure(strict=True) is False


def test_ensure_builds_only_when_stale(tree, monkeypatch):
    root, static = tree
    calls = []

    def fake_build(r=None, s=None):
        calls.append(1)
        (static / fb.STAMP_NAME).write_text(fb.compute_hash(root))

    monkeypatch.setattr(fb, "build", fake_build)
    assert fb.ensure() is True
    assert fb.ensure() is False
    assert len(calls) == 1


def test_ensure_failure_strict_vs_lenient(tree, monkeypatch):
    def boom(*a):
        raise RuntimeError("no npm")

    monkeypatch.setattr(fb, "build", boom)
    assert fb.ensure(strict=False) is False
    with pytest.raises(RuntimeError):
        fb.ensure(strict=True)
