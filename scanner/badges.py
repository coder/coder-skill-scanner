"""SVG and shields.io-endpoint JSON badge generators.

The JSON shape matches shields.io's ``endpoint`` badge contract so a consumer
can embed ``https://img.shields.io/endpoint?url=<our-json-url>`` directly in
a README. The SVG endpoint generates a flat-style badge inline (no shields.io
dependency, no network hop) for sites that want the badge served from the
same origin as the rest of the report.

Stability: ``schemaVersion``, ``label``, ``message``, ``color``, and
``cacheSeconds`` are part of the v1 contract. The SVG layout (two-rect flat
badge, 11px Verdana) is the contract for ``.svg`` consumers.
"""

from __future__ import annotations

from typing import Any
from xml.sax.saxutils import escape as _xml_escape

SHIELDS_SCHEMA_VERSION = 1

# Cache hint for shields.io: 5 minutes lines up with the registry-server
# proxy's cache TTL and the catalogue refresh cadence.
DEFAULT_CACHE_SECONDS = 300

# Shields.io color names.
_VERDICT_COLORS: dict[str, str] = {
    "clean": "brightgreen",
    "suspicious": "yellow",
    "malicious": "red",
    "unknown": "lightgrey",
}

# Bands for the risk score badge color. Matches the verdict cutoffs in
# ``config.yaml`` (51 = HIGH/suspicious, 81 = CRITICAL/malicious).
def _risk_color(score: int) -> str:
    if score >= 81:
        return "red"
    if score >= 51:
        return "yellow"
    if score >= 21:
        return "yellowgreen"
    return "brightgreen"


# Hex equivalents used for the SVG renderer. Shields.io's `?color=` accepts
# names; the inline SVG renderer needs raw hex.
_NAMED_HEX: dict[str, str] = {
    "brightgreen": "#4c1",
    "green": "#97ca00",
    "yellowgreen": "#a4a61d",
    "yellow": "#dfb317",
    "orange": "#fe7d37",
    "red": "#e05d44",
    "lightgrey": "#9f9f9f",
    "blue": "#007ec6",
}


def status_badge_json(verdict: str) -> dict[str, Any]:
    """Build the shields.io-endpoint payload for the status badge.

    The categorical scan outcome: "clean", "suspicious", "malicious", or
    "unknown". Color follows the verdict 1:1 (brightgreen, yellow, red,
    lightgrey). Pair with :func:`score_badge_json` for the numeric variant.
    """
    return {
        "schemaVersion": SHIELDS_SCHEMA_VERSION,
        "label": "skill scan",
        "message": verdict,
        "color": _VERDICT_COLORS.get(verdict, "lightgrey"),
        "cacheSeconds": DEFAULT_CACHE_SECONDS,
    }


def score_badge_json(risk_score: int) -> dict[str, Any]:
    """Build the shields.io-endpoint payload for the score badge.

    The numeric SkillSpector risk score (0-100). Color is banded at the
    21 / 51 / 81 cutoffs that drive the verdict policy. Pair with
    :func:`status_badge_json` for the categorical variant.
    """
    return {
        "schemaVersion": SHIELDS_SCHEMA_VERSION,
        "label": "risk score",
        "message": f"{risk_score}/100",
        "color": _risk_color(risk_score),
        "cacheSeconds": DEFAULT_CACHE_SECONDS,
    }


def _estimate_text_width(text: str) -> int:
    """Conservative estimate of rendered text width in pixels for 11px Verdana.

    Shields.io measures glyphs precisely; we just need stable, deterministic
    output. ~7px/char rounded up with a small padding works well in practice
    across short labels and numeric scores.
    """
    return max(8, int(len(text) * 7) + 10)


def _xml_safe(s: str) -> str:
    """Escape a string for both SVG attribute and text contexts.

    The badge inputs (verdict labels, risk-score strings) are produced by the
    scanner and currently never contain markup characters, but the SVG is
    served to third-party README consumers; defending against ``&``, ``<``,
    ``>``, ``\"`` keeps the output well-formed and removes any path to SVG
    injection if the input shape ever drifts.
    """
    return _xml_escape(s, {'"': "&quot;"})


def _flat_badge_svg(label: str, message: str, color_hex: str) -> str:
    """Render a two-rect flat-style badge as inline SVG."""
    label_w = _estimate_text_width(label)
    message_w = _estimate_text_width(message)
    total_w = label_w + message_w
    label_mid = label_w / 2
    message_mid = label_w + message_w / 2
    label_xml = _xml_safe(label)
    message_xml = _xml_safe(message)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'width="{total_w}" height="20" role="img" '
        f'aria-label="{label_xml}: {message_xml}">'
        f"<title>{label_xml}: {message_xml}</title>"
        '<linearGradient id="s" x2="0" y2="100%">'
        '<stop offset="0" stop-color="#bbb" stop-opacity=".1"/>'
        '<stop offset="1" stop-opacity=".1"/>'
        "</linearGradient>"
        f'<clipPath id="r"><rect width="{total_w}" height="20" rx="3" fill="#fff"/></clipPath>'
        '<g clip-path="url(#r)">'
        f'<rect width="{label_w}" height="20" fill="#555"/>'
        f'<rect x="{label_w}" width="{message_w}" height="20" fill="{color_hex}"/>'
        f'<rect width="{total_w}" height="20" fill="url(#s)"/>'
        "</g>"
        '<g fill="#fff" text-anchor="middle" '
        'font-family="Verdana,Geneva,DejaVu Sans,sans-serif" '
        'text-rendering="geometricPrecision" font-size="110">'
        f'<text aria-hidden="true" x="{label_mid * 10:.0f}" y="150" '
        'fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="'
        f'{(label_w - 10) * 10:.0f}">{label_xml}</text>'
        f'<text x="{label_mid * 10:.0f}" y="140" transform="scale(.1)" '
        f'fill="#fff" textLength="{(label_w - 10) * 10:.0f}">{label_xml}</text>'
        f'<text aria-hidden="true" x="{message_mid * 10:.0f}" y="150" '
        'fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="'
        f'{(message_w - 10) * 10:.0f}">{message_xml}</text>'
        f'<text x="{message_mid * 10:.0f}" y="140" transform="scale(.1)" '
        f'fill="#fff" textLength="{(message_w - 10) * 10:.0f}">{message_xml}</text>'
        "</g></svg>"
    )


def status_badge_svg(verdict: str) -> str:
    """Render the status badge (categorical scan outcome) as inline SVG."""
    color = _NAMED_HEX[_VERDICT_COLORS.get(verdict, "lightgrey")]
    return _flat_badge_svg("skill scan", verdict, color)


def score_badge_svg(risk_score: int) -> str:
    """Render the score badge (numeric risk score) as inline SVG."""
    color = _NAMED_HEX[_risk_color(risk_score)]
    return _flat_badge_svg("risk score", f"{risk_score}/100", color)
