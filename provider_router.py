from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional

from cleaners.model.page_result import PageResult

from cleaners.boci_cleaner import build_boci_bundle
from cleaners.bosera_cleaner import build_bosera_bundle
from cleaners.holdings_cleaner import build_globalx_bundle
from cleaners.ishares_cleaner import build_ishares_bundle
from cleaners.pingan_cleaner import build_pingan_bundle
from scrapers.boci_scraper import BOCIScraper
from scrapers.bosera_scraper import BoseraScraper
from scrapers.globalx_scraper import GlobalXScraper
from scrapers.ishares_scraper import ISharesScraper
from scrapers.pingan_scraper import PingAnScraper


@dataclass(frozen=True)
class ProviderConfig:
    name: str
    default_urls: List[str]
    env_urls_key: str
    scraper_factory: Callable[[], Any]
    cleaner: Callable[[List[PageResult]], Dict[str, Any]]


PROVIDERS: Dict[str, ProviderConfig] = {
    "globalx": ProviderConfig(
        name="globalx",
        default_urls=[
            "https://www.globalxetfs.com.hk/zh-hant/funds/hscei-covered-call-etf/",
            "https://www.globalxetfs.com.hk/zh-hant/funds/hang-seng-tech-covered-call-active-etf/",
        ],
        env_urls_key="GLOBALX_FUND_URLS",
        scraper_factory=GlobalXScraper,
        cleaner=build_globalx_bundle,
    ),
    "ishares": ProviderConfig(
        name="ishares",
        default_urls=[],
        env_urls_key="ISHARES_FUND_URLS",
        scraper_factory=ISharesScraper,
        cleaner=build_ishares_bundle,
    ),
    "boci": ProviderConfig(
        name="boci",
        default_urls=[],
        env_urls_key="BOCI_FUND_URLS",
        scraper_factory=BOCIScraper,
        cleaner=build_boci_bundle,
    ),
    "pingan": ProviderConfig(
        name="pingan",
        default_urls=[],
        env_urls_key="PINGAN_FUND_URLS",
        scraper_factory=PingAnScraper,
        cleaner=build_pingan_bundle,
    ),
    "bosera": ProviderConfig(
        name="bosera",
        default_urls=[],
        env_urls_key="BOSERA_FUND_URLS",
        scraper_factory=BoseraScraper,
        cleaner=build_bosera_bundle,
    ),
}


def _parse_body(event: Dict[str, Any]) -> Dict[str, Any]:
    body = event.get("body")
    if not isinstance(body, str) or not body.strip():
        return {}
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        return {}
    return payload if isinstance(payload, dict) else {}


def parse_providers(event: Optional[Dict[str, Any]]) -> List[str]:
    ev = event if isinstance(event, dict) else {}
    body = _parse_body(ev)

    raw = ev.get("providers")
    if not isinstance(raw, list):
        raw = body.get("providers")

    if isinstance(raw, list) and raw:
        out: List[str] = []
        seen = set()
        for p in raw:
            key = str(p).strip().lower()
            if key and key not in seen:
                out.append(key)
                seen.add(key)
        return out
    return ["globalx"]


def parse_urls(event: Optional[Dict[str, Any]], cfg: ProviderConfig) -> List[str]:
    ev = event if isinstance(event, dict) else {}
    body = _parse_body(ev)

    raw_urls = ev.get("urls")
    if not isinstance(raw_urls, list):
        raw_urls = body.get("urls")
    if isinstance(raw_urls, list) and raw_urls:
        return [str(u).strip() for u in raw_urls if str(u).strip()]

    env_urls = os.environ.get(cfg.env_urls_key, "").strip()
    if env_urls:
        return [u.strip() for u in env_urls.split(",") if u.strip()]

    return list(cfg.default_urls)


def parse_urls_for_provider(
    event: Optional[Dict[str, Any]],
    provider: str,
    cfg: ProviderConfig,
    selected_providers: List[str],
) -> List[str]:
    """
    Same as parse_urls, plus optional per-provider map:
      event.provider_urls = {"globalx": [...], "ishares": [...]}
      body.provider_urls = {...}
    """
    ev = event if isinstance(event, dict) else {}
    body = _parse_body(ev)

    provider_urls = ev.get("provider_urls")
    if not isinstance(provider_urls, dict):
        provider_urls = body.get("provider_urls")

    if isinstance(provider_urls, dict):
        per = provider_urls.get(provider)
        if isinstance(per, list) and per:
            return [str(u).strip() for u in per if str(u).strip()]

    # Convenience: when only one provider is requested, allow top-level urls.
    if len(selected_providers) == 1:
        return parse_urls(ev, cfg)

    env_urls = os.environ.get(cfg.env_urls_key, "").strip()
    if env_urls:
        return [u.strip() for u in env_urls.split(",") if u.strip()]

    return list(cfg.default_urls)


