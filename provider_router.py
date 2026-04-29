from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional

from scrapers.boci_scraper import BOCIScraper
from scrapers.bosera_scraper import BoseraScraper
from scrapers.csop_scraper import CsopScraper
from scrapers.globalx_scraper import GlobalXScraper
from scrapers.ishares_scraper import ISharesScraper
from scrapers.pingan_scraper import PingAnScraper
from scrapers.premia_scraper import PremiaScraper


@dataclass(frozen=True)
class ProviderConfig:
    name: str
    default_urls: List[str]
    env_urls_key: str
    scraper_factory: Callable[[], Any]
    # JSON bundle "provider" string; only globalx differs from router key (globalx_hk).
    bundle_provider_key: str


PROVIDERS: Dict[str, ProviderConfig] = {
    "globalx": ProviderConfig(
        name="globalx",
        default_urls=[
            "https://www.globalxetfs.com.hk/zh-hant/funds/hscei-covered-call-etf/",
            "https://www.globalxetfs.com.hk/zh-hant/funds/hang-seng-tech-covered-call-active-etf/",
        ],
        env_urls_key="GLOBALX_FUND_URLS",
        scraper_factory=GlobalXScraper,
        bundle_provider_key="globalx_hk",
    ),
    "ishares": ProviderConfig(
        name="ishares",
        default_urls=[],
        env_urls_key="ISHARES_FUND_URLS",
        scraper_factory=ISharesScraper,
        bundle_provider_key="ishares",
    ),
    "boci": ProviderConfig(
        name="boci",
        default_urls=[],
        env_urls_key="BOCI_FUND_URLS",
        scraper_factory=BOCIScraper,
        bundle_provider_key="boci",
    ),
    "pingan": ProviderConfig(
        name="pingan",
        default_urls=[],
        env_urls_key="PINGAN_FUND_URLS",
        scraper_factory=PingAnScraper,
        bundle_provider_key="pingan",
    ),
    "bosera": ProviderConfig(
        name="bosera",
        default_urls=[],
        env_urls_key="BOSERA_FUND_URLS",
        scraper_factory=BoseraScraper,
        bundle_provider_key="bosera",
    ),
    "csop": ProviderConfig(
        name="csop",
        default_urls=[],
        env_urls_key="CSOP_FUND_URLS",
        scraper_factory=CsopScraper,
        bundle_provider_key="csop",
    ),
    "premia": ProviderConfig(
        name="premia",
        default_urls=[],
        env_urls_key="PREMIA_FUND_URLS",
        scraper_factory=PremiaScraper,
        bundle_provider_key="premia",
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


def parse_urls_for_provider(
    event: Optional[Dict[str, Any]],
    provider: str,
    cfg: ProviderConfig,
) -> List[str]:
    """
    Resolve URLs from provider_urls map only:
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

    env_urls = os.environ.get(cfg.env_urls_key, "").strip()
    if env_urls:
        return [u.strip() for u in env_urls.split(",") if u.strip()]

    return list(cfg.default_urls)


