from pathlib import Path
p = Path('storage/qgis-exports/active-export.json')
text = p.read_text(encoding='utf-8', errors='ignore')
needle = '"PIN":"149-00-024-05-158"'
idx = text.find(needle)
print('idx', idx)
if idx == -1:
    raise SystemExit('not found')
start = max(0, idx-500)
end = min(len(text), idx+500)
snippet = text[start:end]
print(snippet)
for key in ['Assessors Data_TotalArea', 'TotalArea', 'AREA (m²)', 'AREA', 'area', 'Assessors Data_Area', 'Assessors Data_TOTALAREA', 'Assessors Data_Totalarea', 'Assessors Data_totalarea']:
    if key in snippet:
        print('FOUND', key)
