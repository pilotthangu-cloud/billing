import json

with open(r"C:\Users\chand\.gemini\antigravity\scratch\pharma-pos\src\data\medicines.json", "r") as f:
    meds = json.load(f)

pas = [m for m in meds if m["name"].upper().startswith("PA")]
print("Count starting with PA:", len(pas))
for m in pas[:15]:
    print(" ", m["name"], "| Rack:", m.get("rack"), "| Stock:", m.get("stock_shop1"))
