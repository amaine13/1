#!/usr/bin/env python3
"""Extract the Introduction and Chapters 1–3 and seed them into Firestore.

Chapter HTML is never written into the public site. This script is the only
path that should load sample text into Firebase.

Usage:
  python3 scripts/seed_chapters.py --manuscript /path/to/manuscript.docx
  python3 scripts/seed_chapters.py --manuscript /path/to/manuscript.docx --print-only
  python3 scripts/seed_chapters.py --manuscript /path/to/manuscript.docx --project YOUR_PROJECT_ID

Credentials (for --project / live seed):
  export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
"""

from __future__ import annotations

import argparse
import html
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}

CHAPTERS = (
    ("intro", "There's Always Another Bus", "Introduction", "Chapter 1"),
    ("1", "Meet Your Bus!", "Chapter 1", "Chapter 2"),
    ("2", "How Passengers Board the Bus", "Chapter 2", "Chapter 3"),
    ("3", "Emotional Baggage", "Chapter 3", "Chapter 4"),
)


def paragraph_text(paragraph: ET.Element) -> str:
    return "".join((node.text or "") for node in paragraph.findall(".//w:t", NS))


def read_paragraphs(docx_path: Path) -> list[str]:
    with zipfile.ZipFile(docx_path) as archive:
        root = ET.fromstring(archive.read("word/document.xml"))
    return [paragraph_text(p) for p in root.findall(".//w:p", NS)]


def find_start(paragraphs: list[str], prefix: str) -> int:
    needle = prefix.casefold()
    for index, text in enumerate(paragraphs):
        if text.strip().casefold().startswith(needle):
            return index
    raise SystemExit(f"Could not find heading starting with {prefix!r}")


def slice_chapter(paragraphs: list[str], start_prefix: str, end_prefix: str) -> list[str]:
    start = find_start(paragraphs, start_prefix)
    end = find_start(paragraphs, end_prefix)
    return paragraphs[start:end]


def is_bus_stop(text: str) -> bool:
    return "BUS STOP" in text.upper() and "PRACTICE" in text.upper()


def is_chapter_heading(text: str) -> bool:
    stripped = text.strip()
    return bool(re.match(r"^Chapter\s+\d+", stripped, flags=re.I)) or stripped.casefold().startswith(
        "introduction"
    )


def to_html(paragraphs: list[str]) -> str:
    parts: list[str] = []
    in_bus_stop = False

    def close_stop() -> None:
        nonlocal in_bus_stop
        if in_bus_stop:
            parts.append("</aside>")
            in_bus_stop = False

    for raw in paragraphs:
        text = raw.strip()
        if not text or is_chapter_heading(text):
            continue
        if is_bus_stop(text):
            close_stop()
            parts.append('<aside class="bus-stop">')
            parts.append('<p class="bus-stop-label">Bus Stop Practice</p>')
            in_bus_stop = True
            continue
        if in_bus_stop and ("—" in text or text.startswith("Going Deeper")) and len(text) < 80:
            parts.append(f"<h3>{html.escape(text)}</h3>")
            continue
        parts.append(f"<p>{html.escape(text)}</p>")

    close_stop()
    return "\n".join(parts)


def word_count(html_text: str) -> int:
    stripped = re.sub(r"<[^>]+>", " ", html_text)
    return len(re.findall(r"\S+", stripped))


def extract(docx_path: Path) -> list[dict]:
    paragraphs = read_paragraphs(docx_path)
    docs = []
    for doc_id, title, start_prefix, end_prefix in CHAPTERS:
        body_html = to_html(slice_chapter(paragraphs, start_prefix, end_prefix))
        docs.append(
            {
                "id": str(doc_id),
                "number": 0 if doc_id == "intro" else int(doc_id),
                "title": title,
                "html": body_html,
                "wordCount": word_count(body_html),
            }
        )
    return docs


def seed_firestore(docs: list[dict], project_id: str) -> None:
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
    except ImportError as exc:
        raise SystemExit(
            "Install firebase-admin first: pip install firebase-admin"
        ) from exc

    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.ApplicationDefault(), {"projectId": project_id})
    db = firestore.client()
    for doc in docs:
        payload = {
            "number": doc["number"],
            "title": doc["title"],
            "html": doc["html"],
            "wordCount": doc["wordCount"],
        }
        db.collection("chapters").document(doc["id"]).set(payload)
        print(f"Wrote chapters/{doc['id']} ({doc['wordCount']} words) — {doc['title']}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manuscript", required=True, type=Path, help="Path to the .docx manuscript")
    parser.add_argument("--project", help="Firebase / GCP project ID")
    parser.add_argument(
        "--print-only",
        action="store_true",
        help="Extract and print word counts without writing to Firestore",
    )
    args = parser.parse_args()

    if not args.manuscript.exists():
        raise SystemExit(f"Manuscript not found: {args.manuscript}")

    docs = extract(args.manuscript)
    total = sum(doc["wordCount"] for doc in docs)
    for doc in docs:
        print(f"{doc['id']}: {doc['title']} — {doc['wordCount']} words")
    print(f"Total: {total} words")

    if args.print_only:
        return
    if not args.project:
        print(
            "Dry run complete. Re-run with --project YOUR_PROJECT_ID and "
            "GOOGLE_APPLICATION_CREDENTIALS set to seed Firestore.",
            file=sys.stderr,
        )
        return
    seed_firestore(docs, args.project)


if __name__ == "__main__":
    main()
