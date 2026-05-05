from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.parse import urlparse, urlunparse

from model.page_result import PageResult


def normalize_cache_url(url: str) -> str:
    """Stable key for the shared holdings JSON (scheme/host/path, lower host, trimmed slash)."""
    u = (url or "").strip()
    if not u:
        return u
    p = urlparse(u)
    path = (p.path or "/").rstrip("/") or "/"
    netloc = (p.netloc or "").lower()
    scheme = (p.scheme or "https").lower()
    return urlunparse((scheme, netloc, path, "", "", ""))


def default_holdings_cache_path() -> Path:
    return Path(__file__).resolve().parent / "data" / "holdings_cache.json"


def resolve_holdings_cache_path() -> Path:
    raw = os.environ.get("HOLDINGS_CACHE_PATH", "").strip()
    if raw:
        return Path(raw).expanduser()
    return default_holdings_cache_path()


class HoldingsCache:
    """
    Single on-disk JSON shared by all providers. Structure:
      { "schema_version": 1, "providers": { "<bundle_key>": { "<normalized_url>": { ... } } } }
    Each fund entry: as_of_date, etf_code, cached_at, rows (table as list of lists).
    """

    def __init__(self, path: Optional[Path] = None, *, data: Optional[Dict[str, Any]] = None):
        self.path = path or resolve_holdings_cache_path()
        self._data: Dict[str, Any] = data if data is not None else {"schema_version": 1, "providers": {}}

    @classmethod
    def load(cls, path: Optional[Path] = None) -> HoldingsCache:
        p = path or resolve_holdings_cache_path()
        if not p.is_file():
            return cls(path=p, data={"schema_version": 1, "providers": {}})
        try:
            raw = p.read_text(encoding="utf-8")
            data = json.loads(raw)
        except (json.JSONDecodeError, OSError):
            data = {"schema_version": 1, "providers": {}}
        if not isinstance(data, dict):
            data = {"schema_version": 1, "providers": {}}
        data.setdefault("schema_version", 1)
        prov = data.get("providers")
        if not isinstance(prov, dict):
            data["providers"] = {}
        return cls(path=p, data=data)

    def get(self, bundle_provider_key: str, normalized_url: str) -> Optional[Dict[str, Any]]:
        prov = self._data.get("providers") or {}
        per = prov.get(bundle_provider_key)
        if not isinstance(per, dict):
            return None
        entry = per.get(normalized_url)
        return entry if isinstance(entry, dict) else None

    def set_from_page_result(self, bundle_provider_key: str, normalized_url: str, r: PageResult) -> Optional[str]:
        if not r.ok or not r.rows:
            return None
        now_iso = datetime.now(timezone.utc).isoformat()
        prov = self._data.setdefault("providers", {})
        per = prov.setdefault(bundle_provider_key, {})
        per[normalized_url] = {
            "as_of_date": r.as_of_date or "",
            "etf_code": r.etf_code or "",
            "cached_at": now_iso,
            "rows": r.rows,
        }
        return now_iso

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        text = json.dumps(self._data, ensure_ascii=False, indent=2) + "\n"
        tmp = self.path.with_suffix(self.path.suffix + ".tmp")
        tmp.write_text(text, encoding="utf-8")
        tmp.replace(self.path)


def holdings_cache_enabled() -> bool:
    return os.environ.get("HOLDINGS_CACHE_ENABLED", "1").strip().lower() not in (
        "0",
        "false",
        "no",
        "off",
    )
