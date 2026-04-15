from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

from cleaners.model.page_result import PageResult


def rows_to_holdings_objects(rows: List[List[str]]) -> List[Dict[str, str]]:
    """First row is headers; following rows become {header: cell} dicts."""
    if not rows:
        return []
    header = rows[0]
    out: List[Dict[str, str]] = []
    used: Dict[str, int] = {}

    def unique_key(name: str, idx: int) -> str:
        base = name.strip() or f"column_{idx}"
        if base not in used:
            used[base] = 0
            return base
        used[base] += 1
        return f"{base}_{used[base]}"

    keys = [unique_key(h, i) for i, h in enumerate(header)]

    for row in rows[1:]:
        padded = row + [""] * (len(keys) - len(row))
        out.append({keys[i]: padded[i] for i in range(len(keys))})
    return out


def build_bundle_from_page_results(
    results: List[PageResult],
    *,
    provider_key: str,
    schema_version: int = 1,
) -> Dict[str, Any]:
    """
    Shared bundle shape for any provider, given a list of PageResult.
    """
    generated_at = datetime.now(timezone.utc).isoformat()
    funds: List[Dict[str, Any]] = []
    errors: List[Dict[str, str]] = []

    for r in results:
        if not r.ok or r.error:
            errors.append({"url": r.url, "error": r.error or "unknown"})
            continue
        funds.append(
            {
                "url": r.url,
                "etfCode": r.etf_code,
                "as_of_date": r.as_of_date,
                "row_count": len(r.rows) - 1 if r.rows else 0,
                "holdings": rows_to_holdings_objects(r.rows),
            }
        )

    return {
        "schema_version": schema_version,
        "provider": provider_key,
        "generated_at": generated_at,
        "funds": funds,
        "errors": errors,
    }

