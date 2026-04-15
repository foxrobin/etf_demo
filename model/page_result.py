from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class PageResult:
    """One fund page URL: parsed table rows or an error."""

    url: str
    ok: bool
    etf_code: Optional[str] = None  # JSON output uses key "etfCode"
    as_of_date: Optional[str] = None
    rows: List[List[str]] = field(default_factory=list)
    error: Optional[str] = None
