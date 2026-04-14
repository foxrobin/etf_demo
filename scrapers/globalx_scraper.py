from __future__ import annotations

import re
from datetime import datetime
from typing import List, Optional, Sequence
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

from cleaners.model.page_result import PageResult


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


def _infer_etf_code_and_date(html: str, url: str) -> tuple[str, str]:
    match = re.search(r'downloadLink\.download\s*=\s*"([^"]+)"', html)
    if match:
        filename = match.group(1)
        etf_code = filename.split("_")[0]
        date_match = re.search(r"(20\d{6})", filename)
        if date_match:
            return etf_code, date_match.group(1)
        return etf_code, datetime.now().strftime("%Y%m%d")

    slug = urlparse(url).path.strip("/").split("/")[-1] or "globalx_fund"
    return slug, datetime.now().strftime("%Y%m%d")


class GlobalXScraper:
    """Fetches Global X HK fund URLs and returns holdings table rows per page."""

    def __init__(self, timeout: int = 30, session: Optional[requests.Session] = None):
        self.timeout = timeout
        self.session = session or requests.Session()

    def scrape_url(self, url: str) -> PageResult:
        try:
            resp = self.session.get(url, timeout=self.timeout)
            resp.raise_for_status()
            html = resp.text
            rows = _parse_holdings_table(html)
            etf_code, as_of = _infer_etf_code_and_date(html, url)
            return PageResult(
                url=url,
                ok=True,
                etf_code=etf_code,
                as_of_date=as_of,
                rows=rows,
            )
        except Exception as e:
            return PageResult(url=url, ok=False, error=str(e))

    def scrape_urls(self, urls: Sequence[str]) -> List[PageResult]:
        return [self.scrape_url(u) for u in urls]
