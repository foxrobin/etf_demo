"""Normalize scraper output into JSON-friendly structures for APIs / pipelines."""

from .holdings_cleaner import build_globalx_bundle, rows_to_holdings_objects
from .ishares_cleaner import build_ishares_bundle
from .boci_cleaner import build_boci_bundle
from .pingan_cleaner import build_pingan_bundle
from .bosera_cleaner import build_bosera_bundle

__all__ = [
    "build_globalx_bundle",
    "rows_to_holdings_objects",
    "build_ishares_bundle",
    "build_boci_bundle",
    "build_pingan_bundle",
    "build_bosera_bundle",
]
