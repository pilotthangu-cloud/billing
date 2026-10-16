with open(r"D:\LOCAL DISK\RETAILG4\RETAIL.exe", "rb") as f:
    data = f.read()

import re

# Harbour symbol table contains entries like HB_FUN_MAS001 etc.
# In 32-bit Harbour binaries, string tables and p-code are organized by function.
# Let's search for occurrences of each function name and find nearby text strings (screen titles, prompts, file names).
all_funcs = [
    "MAS001", "MAS002", "MAS003", "MAS004", "MAS005", "MAS006", "MAS007", "MAS008", "MAS009", "MAS010", "MAS011",
    "TRN001", "TRN001A", "TRN002", "TRN003", "TRN004", "TRN005", "TRN006", "TRN008",
    "REP001", "REP002", "REP003", "REP004", "REP005", "REP006", "REP007", "REP008", "REP009", "REP010",
    "REP011", "REP012", "REP013", "REP014", "REP015", "REP016", "REP017", "REP018", "REP019", "REP020",
    "REP021", "REP022", "REP023", "REP024", "REP025", "REP026", "REP027", "REP028", "REP030", "REP033",
    "REP034", "REP035",
    "SYS001", "SYS003", "SYS004", "SYS005", "SYS006", "SYS007", "SYS008", "SYS009", "SYS010", "SYS011",
    "SYS012", "SYS013", "SYS014", "SYS015", "SYS016", "SYS017",
    "DUEBILL", "CHEQUES", "PAYMENTS", "SHORTAGE", "CANCELBILL", "STOCKEVL", "PURCHREG", "PURCHRG1", "XL_IMP", "BLOCKED", "BRORDER", "PENDINGS", "UNPAIDBL"
]

results = {}
for fn in all_funcs:
    # Find all occurrences of HB_FUN_<fn>
    pattern = b"HB_FUN_" + fn.encode('ascii')
    positions = [m.start() for m in re.finditer(pattern, data)]
    
    # Also find where the code for this function is
    # In Harbour, function bodies start near HB_FUN_<fn> or have pcode
    strings_near = []
    for pos in positions:
        chunk = data[pos:pos+4000]
        # extract ASCII strings >= 3 chars
        strs = re.findall(rb'[\x20-\x7e]{3,}', chunk)
        for s in strs:
            st = s.decode('latin1').strip()
            # filter out compiler noise
            if st and not any(noise in st for noise in ['HB_', '__', 'PTR', 'CLIPPER', 'HARBOUR', 'PCOUNT', 'VALTYPE']):
                if len(st) > 3 and st not in strings_near:
                    strings_near.append(st)
    
    results[fn] = strings_near[:15]

for fn, s_list in sorted(results.items()):
    print(f"\n=== {fn} ===")
    print(" | ".join(s_list[:10]))
