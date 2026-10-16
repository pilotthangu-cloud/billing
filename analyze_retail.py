import re

with open(r"D:\LOCAL DISK\RETAILG4\RETAIL.exe", "rb") as f:
    data = f.read()

# Let's inspect RETAIL.PRG code inside RETAIL.exe
# Look for RETAIL.PRG symbol or line table
pos = data.find(b"RETAIL.PRG")
print("RETAIL.PRG found at:", pos)

# Find all occurrences of menu text strings and their associated functions
menu_items = [
    "Generic Master", "Product Master", "Supplier Master", "Company Master", "Complaint Master",
    "New Product Master", "Doc./Pat. Master", "Shortages", "Taxes", "User Master", "Regulars",
    "Sale Billing", "Sale Return", "Convert Excel File", "Purchase Entry", "Purchase/Expiry Return",
    "Order Creation", "Cash Maintenance", "Cash Receipts", "E File Sales", "E File Purchase",
    "Scheduled Product(s)", "B to C (S) Register", "HSN-Wise Sale Register", "Company-wise Stock",
    "Sale Register", "Expired(ing) Products", "Sale Bill Copy", "Products below R.O.Level",
    "Sale Return Register", "Daily Bill Copies", "Blocked Purchases", "Non-moving Products",
    "Monthly Stock Register", "Datewise Sale Register", "Who Supplies Whose", "Out-Of-Stock Products",
    "P.T.R. Discrepancy", "Itemwise Sale(Accumulated)", "Product Tracking(Sale)", "A Supplier's Low Product",
    "New Non-moving Products", "Pur/Exp Return Register", "New Promotions", "A Customer's Bill(s)",
    "A Doctor's Bill(s)", "<Bill Later> Billing", "Day Begin Process", "Greetings Maintenance",
    "Batch Enquiry", "Change Password", "Change Password (Home)", "Mis Match Listings",
    "View/Delete Stock-out", "View/Delete Instant", "Batch History Creation", "Exp. Return Adjustment",
    "Product Tracking(Batch)", "Change Product Company", "A User's Bill(s)", "Daily Margin",
    "Free/Repl. Register", "Cheque Register", "Itemwise Sale Register", "Purchase Ret. Register",
    "Costly Medicine Status", "Invoice Folder"
]

# Let's search for case statements or dispatch array
# In Clipper/Harbour, menus are usually dispatched via a CASE statement or array of codeblocks:
# CASE NCHOICE == 1; MAS001(); CASE NCHOICE == 2; MAS002(); ...
dispatch_symbols = re.findall(rb'(MAS\d{3}|TRN\d{3}[A-Z]?|REP\d{3}|SYS\d{3}|DUEBILL|CHEQUES|PAYMENTS|SHORTAGE|CANCELBILL|STOCKEVL|PURCHREG|PURCHRG1|XL_IMP|BLOCKED|BRORDER|PENDINGS|UNPAIDBL)', data)
print(f"Total dispatch function references found: {len(dispatch_symbols)}")
from collections import Counter
counts = Counter([s.decode('ascii') for s in dispatch_symbols])
print("\nTop functions referenced in RETAIL.exe:")
for fn, c in sorted(counts.items()):
    print(f"{fn:12}: {c} calls")
