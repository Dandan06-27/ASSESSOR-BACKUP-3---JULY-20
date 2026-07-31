from pathlib import Path
import re
path = Path('frontend/layers/TOLEDOPARCELS_0.js')
text = path.read_text(encoding='utf-8', errors='ignore')
needle = '"PIN":"149-00-024-05-158"'
start = text.find(needle)
print('idx', start)
if start == -1:
    raise SystemExit('not found')
# Find start of properties object
prop_start = text.rfind('{"properties":', 0, start)
if prop_start == -1:
    raise SystemExit('properties start not found')
prop_text = text[prop_start:start+1000]
# extend until end of properties object using simple depth tracking
brace = 0
in_str = False
esc = False
end = None
for i in range(prop_start, len(text)):
    ch = text[i]
    if ch == '\\' and not esc:
        esc = True
        continue
    if ch == '"' and not esc:
        in_str = not in_str
    if not in_str:
        if ch == '{': brace += 1
        elif ch == '}':
            brace -= 1
            if brace == 0:
                end = i + 1
                break
    esc = False
if end is None:
    raise SystemExit('no end')
props = text[prop_start:end]
print(props[:2000])
print('---')
# Find all keys
keys = re.findall(r'"([^"]+)":', props)
print('keys', keys)
for k in keys:
    if 'area' in k.lower() or 'unit' in k.lower():
        print('key', k, 'value', re.search(rf'"{re.escape(k)}":("[^"]*"|[^,}}]+)', props).group(1))
