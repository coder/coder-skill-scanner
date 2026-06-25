"""Tests for the v1 badge generators (shields.io endpoint JSON + inline SVG)."""

from __future__ import annotations

import re

from scanner import badges


def test_status_badge_json_colors_by_state():
    assert badges.status_badge_json("clean")["color"] == "brightgreen"
    assert badges.status_badge_json("suspicious")["color"] == "yellow"
    assert badges.status_badge_json("malicious")["color"] == "red"
    assert badges.status_badge_json("unknown")["color"] == "lightgrey"
    # Unrecognised verdict falls back to lightgrey rather than crashing.
    assert badges.status_badge_json("not-a-real-verdict")["color"] == "lightgrey"


def test_status_badge_json_carries_shields_contract():
    payload = badges.status_badge_json("clean")
    assert payload["schemaVersion"] == 1
    assert payload["label"] == "skill scan"
    assert payload["message"] == "clean"
    assert payload["cacheSeconds"] == 300


def test_score_badge_color_bands():
    # Bands aligned to the 21/51/81 cutoffs the verdict policy uses.
    assert badges.score_badge_json(0)["color"] == "brightgreen"
    assert badges.score_badge_json(20)["color"] == "brightgreen"
    assert badges.score_badge_json(21)["color"] == "yellowgreen"
    assert badges.score_badge_json(50)["color"] == "yellowgreen"
    assert badges.score_badge_json(51)["color"] == "yellow"
    assert badges.score_badge_json(80)["color"] == "yellow"
    assert badges.score_badge_json(81)["color"] == "red"
    assert badges.score_badge_json(100)["color"] == "red"


def test_score_badge_json_carries_shields_contract():
    payload = badges.score_badge_json(42)
    assert payload["schemaVersion"] == 1
    assert payload["label"] == "risk score"
    assert payload["message"] == "42/100"


def test_status_badge_svg_fallback_is_well_formed(monkeypatch):
    """When shields.io is unreachable, status_badge_svg returns the inline
    flat-style fallback. Verify that fallback path still produces a usable
    badge so the publish job never ships an empty file."""
    monkeypatch.setattr(badges, "fetch_shields_io_svg", lambda *a, **k: None)
    svg = badges.status_badge_svg("clean")
    assert svg.startswith("<svg ")
    assert svg.rstrip().endswith("</svg>")
    # Two rects (label background + message background).
    assert svg.count("<rect ") >= 2
    # The verdict text appears in both the title and one of the <text> nodes.
    assert "clean" in svg
    # Verdict colour bleeds through as a hex fill.
    assert "#4c1" in svg, "clean verdict should use the brightgreen hex"


def test_score_badge_svg_color_threshold_fallback(monkeypatch):
    """Fallback path: bands map to the right shields hex."""
    monkeypatch.setattr(badges, "fetch_shields_io_svg", lambda *a, **k: None)
    high = badges.score_badge_svg(95)
    low = badges.score_badge_svg(5)
    # Red vs brightgreen hex.
    assert "#e05d44" in high
    assert "#4c1" in low
    # Both have the score string.
    assert "95/100" in high
    assert "5/100" in low


def test_svg_width_grows_with_message_length(monkeypatch):
    """Width estimation in the fallback renderer has to widen for longer
    text or the badge clips. shields.io's renderer makes the same guarantee
    but we test the local one because we control its layout."""
    monkeypatch.setattr(badges, "fetch_shields_io_svg", lambda *a, **k: None)
    short = badges.status_badge_svg("clean")
    long_ = badges.status_badge_svg("suspicious")
    # Pull the width attribute from the opening tag.
    sw = int(re.search(r'width="([\d.]+)"', short).group(1).split(".")[0])
    lw = int(re.search(r'width="([\d.]+)"', long_).group(1).split(".")[0])
    assert lw > sw


def test_svg_escapes_markup_in_label_and_message():
    """The SVG renderer must escape XML special chars; the public surface only
    ever passes shape-constrained inputs, but defense in depth keeps the badge
    well-formed if the input shape ever drifts."""
    raw = badges._flat_badge_svg('<script>"&', 'a>"b', "#fff")
    assert "<script>" not in raw
    assert "&lt;script&gt;" in raw
    # No bare double-quote leaks into an attribute body besides the legitimate
    # SVG attributes (xmlns, width, etc.). aria-label uses the escaped form.
    assert "aria-label=\"&lt;script&gt;&quot;&amp;: a&gt;&quot;b\"" in raw
    # And the unescaped sequences must not appear anywhere in the output.
    for needle in ('<script', '>"b', '&: '):
        assert needle not in raw


def test_fetch_shields_io_svg_constructs_canonical_url(monkeypatch):
    """The fetcher must hit shields.io's static/v1 endpoint with our
    label/message/color/style as query params, and identify itself with our
    User-Agent so shields.io doesn't 403 us like it does the urllib default."""
    captured: dict[str, object] = {}

    class _FakeResp:
        status = 200

        def read(self):
            return b'<svg xmlns="http://www.w3.org/2000/svg"/>'

        def __enter__(self):
            return self

        def __exit__(self, *_a):
            return False

    def _fake_urlopen(req, timeout):
        captured["url"] = req.full_url
        captured["ua"] = req.get_header("User-agent")
        captured["timeout"] = timeout
        return _FakeResp()

    monkeypatch.setattr(badges.urllib.request, "urlopen", _fake_urlopen)
    svg = badges.fetch_shields_io_svg(
        "skill scan", "clean", "brightgreen", style="for-the-badge"
    )

    assert svg is not None and svg.startswith("<svg")
    url = captured["url"]
    assert url.startswith("https://img.shields.io/static/v1?")
    assert "label=skill+scan" in url
    assert "message=clean" in url
    assert "color=brightgreen" in url
    assert "style=for-the-badge" in url
    assert "coder-skill-scanner" in captured["ua"]


def test_fetch_shields_io_svg_returns_none_on_http_error(monkeypatch):
    """A 5xx (or any non-200) shields response must surface as None so the
    caller falls back to the inline renderer, not a broken image."""

    class _BadResp:
        status = 503

        def read(self):
            return b"oops"

        def __enter__(self):
            return self

        def __exit__(self, *_a):
            return False

    monkeypatch.setattr(
        badges.urllib.request, "urlopen", lambda *a, **k: _BadResp()
    )
    assert (
        badges.fetch_shields_io_svg(
            "skill scan", "clean", "brightgreen"
        )
        is None
    )


def test_fetch_shields_io_svg_returns_none_on_exception(monkeypatch):
    """A connection error must surface as None, not propagate. Otherwise the
    publish-pages job blows up the first time shields.io has an outage."""

    def _boom(*_a, **_k):
        raise TimeoutError("network down")

    monkeypatch.setattr(badges.urllib.request, "urlopen", _boom)
    assert badges.fetch_shields_io_svg("a", "b", "red") is None


def test_status_badge_svg_uses_shields_when_available(monkeypatch):
    """Happy-path: shields.io returns a body, we surface those exact bytes."""
    sentinel = '<svg xmlns="http://www.w3.org/2000/svg">SHIELDS</svg>'
    monkeypatch.setattr(
        badges, "fetch_shields_io_svg", lambda *a, **k: sentinel
    )
    assert badges.status_badge_svg("clean") == sentinel


def test_score_badge_svg_passes_message_and_color_to_shields(monkeypatch):
    """The score badge has to flow ``<n>/100`` and the banded colour name into
    the shields call, not the local hex (shields wants colour names)."""
    captured: dict[str, object] = {}

    def _capture(label, message, color, *, style):
        captured["label"] = label
        captured["message"] = message
        captured["color"] = color
        captured["style"] = style
        return "<svg/>"

    monkeypatch.setattr(badges, "fetch_shields_io_svg", _capture)
    badges.score_badge_svg(95)
    assert captured == {
        "label": "risk score",
        "message": "95/100",
        "color": "red",
        "style": badges.DEFAULT_BADGE_STYLE,
    }
