import struct

def load_dbf(filepath):
    with open(filepath, "rb") as f:
        header = f.read(32)
        num_records = struct.unpack("<I", header[4:8])[0]
        header_len = struct.unpack("<H", header[8:10])[0]
        record_len = struct.unpack("<H", header[10:12])[0]
        
        fields = []
        while True:
            field_data = f.read(32)
            if not field_data or field_data[0] == 0x0D: break
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

_, items = load_dbf(r"D:\LOCAL DISK\RETAILG4\DATA\ITEMFILE.DBF")
print("Total in ITEMFILE:", len(items))

pac_items = [it for it in items if it["IT_NAME"].strip().upper().startswith("PA")]
print(f"Items starting with PA in master DBF: {len(pac_items)}")
for it in pac_items[:20]:
    print(" ", it["IT_NAME"].strip(), "| Code:", it["IT_CODE"], "| Rack:", it.get("RACK"))
