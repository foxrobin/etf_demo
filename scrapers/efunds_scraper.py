"""
Efunds: resolve holdings .xls from product page, then parse file rows.
"""

from __future__ import annotations

import os
import re
from datetime import datetime
from typing import List, Optional, Sequence
from urllib.parse import parse_qs, urljoin, urlparse

import requests
import xlrd
from bs4 import BeautifulSoup

from model.page_result import PageResult
from scrapers.scraper_utils import cell_str, extract_as_of_from_cells, fetch_content, fetch_text

_DOWNLOAD_ACCEPT = "application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*"
_DOWNLOAD_SELECTOR_HREF = "/uploadfiles/data/E Fund (HK) Solactive Global Gold Miner Select Index ETF's portfolio.xls"
_DOWNLOAD_URL_HINT = "/uploadfiles/data/"

# Product-ID fallback map when filename/query cannot provide expected code.
_PRODUCT_CODE_MAP = {
    "51": "HKUSAIF",
}


def _is_download_url(url: str) -> bool:
    u = url.lower().split("?", 1)[0]
    return u.endswith(".xls") or u.endswith(".xlsx")


def _resolve_download_urls(input_url: str, html: Optional[str] = None) -> List[str]:
    if _is_download_url(input_url):
        return [input_url]
    if html is None:
        return []

    soup = BeautifulSoup(html, "html.parser")
    out: List[str] = []

    exact = soup.select_one(f'a[href="{_DOWNLOAD_SELECTOR_HREF}"]')
    if exact and exact.get("href"):
        out.append(urljoin(input_url, exact.get("href").strip()))

    if not out:
        for a in soup.find_all("a"):
            href = (a.get("href") or "").strip()
            if not href:
                continue
            h = href.lower()
            if _DOWNLOAD_URL_HINT in h and (h.endswith(".xls") or h.endswith(".xlsx")):
                out.append(urljoin(input_url, href))

    seen = set()
    deduped: List[str] = []
    for url in out:
        if url not in seen:
            seen.add(url)
            deduped.append(url)
    return deduped


def _etf_code(download_url: str, source_url: str) -> str:
    filename = os.path.basename(urlparse(download_url).path)
    stem = os.path.splitext(filename)[0].strip()
    m_alnum = re.search(r"\b([A-Z]{5,10})\b", stem)
    if m_alnum:
        return m_alnum.group(1)

    if "solactive global gold miner select index etf" in stem.lower():
        return "HKUSAIF"

    q = parse_qs(urlparse(download_url).query)
    for key in ("code", "fundId", "fund_id"):
        v = (q.get(key) or [""])[0].strip()
        if v:
            return v

    parts = [p for p in urlparse(source_url).path.split("/") if p]
    if len(parts) >= 3 and parts[-2].lower() == "products":
        mapped = _PRODUCT_CODE_MAP.get(parts[-1])
        if mapped:
            return mapped
    return parts[-1] if parts else ""


def _is_header_row(cells: List[str]) -> bool:
    if not cells:
        return False
    joined = " ".join(cells).lower()
    has_name = ("name" in joined) or ("名稱" in joined)
    has_code = ("ticker" in joined) or ("代號" in joined) or ("證券代碼" in joined) or ("code" in joined)
    has_weight = ("weight" in joined) or ("%" in joined) or ("比重" in joined)
    return (has_name and has_weight) or (has_name and has_code)


def _extract_date_from_top_rows(rows: List[List[str]]) -> Optional[str]:
    as_of = extract_as_of_from_cells(rows, max_rows=10)
    if as_of:
        return as_of

    patterns = [
        r"(\d{4})/(\d{1,2})/(\d{1,2})",
        r"(\d{4})-(\d{1,2})-(\d{1,2})",
        r"(\d{4})年(\d{1,2})月(\d{1,2})日",
    ]
    for row in rows[:10]:
        for cell in row:
            for pat in patterns:
                m = re.search(pat, cell)
                if not m:
                    continue
                y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
                return f"{y:04d}{mo:02d}{d:02d}"
    return None


def _parse_xls(content: bytes) -> tuple[List[List[str]], Optional[str]]:
    wb = xlrd.open_workbook(file_contents=content)
    ws = wb.sheet_by_index(0)

    rows: List[List[str]] = []
    for r in range(ws.nrows):
        vals = [cell_str(ws.cell_value(r, c)) for c in range(ws.ncols)]
        row = [v.replace("\xa0", " ").replace("\n", " ").strip() for v in vals]
        if any(row):
            rows.append(row)

    as_of = _extract_date_from_top_rows(rows)

    header_idx: Optional[int] = None
    for i, row in enumerate(rows):
        if _is_header_row(row):
            header_idx = i
            break
    if header_idx is None:
        raise ValueError("Cannot find eFunds holdings header row in downloaded file.")

    header = rows[header_idx]
    data_rows = rows[header_idx + 1 :]
    table = [header] + [r for r in data_rows if any(c for c in r)]
    if len(table) <= 1:
        raise ValueError("eFunds holdings file has header but no data rows.")
    return table, as_of


def _download_and_parse(
    session: requests.Session,
    download_url: str,
    timeout: int,
) -> tuple[List[List[str]], Optional[str]]:
    content = fetch_content(session, download_url, timeout, accept=_DOWNLOAD_ACCEPT)
    return _parse_xls(content)


class EfundsScraper:
    """Fetch eFunds holdings by resolving and downloading .xls files."""

    def __init__(self, timeout: int = 45, session: Optional[requests.Session] = None):
        self.timeout = timeout
        self.session = session or requests.Session()

    def scrape_url(self, url: str) -> PageResult:
        code: Optional[str] = None
        try:
            main_html = None if _is_download_url(url) else fetch_text(self.session, url, self.timeout)
            download_urls = _resolve_download_urls(url, main_html)
            if not download_urls:
                raise ValueError("Cannot find eFunds holdings download URL on product page.")

            download_url = download_urls[0]
            code = _etf_code(download_url, url)
            rows, as_of = _download_and_parse(self.session, download_url, self.timeout)
            if not as_of:
                as_of = datetime.now().strftime("%Y%m%d")

            return PageResult(
                url=url,
                ok=True,
                etf_code=code,
                as_of_date=as_of,
                rows=rows,
            )
        except Exception as e:
            return PageResult(url=url, ok=False, etf_code=code, error=str(e))

    def scrape_urls(self, urls: Sequence[str]) -> List[PageResult]:
        return [self.scrape_url(u) for u in urls]
