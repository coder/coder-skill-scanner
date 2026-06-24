"""Tests for the v1 badge generators (shields.io endpoint JSON + inline SVG)."""

from __future__ import annotations

import re

from scanner import badges


def test_verdict_badge_json_colors_by_state():
    assert badges.verdict_badge_json("clean")["color"] == "brightgreen"
    assert badges.verdict_badge_json("suspicious")["color"] == "yellow"
    assert badges.verdict_badge_json("malicious")["color"] == "red"
    assert badges.verdict_badge_json("unknown")["color"] == "lightgrey"
    # Unrecognised verdict falls back to lightgrey rather than crashing.
    assert badges.verdict_badge_json("not-a-real-verdict")["color"] == "lightgrey"


def test_verdict_badge_json_carries_shields_contract():
    payload = badges.verdict_badge_json("clean")
    assert payload["schemaVersion"] == 1
    assert payload["label"] == "skill scan"
    assert payload["message"] == "clean"
    assert payload["cacheSeconds"] == 300


def test_risk_badge_color_bands():
    # Bands aligned to the 21/51/81 cutoffs the verdict policy uses.
    assert badges.risk_badge_json(0)["color"] == "brightgreen"
    assert badges.risk_badge_json(20)["color"] == "brightgreen"
    assert badges.risk_badge_json(21)["color"] == "yellowgreen"
    assert badges.risk_badge_json(50)["color"] == "yellowgreen"
    assert badges.risk_badge_json(51)["color"] == "yellow"
    assert badges.risk_badge_json(80)["color"] == "yellow"
    assert badges.risk_badge_json(81)["color"] == "red"
    assert badges.risk_badge_json(100)["color"] == "red"


def test_risk_badge_json_carries_shields_contract():
    payload = badges.risk_badge_json(42)
    assert payload["schemaVersion"] == 1
    assert payload["label"] == "risk score"
    assert payload["message"] == "42/100"


def test_verdict_badge_svg_is_well_formed():
    svg = badges.verdict_badge_svg("clean")
    assert svg.startswith("<svg ")
    assert svg.rstrip().endswith("</svg>")
    # Two rects (label background + message background).
    assert svg.count("<rect ") >= 2
    # The verdict text appears in both the title and one of the <text> nodes.
    assert "clean" in svg
    # Verdict colour bleeds through as a hex fill.
    assert "#4c1" in svg, "clean verdict should use the brightgreen hex"


def test_risk_badge_svg_color_threshold():
    high = badges.risk_badge_svg(95)
    low = badges.risk_badge_svg(5)
    # Red vs brightgreen hex.
    assert "#e05d44" in high
    assert "#4c1" in low
    # Both have the score string.
    assert "95/100" in high
    assert "5/100" in low


def test_svg_width_grows_with_message_length():
    """Width estimation has to widen for longer text or the badge clips."""
    short = badges.verdict_badge_svg("clean")
    long_ = badges.verdict_badge_svg("suspicious")
    # Pull the width attribute from the opening tag.
    sw = int(re.search(r'width="(\d+)"', short).group(1))
    lw = int(re.search(r'width="(\d+)"', long_).group(1))
    assert lw > sw
