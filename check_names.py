import json

with open(r"C:\Users\chand\.gemini\antigravity\scratch\pharma-pos\src\data\medicines.json", "r") as f:
    meds = json.load(f)

print(f"Total meds: {len(meds)}")
blank_names = [m for m in meds if not m.get("name")]
print(f"Blank names: {len(blank_names)}")

# Check first 15 meds
for i, m in enumerate(meds[:15]):
    print(f"[{i}] name: {repr(m.get('name'))} | batches: {len(m.get('batches', []))}")
