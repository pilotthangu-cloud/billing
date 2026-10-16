import struct
import json

def load_dbf(filepath):
    with open(filepath, "rb") as f:
        header = f.read(32)
        num_records = struct.unpack("<I", header[4:8])[0]
        header_len = struct.unpack("<H", header[8:10])[0]
        record_len = struct.unpack("<H", header[10:12])[0]
        
        fields = []
        while True:
            field_data = f.read(32)
            if not field_data or field_data[0] == 0x0D:
                break
            name = field_data[:11].replace(b"\x00", b"").decode("latin-1", "ignore").strip()
            typ = chr(field_data[11])
            length = field_data[16]
            fields.append((name, typ, length))
        
        f.seek(header_len)
        records = []
        for _ in range(num_records):
            rec = f.read(record_len)
            if not rec or rec[0] == 0x2A: continue
            pos = 1
            rec_dict = {}
            for name, typ, length in fields:
                val = rec[pos:pos+length].decode("latin-1", "ignore").strip()
                rec_dict[name] = val
                pos += length
            records.append(rec_dict)
        return fields, records

_, suppliers = load_dbf(r"D:\LOCAL DISK\RETAILG4\DATA\SUPPMAST.DBF")
cleaned = []
for s in suppliers:
    if s.get("SP_NAME"):
        cleaned.append({
            "code": s.get("SP_CODE", ""),
            "name": s.get("SP_NAME", ""),
            "address": f"{s.get('ADD1', '')}, {s.get('ADD3', '')}".strip(" ,"),
            "phone": s.get("TELEPHONE", ""),
            "contact": s.get("CONTACT", "")
        })

out_p = r"C:\Users\chand\.gemini\antigravity\scratch\pharma-pos\src\data\suppliers.json"
with open(out_p, "w", encoding="utf-8") as f:
    json.dump(cleaned, f, indent=2)

print(f"Exported {len(cleaned)} suppliers to {out_p}")
