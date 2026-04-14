from __future__ import annotations

from typing import Any, Dict, List

from cleaners.holdings_cleaner import build_bundle_from_page_results
from cleaners.model.page_result import PageResult


def build_ishares_bundle(results: List[PageResult], *, schema_version: int = 1) -> Dict[str, Any]:
    return build_bundle_from_page_results(
        results, provider_key="ishares", schema_version=schema_version
    )

