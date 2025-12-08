# app/make_canonical_all.py
import os, sys
from app.make_canonical import make_canonical

RAW_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw")
# collect unique enrollment prefixes
prefixes = set()
for fname in os.listdir(RAW_DIR):
    if "_" in fname:
        prefixes.add(fname.split("_", 1)[0])

print("Found enrollment prefixes:", prefixes)
for p in sorted(prefixes):
    print("Processing", p)
    try:
        make_canonical(p)
    except Exception as e:
        print("Failed for", p, ":", e)
