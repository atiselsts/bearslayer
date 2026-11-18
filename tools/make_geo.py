# Generates the Latvia geography block for game.js from Natural Earth 1:10m GeoJSON (public domain).
# Usage: python3 tools/make_geo.py <dir with ne_10m_*.geojson> <out.js>
# Needs ne_10m_admin_0_countries, ne_10m_admin_1_states_provinces, ne_10m_rivers_lake_centerlines,
# ne_10m_rivers_europe, ne_10m_lakes and ne_10m_lakes_europe from github.com/nvkelso/natural-earth-vector.
# The river widths in game.js are set by hand afterwards, and Aiviekste is dropped.
import json, sys, math
d, out = sys.argv[1], sys.argv[2]
LON0, LON1, LAT0, LAT1 = 20.6, 28.6, 55.4, 58.3     # area kept for the overview

def load(n): return json.load(open(d + '/ne_10m_' + n + '.geojson'))
def polys_of(g):
    return g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]

def rdp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy)
    best, bi = -1, 0
    for i in range(1, len(pts) - 1):
        p = pts[i]
        dd = abs(dy * (p[0] - a[0]) - dx * (p[1] - a[1])) / L if L else math.hypot(p[0] - a[0], p[1] - a[1])
        if dd > best: best, bi = dd, i
    if best <= eps: return [a, b]
    return rdp(pts[:bi + 1], eps)[:-1] + rdp(pts[bi:], eps)

def simplify_ring(ring, eps):
    # squash longitude so tolerance is even on the ground
    k = 0.545
    sq = [(x * k, y) for x, y in ring]
    n = len(sq)
    # split at the farthest pair so rdp has two open halves
    j = max(range(n), key=lambda i: (sq[i][0] - sq[0][0]) ** 2 + (sq[i][1] - sq[0][1]) ** 2)
    h = rdp(sq[:j + 1], eps)[:-1] + rdp(sq[j:] + [sq[0]], eps)[:-1]
    return [(x / k, y) for x, y in h]

def clip(ring):
    # Sutherland-Hodgman against the kept rectangle
    def side(pts, inside, inter):
        out = []
        for i in range(len(pts)):
            c, p = pts[i], pts[i - 1]
            if inside(c):
                if not inside(p): out.append(inter(p, c))
                out.append(c)
            elif inside(p): out.append(inter(p, c))
        return out
    def ix(x):
        return lambda p, c: (x, p[1] + (c[1] - p[1]) * (x - p[0]) / (c[0] - p[0]))
    def iy(y):
        return lambda p, c: (p[0] + (c[0] - p[0]) * (y - p[1]) / (c[1] - p[1]), y)
    pts = [tuple(q) for q in ring]
    for ins, inter in ((lambda p: p[0] >= LON0, ix(LON0)), (lambda p: p[0] <= LON1, ix(LON1)),
                       (lambda p: p[1] >= LAT0, iy(LAT0)), (lambda p: p[1] <= LAT1, iy(LAT1))):
        if not pts: break
        pts = side(pts, ins, inter)
    return pts

def flat(pts): return [round(v, 3) for p in pts for v in p]

c = load('admin_0_countries')
lv = None; neigh = []
for f in c['features']:
    a3 = f['properties']['ADM0_A3']
    if a3 == 'LVA': lv = polys_of(f['geometry'])[0][0]
    elif a3 in ('EST', 'LTU', 'BLR', 'RUS'):
        for pp in polys_of(f['geometry']):
            r = clip(pp[0])
            if len(r) > 3:
                s = simplify_ring(r, 0.006)
                if len(s) > 3: neigh.append(s)
lvs = simplify_ring(lv, 0.003)

def segd(p, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]; l2 = dx * dx + dy * dy
    t = 0 if not l2 else max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2))
    return math.hypot((p[0] - a[0] - dx * t) * 0.545, p[1] - a[1] - dy * t)
nb_full = []
for f in c['features']:
    if f['properties']['ADM0_A3'] in ('EST', 'LTU', 'BLR', 'RUS'):
        for pp in polys_of(f['geometry']):
            r = [q for q in pp[0]]
            if any(LON0 < q[0] < LON1 and LAT0 < q[1] < LAT1 for q in r): nb_full.append(r)
def near_land(p):
    for r in nb_full:
        for i in range(len(r) - 1):
            a, b = r[i], r[i + 1]
            if abs(a[0] - p[0]) > 0.2 or abs(a[1] - p[1]) > 0.2: continue
            if segd(p, a, b) < 0.01: return True
    return False
flags = [near_land(p) for p in lvs]
# runs of land border, as open polylines
n = len(lvs); runs = []
start = next((i for i in range(n) if not flags[i]), 0)
cur = []
for k in range(n + 1):
    i = (start + k) % n
    if flags[i]: cur.append(lvs[i])
    else:
        if len(cur) > 1: runs.append(cur)
        cur = [lvs[i]] if k < n else []
        if cur and k < n:
            # include the coast point that starts the run
            pass
if len(cur) > 1: runs.append(cur)

# rivers
rivers = []
want = {'Daugava': ('rivers_lake_centerlines', 'Daugava', 30), 'Gauja': ('rivers_europe', 'Gauja', 20),
        'Venta': ('rivers_europe', 'Venta', 20), 'Lielupe': ('rivers_europe', 'Mūša', 18),
        'Aiviekste': ('rivers_europe', 'Aiviekste', 12)}
for nm, (src, srcname, w) in want.items():
    best = None
    for f in load(src)['features']:
        if f['properties'].get('name') != srcname: continue
        g = f['geometry']
        lines = g['coordinates'] if g['type'] == 'MultiLineString' else [g['coordinates']]
        for l in lines:
            pts = [q for q in l if LON0 < q[0] < LON1 and LAT0 < q[1] < LAT1]
            if not best or len(pts) > len(best): best = pts
    if best:
        rivers.append({'name': nm, 'w': w, 'pts': flat(rdp([(x * 0.545, y) for x, y in best], 0.004) and
                       [(x / 0.545, y) for x, y in rdp([(x * 0.545, y) for x, y in best], 0.004)])})

lakes = []
for src in ('lakes', 'lakes_europe'):
    for f in load(src)['features']:
        for pp in polys_of(f['geometry']):
            r = pp[0]
            if all(20.9 < q[0] < 28.3 and 55.6 < q[1] < 58.1 for q in r):
                s = simplify_ring(r, 0.004)
                if len(s) > 3: lakes.append(flat(s))

# regions: rasterise the municipalities
a = load('admin_1_states_provinces')
TO = {'Vidzeme': 0, 'Zemgale': 1, 'Kurzeme': 2, 'Latgale': 4}
SEL = {'Aknistes', 'Viesites', 'Neretas', 'Salas', 'Jekabpils', 'Jaunjelgavas', 'Ilukstes'}
NORTH = {'Aizkraukles', 'Kokneses', 'Plavinu', 'Skriveru', 'Krustpils'}
RIGA_KUR = {'Engures', 'Tukums', 'Kandavas', 'Jaunpils'}
RIGA_ZEM = {'Jurmala', 'Babites', 'Marupes', 'Olaines', 'Kekavas', 'Baldones'}
mun = []
for f in a['features']:
    p = f['properties']
    if p.get('adm0_a3') != 'LVA': continue
    nm, rg = p['name'], p['region']
    if nm == 'Riga': r = 5
    elif nm in SEL: r = 3
    elif nm in NORTH: r = 0
    elif rg == 'Riga': r = 2 if nm in RIGA_KUR else 1 if nm in RIGA_ZEM else 0
    else: r = TO[rg]
    for pp in polys_of(f['geometry']):
        ring = pp[0]
        xs = [q[0] for q in ring]; ys = [q[1] for q in ring]
        mun.append((r, ring, min(xs), max(xs), min(ys), max(ys)))
def pip(ring, x, y):
    inside = False; j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]; xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi: inside = not inside
        j = i
    return inside
G0, G1, H0, H1, DL, DH = 20.8, 28.4, 55.6, 58.15, 0.025, 0.014
cols, rows = int((G1 - G0) / DL) + 1, int((H1 - H0) / DH) + 1
grid = []
for ry in range(rows):
    lat = H1 - (ry + 0.5) * DH
    row = []
    for cx in range(cols):
        lon = G0 + (cx + 0.5) * DL
        v = -1
        for r, ring, x0, x1, y0, y1 in mun:
            if x0 <= lon <= x1 and y0 <= lat <= y1 and pip(ring, lon, lat): v = r; break
        row.append(v)
    grid.append(row)
# grow regions outwards so the smooth stretch doesn't fade at the borders
for it in range(4):
    new = [r[:] for r in grid]
    for y in range(rows):
        for x in range(cols):
            if grid[y][x] >= 0: continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                X, Y = x + dx, y + dy
                if 0 <= X < cols and 0 <= Y < rows and grid[Y][X] >= 0: new[y][x] = grid[Y][X]; break
    grid = new
def rle(row):
    s, i = '', 0
    while i < len(row):
        j = i
        while j < len(row) and row[j] == row[i]: j += 1
        s += (str(j - i) if j - i > 1 else '') + ('.' if row[i] < 0 else 'abcdef'[row[i]])
        i = j
    return s

js = []
js.append('// Geography from Natural Earth (public domain), simplified. Rings and lines are flat [lon, lat, lon, lat, ...].')
js.append('const LV_LL = ' + json.dumps(flat(lvs)) + ';')
js.append('// stretches of Latvia\'s outline that are land borders (the rest is coast)')
js.append('const BORDER_LL = ' + json.dumps([flat(r) for r in runs]) + ';')
js.append('const NEIGH_LL = ' + json.dumps([flat(r) for r in neigh]) + ';')
js.append('const RIVERS_LL = ' + json.dumps(rivers, ensure_ascii=False) + ';')
js.append('const LAKES_LL = ' + json.dumps(lakes) + ';')
js.append('// regions on a lon/lat grid: run-length rows of regions (a = REGIONS[0], b = REGIONS[1], ...), "." for outside')
js.append('const REGION_GRID = ' + json.dumps({'lon0': G0, 'lat0': H1, 'dlon': DL, 'dlat': DH, 'cols': cols,
          'rows': [rle(r) for r in grid]}) + ';')
open(out, 'w').write('\n'.join(js) + '\n')
print(len(lvs), sum(flags), len(runs), [len(r) for r in neigh], [ (r['name'], len(r['pts'])//2) for r in rivers], len(lakes), cols, rows)
