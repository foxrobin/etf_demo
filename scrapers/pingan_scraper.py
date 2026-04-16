"""
Pingan: holdings are rendered from the #f3 iframe URL.

Example:
  https://asset.pingan.com.hk/zh-hk/PACT-PACCHKD
  f3 data-url => https://hkamcnav.pingan.com.cn/etfasset/Fundholdings/chn/3070
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import List, Optional, Sequence
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

from model.page_result import PageResult

_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,*/*",
}


def _clean_text(text: str) -> str:
    return " ".join(text.replace("\xa0", " ").split())


def _fetch_html(session: requests.Session, url: str, timeout: int) -> str:
    resp = session.get(url, timeout=timeout, headers=_DEFAULT_HEADERS)
    resp.raise_for_status()
    return resp.text


def _extract_holdings_iframe_url(main_html: str) -> str:
    soup = BeautifulSoup(main_html, "html.parser")
    f3 = soup.find("div", id="f3")
    if f3 is None:
        raise ValueError("Cannot find f3 tab container.")

    data_url = (f3.get("data-url") or "").strip()
    if not data_url:
        raise ValueError("Cannot find holdings iframe URL for f3 tab.")
    return data_url


def _is_holdings_header(header_text: str) -> bool:
    return (
        "stock name" in header_text
        or "exchange ticker" in header_text
        or "market price" in header_text
        or "成分股名稱" in header_text
        or "股票代號" in header_text
        or "市場價格" in header_text
    )


def _table_to_rows(table) -> List[List[str]]:
    rows: List[List[str]] = []
    headers = [_clean_text(th.get_text()) for th in table.find_all("th")]
    if headers:
        rows.append(headers)

    tr_list = table.find("tbody").find_all("tr") if table.find("tbody") else table.find_all("tr")
    for tr in tr_list:
        cells = tr.find_all(["td", "th"])
        row = [_clean_text(c.get_text()) for c in cells]
        if any(row):
            if headers and row == headers[: len(row)]:
                continue
            rows.append(row)

    return rows


def _parse_holdings_table(holdings_html: str) -> List[List[str]]:
    soup = BeautifulSoup(holdings_html, "html.parser")
    best_rows: List[List[str]] = []

    for table in soup.find_all("table"):
        headers = [_clean_text(th.get_text()) for th in table.find_all("th")]
        if not _is_holdings_header(" ".join(headers).lower()):
            continue

        rows = _table_to_rows(table)
        if len(rows) > 1 and len(rows) > len(best_rows):
            best_rows = rows

    if len(best_rows) <= 1:
        raise ValueError("Cannot find holdings table. Page structure may have changed.")
    return best_rows


def _as_of_from_text(text: str) -> Optional[str]:
    m = re.search(r"([0-9]{4}-[0-9]{2}-[0-9]{2})", text)
    if m:
        return m.group(1).replace("-", "")

    m2 = re.search(r"([0-9]{1,2}/[0-9]{1,2}/[0-9]{4})", text)
    if m2:
        dd, mm, yyyy = m2.group(1).split("/")
        return f"{yyyy}{int(mm):02d}{int(dd):02d}"

    return None


def _etf_code_from_urls(holdings_url: str, source_url: str) -> str:
    # Prefer numeric ETF id from iframe URL tail, e.g. .../Fundholdings/chn/3070
    path_parts = [p for p in urlparse(holdings_url).path.split("/") if p]
    if path_parts and path_parts[-1].isdigit():
        return path_parts[-1]

    # Fallback: original source URL slug tail.
    base_parts = [p for p in urlparse(source_url).path.split("/") if p]
    return base_parts[-1] if base_parts else ""


def _infer_etf_code_and_date(holdings_html: str, holdings_url: str, source_url: str) -> tuple[str, str]:
    etf_code = _etf_code_from_urls(holdings_url, source_url)
    as_of = _as_of_from_text(holdings_html) or datetime.now().strftime("%Y%m%d")
    return etf_code, as_of


class PingAnScraper:
    """Fetch Ping An holdings from the f3 iframe page."""

    def __init__(self, timeout: int = 30, session: Optional[requests.Session] = None):
        self.timeout = timeout
        self.session = session or requests.Session()

    def scrape_url(self, url: str) -> PageResult:
        try:
            main_html = _fetch_html(self.session, url, self.timeout)
            holdings_url = _extract_holdings_iframe_url(main_html)
            holdings_html = _fetch_html(self.session, holdings_url, self.timeout)

            rows = _parse_holdings_table(holdings_html)
            etf_code, as_of = _infer_etf_code_and_date(holdings_html, holdings_url, url)
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
