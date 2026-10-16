import os, re

src = r"C:\Users\chand\.gemini\antigravity\scratch\pharma-pos\src"
for root, dirs, files in os.walk(src):
    for f in files:
        if f.endswith('.jsx') or f.endswith('.html'):
            p = os.path.join(root, f)
            with open(p, 'r', encoding='utf-8') as fp:
                c = fp.read()
                matches = re.findall(r'className\s*=\s*[\'\"`][^\'\"]*?\bdark\b[^\'\"]*?[\'\"`]', c)
                if matches:
                    print(f, matches)
