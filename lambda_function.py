from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict

from cleaners.holdings_cleaner import build_bundle_from_page_results
from provider_router import PROVIDERS, parse_providers, parse_urls_for_provider


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

    out = lambda_handler({"providers": [""]}, None) #default should set globalx? or full list?
    payload = json.loads(out["body"])
    print(json.dumps(payload, ensure_ascii=False, indent=2))
