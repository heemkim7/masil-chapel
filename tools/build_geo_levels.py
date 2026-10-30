# Builds nation-level (시·도) and per-sido 시·군·구 outlines from the dong polygons (vuski/admdongkor, 통계청 boundary basis).
import json, glob, os
from shapely.geometry import Polygon, mapping
from shapely.ops import unary_union
idx = json.load(open('assets/geo/index.json'))['d']
names = {r[0][:2]: r[3] for r in idx}; sgn = {r[0][:5]: r[2] for r in idx}
def rings(g, tol):
    g = g.simplify(tol, preserve_topology=True); ps = [g] if g.geom_type == 'Polygon' else list(g.geoms)
    return [[[round(x, 3 if tol > .005 else 4), round(y, 3 if tol > .005 else 4)] for x, y in p.exterior.coords] for p in ps if p.area > tol * tol * 4]
nation = {}
for f in sorted(glob.glob('assets/geo/sido_*.json')):
    k = f[-7:-5]; D = json.load(open(f)); by = {}
    for cd, rs in D.items():
        for r in rs:
            try:
                p = Polygon(r).buffer(0)
                if not p.is_empty: by.setdefault(cd[:5], []).append(p)
            except Exception: pass
    sg = {}; allp = []
    for c5, ps in by.items():
        u = unary_union(ps).buffer(0.0008).buffer(-0.0008); allp.append(u)
        sg[c5] = {'n': sgn.get(c5, c5), 'r': rings(u, .002)}
    json.dump(sg, open(f'assets/geo/sgg_{k}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    nation[k] = {'n': names[k], 'r': rings(unary_union(allp).buffer(0.003).buffer(-0.003), .012)}
json.dump(nation, open('assets/geo/nation.json', 'w'), ensure_ascii=False, separators=(',', ':'))
