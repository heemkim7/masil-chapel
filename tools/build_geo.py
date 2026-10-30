# Build bundled 행정동 dataset from vuski/admdongkor (ver20250401): index + simplified polygons per 시도
import json, sys
from shapely.geometry import shape, mapping
src = json.load(open(sys.argv[1] if len(sys.argv) > 1 else '/tmp/adm.json'))
idx, per = [], {}
for f in src['features']:
    p = f['properties']; g = shape(f['geometry']); c = g.representative_point()
    dong = p['adm_nm'].split(' ')[-1]
    idx.append([p['adm_cd2'], dong, p['sggnm'], p['sidonm'], round(c.y, 5), round(c.x, 5)])
    s = g.simplify(0.0004, preserve_topology=True)
    polys = [s] if s.geom_type == 'Polygon' else list(s.geoms)
    rings = [[[round(x, 5), round(y, 5)] for x, y in pg.exterior.coords] for pg in polys if pg.area > 1e-8 or len(polys) == 1]
    per.setdefault(p['sido'], {})[p['adm_cd2']] = rings
json.dump({'v': '20250401', 'src': 'vuski/admdongkor (통계청 행정구역 경계 기반)', 'd': idx}, open('assets/geo/index.json', 'w'), ensure_ascii=False, separators=(',', ':'))
for k, v in per.items(): json.dump(v, open(f'assets/geo/sido_{k}.json', 'w'), separators=(',', ':'))
print(len(idx), 'dongs', len(per), 'sido')
