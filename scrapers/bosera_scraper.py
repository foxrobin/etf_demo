"""Bosera scraper placeholder.

Implement provider-specific page fetching/parsing here.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional, Sequence


@dataclass
class BoseraPageResult:
    url: str
    ok: bool
    symbol: Optional[str] = None
    as_of_date: Optional[str] = None
    rows: List[List[str]] = field(default_factory=list)
    error: Optional[str] = None


class BoseraScraper:
    """Placeholder scraper for Bosera pages."""

    def scrape_url(self, url: str) -> BoseraPageResult:
        return BoseraPageResult(url=url, ok=False, error="Not implemented yet")

    def scrape_urls(self, urls: Sequence[str]) -> List[BoseraPageResult]:
        return [self.scrape_url(u) for u in urls]
