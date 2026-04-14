"""iShares scraper placeholder.

Implement provider-specific page fetching/parsing here.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional, Sequence


@dataclass
class ISharesPageResult:
    url: str
    ok: bool
    symbol: Optional[str] = None
    as_of_date: Optional[str] = None
    rows: List[List[str]] = field(default_factory=list)
    error: Optional[str] = None


class ISharesScraper:
    """Placeholder scraper for iShares pages."""

    def scrape_url(self, url: str) -> ISharesPageResult:
        return ISharesPageResult(url=url, ok=False, error="Not implemented yet")

    def scrape_urls(self, urls: Sequence[str]) -> List[ISharesPageResult]:
        return [self.scrape_url(u) for u in urls]
