"""Ping An scraper placeholder.

Implement provider-specific page fetching/parsing here.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional, Sequence


@dataclass
class PingAnPageResult:
    url: str
    ok: bool
    symbol: Optional[str] = None
    as_of_date: Optional[str] = None
    rows: List[List[str]] = field(default_factory=list)
    error: Optional[str] = None


class PingAnScraper:
    """Placeholder scraper for Ping An pages."""

    def scrape_url(self, url: str) -> PingAnPageResult:
        return PingAnPageResult(url=url, ok=False, error="Not implemented yet")

    def scrape_urls(self, urls: Sequence[str]) -> List[PingAnPageResult]:
        return [self.scrape_url(u) for u in urls]
