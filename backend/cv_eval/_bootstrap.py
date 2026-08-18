"""Import bootstrap for the vendored core pipeline.

The reference pipeline (``cv_eval/core``) was written as a flat, repo-root
script: its modules import each other by bare name (``from models import
JSONResume``) and assume the working directory is the repo root. To reuse it
inside a package without rewriting every import, we put the ``core`` directory
on ``sys.path``. This is the one place that knows about the core's layout.
"""

from __future__ import annotations

import os
import sys

_CORE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "core")


def ensure_core_on_path() -> str:
    """Ensure the vendored core directory is importable. Returns its path."""
    if _CORE_DIR not in sys.path:
        sys.path.insert(0, _CORE_DIR)
    return _CORE_DIR
