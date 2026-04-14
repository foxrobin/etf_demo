"""
Global X Hong Kong fund pages: fetch HTML and parse the daily holdings table.

The site's CSV button builds a file in the browser from #holdingsList; we mirror
that by parsing the same table server-side.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Sequence
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup


def _clean_text(text: str) -> str:
    return " ".join(text.replace("\xa0", " ").split())


def _parse_holdings_table(html: str) -> List[List[str]]:
    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table", id="holdingsList") or soup.find("table", id="top-ten")
    if table is None:
        raise ValueError("Cannot find holdings table. Page structure may have changed.")

    rows: List[List[str]] = []

    thead = table.find("thead")
    if thead:
        header_cells = thead.find_all(["th", "td"])
        header = [_clean_text(c.get_text()) for c in header_cells]
        if header:
            rows.append(header)

    tbody = table.find("tbody")
    if not tbody:
        raise ValueError("Cannot find holdings table body (tbody).")

    for tr in tbody.find_all("tr"):
        cells = tr.find_all(["td", "th"])
        row = [_clean_text(c.get_text()) for c in cells]
        if any(row):
            rows.append(row)

    if len(rows) <= 1:
        raise ValueError("Table found, but no data rows were parsed.")

    return rows


def _infer_symbol_and_date(html: str, url: str) -> tuple[str, str]:
    match = re.search(r'downloadLink\.download\s*=\s*"([^"]+)"', html)
    if match:
        filename = match.group(1)
        symbol = filename.split("_")[0]
        date_match = re.search(r"(20\d{6})", filename)
        if date_match:
            return symbol, date_match.group(1)
        return symbol, datetime.now().strftime("%Y%m%d")

    slug = urlparse(url).path.strip("/").split("/")[-1] or "globalx_fund"
    return slug, datetime.now().strftime("%Y%m%d")


@dataclass
class GlobalXPageResult:
    """One fund page: either parsed rows or an error message."""

    url: str
    ok: bool
    symbol: Optional[str] = None
    as_of_date: Optional[str] = None  # YYYYMMDD from page JS filename when present
    rows: List[List[str]] = field(default_factory=list)
    error: Optional[str] = None


class GlobalXScraper:
    """Fetches Global X HK fund URLs and returns holdings table rows per page."""

    def __init__(self, timeout: int = 30, session: Optional[requests.Session] = None):
        self.timeout = timeout
        self.session = session or requests.Session()

    def scrape_url(self, url: str) -> GlobalXPageResult:
        try:
            resp = self.session.get(url, timeout=self.timeout)
            resp.raise_for_status()
            html = resp.text
            rows = _parse_holdings_table(html)
            symbol, as_of = _infer_symbol_and_date(html, url)
            return GlobalXPageResult(
                url=url,
                ok=True,
                symbol=symbol,
                as_of_date=as_of,
                rows=rows,
            )
        except Exception as e:
            return GlobalXPageResult(url=url, ok=False, error=str(e))

    def scrape_urls(self, urls: Sequence[str]) -> List[GlobalXPageResult]:
        return [self.scrape_url(u) for u in urls]
