"""Check integrity of the imported corpus, provenance and global deduplication."""
import collections
import hashlib
import json
import pathlib
import re

root = pathlib.Path(__file__).resolve().parent.parent / "data"
index = json.loads((root / "index.json").read_text())
meta = json.loads((root / "meta.json").read_text())
assert len(index) == meta["total"]
assert len({r["id"] for r in index}) == len(index), "Duplicate IDs"
assert dict(collections.Counter(r["category"] for r in index)) == meta["categories"]
sources = {s["id"] for s in meta["sources"]}
chunks = {}
hashes = set()
source_counts = collections.Counter()
for row in index:
    chunk = row["chunk"]
    if chunk not in chunks:
        chunks[chunk] = json.loads((root / f"prompts-{chunk}.json").read_text())
    prompt = chunks[chunk][row["id"]]
    assert isinstance(prompt, str) and prompt.strip()
    digest = hashlib.sha256(re.sub(r"\s+", " ", prompt.strip()).lower().encode()).hexdigest()
    assert digest not in hashes, f"Duplicate prompt: {row['id']}"
    hashes.add(digest)
    assert row["origins"], f"Missing provenance: {row['id']}"
    for origin in row["origins"]:
        assert origin["source"] in sources
        assert not origin["url"] or origin["url"].startswith("https://")
    source_counts.update({o["source"] for o in row["origins"]})
for s in meta["sources"]:
    assert source_counts[s["id"]] == s["imported"]
album = next(r for r in index if r["shortcut"] == "/albumcover")
assert album["featured"] and album["language"] == "pt"
assert "[título]" in chunks[album["chunk"]][album["id"]]
assert index[0]["id"] == album["id"]
assert all(meta["categories"][c] > 0 for c in ["imagens", "escrita", "estudos", "programacao", "negocios"])
print(f"OK: {len(index):,} distinct prompts, {len(chunks)} chunks, provenance and counts consistent.")
