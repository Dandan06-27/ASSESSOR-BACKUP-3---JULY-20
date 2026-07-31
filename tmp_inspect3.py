from pathlib import Path
for path in ['frontend/layers/TOLEDOPARCELS_0.js', 'storage/qgis-exports/active-export.json']:
    p = Path(path)
    if not p.exists():
        print(path, 'MISSING')
        continue
    text = p.read_text(encoding='utf-8', errors='ignore')
    print('\n==', path, 'size=', len(text))
    needle = '"PIN":"149-00-024-05-158"'
    idx = text.find(needle)
    if idx == -1:
        print('exact PIN string not found for', path)
    else:
        print('exact PIN index', idx)
        start = max(0, idx-400)
        snippet = text[start:idx+600]
        print(snippet)
    # search alternate matches
    for needle in ['"SERVER PIN":"149-00-024-05-158"', '"Assessors Data_SERVER PIN":"149-00-024-05-158"', '"Assessors Data_PARCEL NO":"158"', '149-00-024-05-158-2001']:
        idx = text.find(needle)
        print('needle', needle, 'idx', idx)
    # area keys around first occurrence of exact PIN or alternative
    alt = text.find('149-00-024-05-158')
    if alt != -1:
        start = max(0, alt-400)
        end = min(len(text), alt+700)
        snippet = text[start:end]
        print('snippet around first 149...:', snippet)
        for key in ['Assessors Data_TotalArea','TotalArea','AREA (m²)','AREA','area','Assessors Data_Area','Assessors Data_TOTALAREA','AREA_M2','Assessors Data_Totalarea']:
            if key in snippet:
                print('FOUND', key)
