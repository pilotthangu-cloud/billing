import struct
import os

def read_dbf_header(filename):
    if not os.path.exists(filename):
        return None
    with open(filename, 'rb') as f:
        header = f.read(32)
        if len(header) < 32:
            return None
        num_records, header_len, record_len = struct.unpack('<IHH', header[4:12])
        num_fields = (header_len - 33) // 32
        fields = []
        for _ in range(num_fields):
            fld_bytes = f.read(32)
            name = fld_bytes[:11].replace(b'\x00', b'').decode('latin1').strip()
            fld_type = chr(fld_bytes[11])
            fld_len = fld_bytes[16]
            fld_dec = fld_bytes[17]
            fields.append((name, fld_type, fld_len, fld_dec))
        return {
            'num_records': num_records,
            'record_len': record_len,
            'fields': fields
        }

dirs = [r"D:\LOCAL DISK\RETAILG4\DATA", r"D:\LOCAL DISK\TESTG\T"]
tables_to_check = [
    'ITEMFILE', 'ITEM_DET', 'SUPPMAST', 'PURCHASE', 'DOCTOR', 'CUSTOMER',
    'DUEBILL', 'STOK_OUT', 'SUBSTITU', 'USER', 'CONTROL', 'FREEREPL',
    'CHEQUES', 'TAX', 'ACCTBOOK', 'RECEIPT', 'ORDERS', 'PHARMA', 'PR_RET', 'CHANGE'
]

for tbl in tables_to_check:
    found = False
    for d in dirs:
        path = os.path.join(d, tbl + '.DBF')
        info = read_dbf_header(path)
        if info:
            found = True
            fld_str = ", ".join([f"{name}({t}:{l})" for name, t, l, dec in info['fields']])
            print(f"[{tbl}] Records: {info['num_records']} | Fields: {fld_str}")
            break
    if not found:
        print(f"[{tbl}] Not found")
