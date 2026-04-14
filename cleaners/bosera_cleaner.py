"""Bosera cleaner placeholder.

Implement provider-specific normalization into API-ready JSON structure.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List


def build_bosera_bundle(results: List[Any], *, schema_version: int = 1) -> Dict[str, Any]:
    return {
        "schema_version": schema_version,
        "provider": "bosera",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "funds": [],
        "errors": [
            {"url": getattr(r, "url", ""), "error": getattr(r, "error", "Not implemented yet")}
            for r in results
        ],
    }
