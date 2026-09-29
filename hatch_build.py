"""Hatchling build hook: make sure the bundled frontend is up to date before packaging."""

import importlib.util
from pathlib import Path

from hatchling.builders.hooks.plugin.interface import BuildHookInterface


def _load_frontend_build(root: str):
    path = Path(root) / "src" / "netlanding" / "frontend_build.py"
    spec = importlib.util.spec_from_file_location("_netlanding_frontend_build", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class FrontendBuildHook(BuildHookInterface):
    PLUGIN_NAME = "custom"

    def initialize(self, version, build_data):
        # No frontend/ (e.g. wheel built from the sdist) -> ensure() is a no-op.
        _load_frontend_build(self.root).ensure(strict=True)
