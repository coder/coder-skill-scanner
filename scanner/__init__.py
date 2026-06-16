"""coder-skill-scanner: periodic security scanner for agent skills.

The package exposes a small CLI (``python -m scanner ...`` or ``scanner ...``)
with four subcommands: ``enumerate``, ``combine``, ``aggregate``, ``validate``.
The scheduled GitHub Actions workflow in ``.github/workflows/scan.yaml``
chains these together. Local development can run the same commands with
``make test`` or invoke them directly.
"""

__version__ = "0.1.0"
__all__ = ["__version__"]
