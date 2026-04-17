"""Shared helpers for provider scrapers."""

from __future__ import annotations

import re
from typing import Optional, Sequence

import requests

_BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


def default_headers(accept: str = "*/*") -> dict[str, str]:
    return {
        "User-Agent": _BROWSER_UA,
        "Accept": accept,
    }


def fetch_content(
    session: requests.Session,
    url: str,
    timeout: int,
    *,
    accept: str = "*/*",
) -> bytes:
    resp = session.get(url, timeout=timeout, headers=default_headers(accept))
    resp.raise_for_status()
    return resp.content


def fetch_text(
    session: requests.Session,
    url: str,
    timeout: int,
    *,
    accept: str = "text/html,*/*",
) -> str:
    resp = session.get(url, timeout=timeout, headers=default_headers(accept))
    resp.raise_for_status()
    return resp.text


def is_xlsx_content(content: bytes, url: str) -> bool:
    if url.lower().split("?")[0].endswith(".xlsx"):
        return True
    return len(content) >= 4 and content[:2] == b"PK"


def cell_str(v: object) -> str:
    if v is None:
        return ""
    if isinstance(v, float) and v == int(v):
        return str(int(v))
    return str(v).strip()


def normalize_row(row: Sequence[object]) -> list[str]:
    return [cell_str(c).replace("\n", " ").replace("\xa0", " ").strip() for c in row]


def extract_as_of_yyyymmdd(text: str) -> Optional[str]:
    m_zh = re.search(r"(\d{4})年(\d{1,2})月(\d{1,2})日", text)
    if m_zh:
        y, mo, d = int(m_zh.group(1)), int(m_zh.group(2)), int(m_zh.group(3))
        return f"{y:04d}{mo:02d}{d:02d}"

    m_iso = re.search(r"(\d{4})-(\d{1,2})-(\d{1,2})", text)
    if m_iso:
        y, mo, d = int(m_iso.group(1)), int(m_iso.group(2)), int(m_iso.group(3))
        return f"{y:04d}{mo:02d}{d:02d}"

    m_dmy = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", text)
    if m_dmy:
        d, mo, y = int(m_dmy.group(1)), int(m_dmy.group(2)), int(m_dmy.group(3))
        return f"{y:04d}{mo:02d}{d:02d}"

    return None


def extract_as_of_from_cells(rows: Sequence[Sequence[str]], max_rows: int = 20) -> Optional[str]:
    for row in rows[:max_rows]:
        for cell in row:
            if not cell:
                continue
            as_of = extract_as_of_yyyymmdd(str(cell))
            if as_of:
                return as_of
    return None
