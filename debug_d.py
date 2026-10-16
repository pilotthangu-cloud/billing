import json

with open(r"C:\Users\chand\.gemini\antigravity\scratch\pharma-pos\src\data\medicines.json", "r") as f:
    meds = json.load(f)

matches = [m for m in meds if "d" in m["name"].lower() or "d" in m.get("generic", "").lower()][:15]
for i, m in enumerate(matches):
    print(f"[{i}] name: {repr(m['name'])} | generic: {repr(m.get('generic'))} | rack: {repr(m.get('rack'))}")
