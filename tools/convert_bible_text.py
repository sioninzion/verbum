"""Convert the 개역개정 full-text .txt files (CP949-encoded, one per book)
into per-book JSON files the app can lazy-fetch by book code.

Each source line looks like:
  창1:1 <천지 창조> 태초에 하나님이 천지를 창조하시니라
  창1:2 땅이 혼돈하고 공허하며 흑암이 깊음 위에 있고 ...

i.e. "{book abbr}{chapter}:{verse} {optional <section heading>} {verse text}",
one verse per line, no blank-line separators.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "개역개정-text"
OUTPUT_DIR = ROOT / "data" / "bible-text"

# Book name (matches export_bible_data.py) -> (source filename, bskorea code)
BOOKS = [
    ("창세기", "1-01창세기.txt", "GEN"), ("출애굽기", "1-02출애굽기.txt", "EXO"),
    ("레위기", "1-03레위기.txt", "LEV"), ("민수기", "1-04민수기.txt", "NUM"),
    ("신명기", "1-05신명기.txt", "DEU"), ("여호수아", "1-06여호수아.txt", "JOS"),
    ("사사기", "1-07사사기.txt", "JDG"), ("룻기", "1-08룻기.txt", "RUT"),
    ("사무엘상", "1-09사무엘상.txt", "1SA"), ("사무엘하", "1-10사무엘하.txt", "2SA"),
    ("열왕기상", "1-11열왕기상.txt", "1KI"), ("열왕기하", "1-12열왕기하.txt", "2KI"),
    ("역대상", "1-13역대상.txt", "1CH"), ("역대하", "1-14역대하.txt", "2CH"),
    ("에스라", "1-15에스라.txt", "EZR"), ("느헤미야", "1-16느헤미야.txt", "NEH"),
    ("에스더", "1-17에스더.txt", "EST"), ("욥기", "1-18욥기.txt", "JOB"),
    ("시편", "1-19시편.txt", "PSA"), ("잠언", "1-20잠언.txt", "PRO"),
    ("전도서", "1-21전도서.txt", "ECC"), ("아가", "1-22아가.txt", "SNG"),
    ("이사야", "1-23이사야.txt", "ISA"), ("예레미야", "1-24예레미야.txt", "JER"),
    ("예레미야애가", "1-25예레미야애가.txt", "LAM"), ("에스겔", "1-26에스겔.txt", "EZK"),
    ("다니엘", "1-27다니엘.txt", "DAN"), ("호세아", "1-28호세아.txt", "HOS"),
    ("요엘", "1-29요엘.txt", "JOL"), ("아모스", "1-30아모스.txt", "AMO"),
    ("오바댜", "1-31오바댜.txt", "OBA"), ("요나", "1-32요나.txt", "JON"),
    ("미가", "1-33미가.txt", "MIC"), ("나훔", "1-34나훔.txt", "NAM"),
    ("하박국", "1-35하박국.txt", "HAB"), ("스바냐", "1-36스바냐.txt", "ZEP"),
    ("학개", "1-37학개.txt", "HAG"), ("스가랴", "1-38스가랴.txt", "ZEC"),
    ("말라기", "1-39말라기.txt", "MAL"), ("마태복음", "2-01마태복음.txt", "MAT"),
    ("마가복음", "2-02마가복음.txt", "MRK"), ("누가복음", "2-03누가복음.txt", "LUK"),
    ("요한복음", "2-04요한복음.txt", "JHN"), ("사도행전", "2-05사도행전.txt", "ACT"),
    ("로마서", "2-06로마서.txt", "ROM"), ("고린도전서", "2-07고린도전서.txt", "1CO"),
    ("고린도후서", "2-08고린도후서.txt", "2CO"), ("갈라디아서", "2-09갈라디아서.txt", "GAL"),
    ("에베소서", "2-10에베소서.txt", "EPH"), ("빌립보서", "2-11빌립보서.txt", "PHP"),
    ("골로새서", "2-12골로새서.txt", "COL"), ("데살로니가전서", "2-13데살로니가전서.txt", "1TH"),
    ("데살로니가후서", "2-14데살로니가후서.txt", "2TH"), ("디모데전서", "2-15디모데전서.txt", "1TI"),
    ("디모데후서", "2-16디모데후서.txt", "2TI"), ("디도서", "2-17디도서.txt", "TIT"),
    ("빌레몬서", "2-18빌레몬서.txt", "PHM"), ("히브리서", "2-19히브리서.txt", "HEB"),
    ("야고보서", "2-20야고보서.txt", "JAS"), ("베드로전서", "2-21베드로전서.txt", "1PE"),
    ("베드로후서", "2-22베드로후서.txt", "2PE"), ("요한일서", "2-23요한일서.txt", "1JN"),
    ("요한이서", "2-24요한이서.txt", "2JN"), ("요한삼서", "2-25요한삼서.txt", "3JN"),
    ("유다서", "2-26유다서.txt", "JUD"), ("요한계시록", "2-27요한계시록.txt", "REV"),
]

LINE_RE = re.compile(r"^\D+(\d+):(\S+)(?:\s+(.*))?$")
HEADING_RE = re.compile(r"^<([^>]+)>\s*(.*)$")


def parse_book(path: Path) -> dict[str, list[dict]]:
    raw = path.read_bytes().decode("cp949")
    chapters: dict[str, list[dict]] = {}

    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        match = LINE_RE.match(line)
        if not match:
            raise ValueError(f"{path.name}: unrecognized line format: {line!r}")

        chapter_num, verse_token, rest = match.groups()
        rest = rest or ""
        heading = None
        heading_match = HEADING_RE.match(rest)
        if heading_match:
            heading, rest = heading_match.groups()

        bucket = chapters.setdefault(chapter_num, [])

        if verse_token.isdigit():
            verse = {"v": int(verse_token), "t": rest}
            if heading:
                verse["h"] = heading
            bucket.append(verse)
        elif bucket:
            # A handful of source lines carry a stray non-numeric verse
            # label (export artifact around mid-verse section headings,
            # e.g. Genesis 35). Treat them as a continuation of the
            # previous verse rather than losing the text.
            prev = bucket[-1]
            prev["t"] = f"{prev['t']} {rest}".strip()
            if heading and "h" not in prev:
                prev["h"] = heading

    return chapters


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    total_verses = 0
    total_chapters = 0

    for book_name, filename, code in BOOKS:
        source_path = SOURCE_DIR / filename
        if not source_path.exists():
            raise FileNotFoundError(source_path)

        chapters = parse_book(source_path)
        book_dir = OUTPUT_DIR / code
        book_dir.mkdir(parents=True, exist_ok=True)

        for chapter_num, verses in chapters.items():
            total_verses += len(verses)
            total_chapters += 1
            out_path = book_dir / f"{chapter_num}.json"
            out_path.write_text(
                json.dumps(verses, ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8",
            )

    print(
        f"Wrote {total_chapters} chapter files across {len(BOOKS)} books to {OUTPUT_DIR} "
        f"({total_verses} verses total)."
    )


if __name__ == "__main__":
    main()
