# Credits & Attribution

This dictionary is built from **Mawadza & Matuka, Lingala Dictionary & Phrasebook, Hippocrene Books 2016**, extracted from `lingen_djvu.txt` in the project root. This is the **ONLY source of truth** for the website.

## Primary source (current)

| Field | Value |
|-------|-------|
| Dataset | Lingala-English & English-Lingala Dictionary & Phrasebook |
| Authors | Aquilina Mawadza & Yeno Matuka |
| Publisher | Hippocrene Books, Inc., New York (2016) |
| Raw file | `lingen_djvu.txt` (kept untouched in project root) |
| Extracted by | `scripts/build-from-lingen.js` (DP segmentation, scoring, merging) |
| License | **Copyrighted - All rights reserved**. Used with permission for this project. **NOT CC BY-SA**. Do not redistribute without permission. |
| Note | Phrasebook section excluded from dictionary headwords. Both Lingala-English (primary) and English-Lingala (inverted) sections were processed. OCR noise (page numbers, footers, letter headers, wrapped lines) was cleaned. Duplicates were merged by normalized Lingala + word_type, preserving distinct meanings and distinct word types. |

### Counts

- LE chunks: 1991
- EL chunks: 1836
- Raw entries before dedupe: 3980
- Unique Lingala headwords after dedupe: 2314
- Excluded (noise): 2 (in current run, see `data/processed/excluded.json`)

All 2314 entries are available on the website. Search, A–Z, Word of the Day, and detail pages all use this dataset.

## Previous source (no longer used)

The previous Wiktionary-based dataset is **no longer used** for dictionary words. It is kept only as a backup:

| Field | Value |
|-------|-------|
| Dataset | Wiktionary (English edition), extracted by Wiktextract |
| Provider | kaikki.org (https://kaikki.org/dictionary/Lingala/) |
| License | **CC BY-SA 4.0** (https://creativecommons.org/licenses/by-sa/4.0/) |
| Location | `data/raw/kaikki-lingala.jsonl` and `data/processed/dictionary.json.bak` |

If you need to restore it, see the backup file. Do not mix old and new data.

## French meanings

French translations are **not included** in the current Hippocrene extract. The book contains some French-influenced entries but the OCR text does not provide French glosses as a separate field. We do not invent French translations. If a properly licensed Lingala–French source becomes available, place it at `data/raw/french-overrides.json` and extend `scripts/build-from-lingen.js` to merge it.

## What was replaced

- `data/processed/dictionary.json` — replaced with 2314 entries from `lingen_djvu.txt` (was Wiktionary, ~1300+ entries)
- `data/processed/dictionary.csv` — regenerated
- `data/processed/excluded.json` — regenerated with OCR noise
- `data/sources.json` — updated to Hippocrene source

Original `lingen_djvu.txt` was **not deleted** and remains in the project root.
