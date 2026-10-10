#!/usr/bin/env python3
"""Calculate value deltas and x-ratios for benchmark tables in a markdown file."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

DEFAULT_MARKDOWN = Path("content/posts/why-cache-padding-made-ringbuffer-slower-on-m4-pro.md")


def parse_value(value: str) -> tuple[float, str]:
    cleaned = value.strip().replace("`", "").replace(",", "")
    match = re.fullmatch(r"([0-9]+(?:\.[0-9]+)?)(ms|s)?", cleaned)
    if not match:
        raise ValueError(f"unsupported value: {value!r}")

    number = float(match.group(1))
    unit = match.group(2) or ""
    if unit == "ms":
        return number / 1000, "s"
    return number, unit


def format_delta(delta: float, unit: str) -> str:
    if unit == "s":
        return f"{delta:+.6g}s"
    if delta.is_integer():
        return f"{int(delta):+,}"
    return f"{delta:+,.6g}"


def markdown_rows(markdown: str):
    for line in markdown.splitlines():
        stripped = line.strip()
        if not stripped.startswith("|") or not stripped.endswith("|"):
            continue
        cells = [cell.strip() for cell in stripped.strip("|").split("|")]
        if len(cells) >= 3:
            yield cells[:3]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Calculate padded/base deltas and x-ratios for two-value markdown benchmark tables."
    )
    parser.add_argument("markdown", nargs="?", type=Path, default=DEFAULT_MARKDOWN)
    args = parser.parse_args()

    current_table: tuple[str, str] | None = None
    print("table,event,base,padded,diff,x")

    for event, base_raw, padded_raw in markdown_rows(args.markdown.read_text()):
        if event == "Events":
            current_table = (base_raw, padded_raw)
            continue
        if event.startswith("---") or current_table is None:
            continue

        try:
            base, base_unit = parse_value(base_raw)
            padded, padded_unit = parse_value(padded_raw)
        except ValueError:
            continue

        if base_unit != padded_unit:
            raise ValueError(f"unit mismatch for {event}: {base_raw} vs {padded_raw}")

        ratio = padded / base
        diff = padded - base
        table_name = f"{current_table[1]} / {current_table[0]}"
        print(f"{table_name},{event},{base_raw},{padded_raw},{format_delta(diff, base_unit)},{ratio:.3f}x")


if __name__ == "__main__":
    main()
