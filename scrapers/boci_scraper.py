from __future__ import annotations

from typing import List, Sequence

from model.page_result import PageResult


class BOCIScraper:
    """Placeholder scraper for BOCI pages."""

    def scrape_url(self, url: str) -> PageResult:
        return PageResult(url=url, ok=False, error="Not implemented yet")

    def scrape_urls(self, urls: Sequence[str]) -> List[PageResult]:
        return [self.scrape_url(u) for u in urls]
