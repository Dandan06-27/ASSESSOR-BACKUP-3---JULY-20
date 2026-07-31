from pathlib import Path
import json
p = Path('frontend/layers/TOLEDOPARCELS_0.js')
text = p.read_text(encoding='utf-8', errors='ignore')
needle = '"PIN":"149-00-024-05-158"'
idx = text.find(needle)
if idx == -1:
    raise SystemExit('PIN not found')
start = text.rfind('{"properties":', 0, idx)
if start == -1:
    raise SystemExit('properties start not found')
brace = 0
in_str = False
esc = False
end = None
for pos in range(start, len(text)):
    ch = text[pos]
    if ch == '\\' and not esc:
        esc = True
        continue
    if ch == '"' and not esc:
        in_str = not in_str
    if not in_str:
        if ch == '{':
            brace += 1
        elif ch == '}':
            brace -= 1
            if brace == 0:
                end = pos + 1
                break
    esc = False
if end is None:
    raise SystemExit('end not found')
obj_text = text[start:end]
# extract the JSON object after properties:
props_json = obj_text.split('{"properties":',1)[1]
# ensure valid JSON by appending missing braces if necessary
props = json.loads(props_json)
print('keys:', sorted(props.keys()))
for k in props:
    if 'area' in k.lower() or 'total' in k.lower() or 'unit' in k.lower() or 'pin' in k.lower():
        print(k, ':', props[k])
print('raw sample:', props.get('Assessors Data_TotalArea'), props.get('TotalArea'), props.get('AREA'), props.get('area'))
