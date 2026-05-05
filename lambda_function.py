from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List

from cleaners.holdings_cleaner import build_bundle_from_page_results
from holdings_cache import HoldingsCache, holdings_cache_enabled, normalize_cache_url
from model.page_result import PageResult
from provider_router import PROVIDERS, parse_providers, parse_urls_for_provider


def _is_same_utc_day(ts: str, now: datetime) -> bool:
    if not ts:
        return False
    try:
        dt = datetime.fromisoformat(str(ts))
    except ValueError:
        return False
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).date() == now.astimezone(timezone.utc).date()


def _scrape_with_daily_cache(scraper: Any, urls: List[str], bundle_key: str) -> List[PageResult]:
    """
    Reuse cached rows when today's scrape already happened for this URL.
    No lightweight "peek" request; if same day, return cache directly.
    """
    cache = HoldingsCache.load()
    out: List[PageResult] = []
    dirty = False
    now = datetime.now(timezone.utc)
    for url in urls:
        key = normalize_cache_url(url)
        entry = cache.get(bundle_key, key)
        if entry and entry.get("rows"):
            cached_at = entry.get("cached_at")
            if _is_same_utc_day(str(cached_at or ""), now):
                out.append(
                    PageResult(
                        url=url,
                        ok=True,
                        etf_code=entry.get("etf_code"),
                        as_of_date=entry.get("as_of_date"),
                        cached_at=str(cached_at or ""),
                        rows=entry["rows"],
                    )
                )
                continue
        r = scraper.scrape_url(url)
        if r.ok:
            cached_at = cache.set_from_page_result(bundle_key, key, r)
            r.cached_at = cached_at
            dirty = True
        out.append(r)
    if dirty:
        try:
            cache.save()
        except OSError:
            pass
    return out


def lambda_handler(event: Any, context: Any) -> Dict[str, Any]:
    """
    event (dict):
      - providers: ["globalx","ishares", ...] (multi-provider)
      - provider_urls: {"globalx":[...], "ishares":[...]} (URL list per provider)
      - body: '{"providers":["globalx"],"provider_urls":{"globalx":["..."]}}'
    env:
      - DATA_PROVIDERS=globalx,ishares (optional default providers list)
      - <PROVIDER>_FUND_URLS=comma,separated,urls (optional defaults per provider)
    """
    ev = event if isinstance(event, dict) else {}
    requested = parse_providers(ev)
    unsupported = [p for p in requested if p not in PROVIDERS]
    if unsupported:
        return {
            "statusCode": 400,
            "headers": {"Content-Type": "application/json; charset=utf-8"},
            "body": json.dumps(
                {
                    "error": f"Unsupported provider(s): {', '.join(unsupported)}",
                    "supported_providers": sorted(PROVIDERS.keys()),
                },
                ensure_ascii=False,
            ),
        }

    bundles: Dict[str, Dict[str, Any]] = {}
    summary: Dict[str, Dict[str, int]] = {}
    for provider in requested:
        cfg = PROVIDERS[provider]
        urls = parse_urls_for_provider(ev, provider, cfg)
        scraper = cfg.scraper_factory()
        if provider in {"globalx", "csop"} and holdings_cache_enabled():
            results = _scrape_with_daily_cache(scraper, urls, cfg.bundle_provider_key)
        else:
            results = scraper.scrape_urls(urls)
        bundle = build_bundle_from_page_results(results, provider_key=cfg.bundle_provider_key)
        bundles[provider] = bundle
        summary[provider] = {
            "funds": len(bundle.get("funds", [])),
            "errors": len(bundle.get("errors", [])),
        }

    payload: Dict[str, Any] = {
        "schema_version": 1,
        "mode": "multi_provider",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "providers": requested,
        "summary": summary,
        "results": bundles,
    }

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json; charset=utf-8",
        },
        "body": json.dumps(payload, ensure_ascii=False),
    }


if __name__ == "__main__":
    import sys

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    out = lambda_handler({"providers": ["globalx"]}, None)
    payload = json.loads(out["body"])
    print(json.dumps(payload, ensure_ascii=False, indent=2))
