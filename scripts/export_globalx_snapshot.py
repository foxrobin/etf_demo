"""
將 Global X 持股一次爬入 public/globalx_holdings_snapshot.json，供前端僅讀檔、不開 api_server。
於 etf_demo 目錄執行: py -3 scripts/export_globalx_snapshot.py
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from cleaners.holdings_cleaner import rows_to_holdings_objects  # noqa: E402
from scrapers.globalx_scraper import GlobalXScraper  # noqa: E402


def main() -> None:
    urls_path = ROOT / "public" / "globalx_code_urls.json"
    out_path = ROOT / "public" / "globalx_holdings_snapshot.json"
    if not urls_path.is_file():
        raise SystemExit(f"Missing {urls_path}")

    code_to_url = json.loads(urls_path.read_text(encoding="utf-8"))
    if not isinstance(code_to_url, dict):
        raise SystemExit("globalx_code_urls.json must be an object")

    scraper = GlobalXScraper()
    url_to_fund: dict[str, dict] = {}
    errors: list[dict[str, str]] = []

    for url in sorted(set(code_to_url.values())):
        r = scraper.scrape_url(url)
        if not r.ok:
            errors.append({"url": url, "error": r.error or "unknown"})
            continue
        url_to_fund[url] = {
            "url": r.url,
            "etfCode": r.etf_code,
            "as_of_date": r.as_of_date,
            "row_count": len(r.rows) - 1 if r.rows else 0,
            "holdings": rows_to_holdings_objects(r.rows),
        }

    by_code: dict[str, dict] = {}
    for code, url in code_to_url.items():
        fund = url_to_fund.get(url)
        if fund:
            by_code[str(code)] = fund

    snapshot = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "by_code": by_code,
        "errors": errors,
    }
    out_path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out_path} | codes: {len(by_code)} | scrape errors: {len(errors)}")


if __name__ == "__main__":
    main()
