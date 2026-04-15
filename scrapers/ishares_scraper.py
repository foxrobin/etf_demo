"""
iShares (BlackRock HK): download holdings CSV from direct .ajax URLs.

Example:
  https://www.blackrock.com/hk/zh/products/.../1478358625333.ajax?fileType=csv&fileName=2801_holdings&dataType=fund

Terms of use: BlackRock's site may restrict automated access; use responsibly and
comply with their terms. This code is for integration with your own workflows.
"""

from __future__ import annotations

import csv
import io
import re
from typing import List, Optional, Sequence
from urllib.parse import parse_qs, urlparse

import requests

from model.page_result import PageResult

# Reasonable default; some CDNs expect a browser-like User-Agent.
_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/csv,*/*",
}


def _etf_code_from_url(url: str) -> Optional[str]:
    qs = parse_qs(urlparse(url).query)
    raw = (qs.get("fileName") or [""])[0]
    m = re.match(r"^(\d+)_holdings", raw, re.I)
    return m.group(1) if m else None


def _as_of_yyyymmdd_from_zh(text: str) -> Optional[str]:
    m = re.search(r"(\d{4})年(\d{1,2})月(\d{1,2})日", text)
    if not m:
        return None
    y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
    return f"{y:04d}{mo:02d}{d:02d}"


def _parse_holdings_csv(text: str) -> tuple[List[List[str]], Optional[str]]:
    """
    BlackRock HK CSV often starts with a metadata line, blank line, then header.

    Returns (rows_for_page_result, as_of_yyyymmdd_or_none).
    rows_for_page_result: [header, ...data] same shape as table scrapers.
    """
    buf = io.StringIO(text.lstrip("\ufeff"))
    reader = csv.reader(buf)
    raw_rows: List[List[str]] = [
        row for row in reader if any((c or "").strip() for c in row)
    ]

    as_of: Optional[str] = None
    for row in raw_rows[:8]:
        for cell in row:
            d = _as_of_yyyymmdd_from_zh(cell)
            if d:
                as_of = d
                break
        if as_of:
            break

    header_idx: Optional[int] = None
    for i, row in enumerate(raw_rows):
        first = (row[0] or "").strip().lower()
        if first == "ticker":
            header_idx = i
            break

    if header_idx is None:
        raise ValueError("Cannot find holdings header row (Ticker,...) in CSV.")

    header = [c.strip() for c in raw_rows[header_idx]]
    data_rows = raw_rows[header_idx + 1 :]
    table = [header] + [[c.strip() for c in r] for r in data_rows if any((c or "").strip() for c in r)]

    if len(table) <= 1:
        raise ValueError("CSV has header but no data rows.")

    return table, as_of


class ISharesScraper:
    """Download iShares/BlackRock HK holdings CSV per URL."""

    def __init__(self, timeout: int = 60, session: Optional[requests.Session] = None):
        self.timeout = timeout
        self.session = session or requests.Session()

    def scrape_url(self, url: str) -> PageResult:
        etf_code = _etf_code_from_url(url)
        try:
            resp = self.session.get(url, timeout=self.timeout, headers=_DEFAULT_HEADERS)
            resp.raise_for_status()
            text = resp.content.decode("utf-8-sig", errors="replace")
            rows, as_of = _parse_holdings_csv(text)
            if not etf_code and rows:
                # fallback: try first column of first data row
                etf_code = rows[1][0].strip('"') if len(rows) > 1 else None
            return PageResult(
                url=url,
                ok=True,
                etf_code=etf_code,
                as_of_date=as_of,
                rows=rows,
            )
        except Exception as e:
            return PageResult(url=url, ok=False, etf_code=etf_code, error=str(e))

    def scrape_urls(self, urls: Sequence[str]) -> List[PageResult]:
        return [self.scrape_url(u) for u in urls]
