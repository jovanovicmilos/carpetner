"""Builds fixtures/kuhinja-petrovic.json: the ONE shared example project used by every screen and test.
Format: docs/DATA_MODEL.md. Expected output follows docs/KONSTRUKCIJA.md exactly.
Usage: python3 make_fixture.py <out.json>
"""
import json, math, sys

T = 18
# ---------------------------------------------------------------- project (input)
# Walls: centerline points, mm. Interior corner A/B is (0,0). Chain is clockwise: B (from D corner up) -> A -> C -> D.
TH = 120
walls = [
    {"id": "B", "name": "Zid B", "a": {"x": -60, "y": 2460}, "b": {"x": -60, "y": -60}, "thickness": TH},
    {"id": "A", "name": "Zid A", "a": {"x": -60, "y": -60}, "b": {"x": 3260, "y": -60}, "thickness": TH},
    {"id": "C", "name": "Zid C", "a": {"x": 3260, "y": -60}, "b": {"x": 3260, "y": 2460}, "thickness": TH},
    {"id": "D", "name": "Zid D", "a": {"x": 3260, "y": 2460}, "b": {"x": -60, "y": 2460}, "thickness": TH},
]
# offset = from the INTERIOR face at the wall's start (what the UI shows as "od početka zida"); side +1 = room side
openings = [
    {"id": "W1", "kind": "window", "wallId": "A", "offset": 1100, "width": 1000, "height": 1200, "sill": 1000},
    {"id": "V1D", "kind": "door", "wallId": "D", "offset": 400, "width": 900, "height": 2050, "sill": 0, "swing": "into-room", "hinge": "R"},
]
obstacles = [
    {"id": "RAD", "kind": "radiator", "wallId": "C", "offset": 800, "width": 800, "depth": 100, "height": 600, "side": 1},
    {"id": "KAN", "kind": "duct", "x": 2950, "y": 2150, "width": 250, "depth": 250, "height": 2600},
]
installations = [
    {"id": "V", "kind": "water", "wallId": "A", "offset": 1500, "height": 500, "side": 1},
    {"id": "O", "kind": "drain", "wallId": "A", "offset": 1650, "height": 450, "diameter": 50, "side": 1},
    {"id": "S1", "kind": "power", "wallId": "A", "offset": 2100, "height": 300, "side": 1, "note": "MSP"},
    {"id": "S2", "kind": "power", "wallId": "A", "offset": 2700, "height": 1100, "side": 1},
    {"id": "S3", "kind": "power400", "wallId": "B", "offset": 1500, "height": 600, "side": 1, "note": "rerna i ploča"},
    {"id": "S4", "kind": "power", "wallId": "B", "offset": 300, "height": 1950, "side": 1, "note": "frižider"},
]
mats = {"carcass": "iv18-w980", "front": "iv18-u708", "back": "hdf3", "drawerBottom": "iv16-w980"}
def E(id, kind, wall, off, W, H=720, D=560, **k):
    d = dict(id=id, kind=kind, wallId=wall, offset=off, side=1, width=W, height=H, depth=D, materials=dict(mats))
    d.update(k); return d
elements = [
    E("D1", "corner-blind", "A", 0, 1000, legs=100, shelves=1, doors=1, hinge="R", blindWidth=400),
    E("D2", "sink", "A", 1000, 800, legs=100, shelves=0, doors=2, hinge="LR"),
    E("D3", "appliance-front", "A", 1800, 600, hinge="down", note="ugradna MSP"),
    E("D4", "drawer", "A", 2400, 600, legs=100, drawerFronts=[176, 266, 266]),
    E("F", "filler", "A", 3000, 200),
    E("D5", "oven", "B", 1200, 600, legs=100, drawerFronts=[116]),
    E("D6", "base", "B", 600, 600, legs=100, shelves=1, doors=1, hinge="L"),
    E("V1", "tall", "B", 0, 600, H=2070, legs=100, doors=2, hinge="L", note="frižider: krilo 1696 + 366"),
    E("G1", "wall", "A", 0, 600, D=320, elevation=1450, shelves=1, doors=1, hinge="L"),
    E("G2", "wall", "A", 600, 400, D=320, elevation=1450, shelves=1, doors=1, hinge="R"),
    E("G3", "wall", "A", 2200, 600, D=320, elevation=1450, shelves=1, doors=1, hinge="L"),
    E("G4", "wall", "A", 2800, 400, D=320, elevation=1450, shelves=1, doors=1, hinge="R"),
]
materials = {
    "iv18-w980": {"id": "iv18-w980", "name": "Iverica 18 bela W980", "thickness": 18, "kind": "chipboard", "sheet": {"l": 2800, "w": 2070}, "grain": False},
    "iv18-u708": {"id": "iv18-u708", "name": "Iverica 18 siva U708", "thickness": 18, "kind": "chipboard", "sheet": {"l": 2800, "w": 2070}, "grain": False},
    "hdf3": {"id": "hdf3", "name": "HDF 3 bela", "thickness": 3, "kind": "hdf", "sheet": {"l": 2800, "w": 2070}, "grain": False},
    "iv16-w980": {"id": "iv16-w980", "name": "Iverica 16 bela W980", "thickness": 16, "kind": "chipboard", "sheet": {"l": 2800, "w": 2070}, "grain": False},
}
rules = dict(carcassThickness=18, backMode="nailed", backReduction=4, frontGap=3, bottomMode="between", joint="dowel+confirmat",
             carcassEdge=dict(material="Bela", thickness=0.8), frontEdge=dict(material="ABS U708", thickness=2),
             deductEdgeFromCutMinThickness=1, wasteFactor=0.15, edgeExtra=0.10, followGrain=True,
             backCutout=dict(margin=75, round=50, minWidth=300, minHeight=250, edgeClearance=30), staplePitch=150)

# ---------------------------------------------------------------- expected (engine output)
parts = []; hw = {}
def add(k, n): hw[k] = hw.get(k, 0) + n
def P(e, name, mat, q, L, W, edges, note=None):
    # edges = (L1, L2, W1, W2) for the (L, W) given. Normalize: without grain, length = longer side.
    if not materials[mat]["grain"] and W > L:
        L, W = W, L; edges = (edges[2], edges[3], edges[0], edges[1])
    ded = lambda t: t if t >= 1 else 0
    p = dict(elementId=e["id"], pos=f'{e["id"]}-{sum(1 for x in parts if x["elementId"] == e["id"]) + 1}', name=name, materialId=mat,
             qty=q, length=L, width=W, edges=dict(L1=edges[0], L2=edges[1], W1=edges[2], W2=edges[3]),
             cutLength=L - ded(edges[2]) - ded(edges[3]), cutWidth=W - ded(edges[0]) - ded(edges[1]))
    if note: p["note"] = note
    parts.append(p); return p
C = (0.8, 0, 0, 0); FR = (2, 2, 2, 2); N = (0, 0, 0, 0)
def hinges(h): return 2 if h <= 900 else 3 if h <= 1600 else 4 if h <= 2000 else 5
def horiz(n, ends_t, ends_c): add("tipl-8x35", n * 2 * ends_t); add("konfirmat-7x50", n * 2 * ends_c)
def staples(L, W): return math.floor(2 * (L + W) / rules["staplePitch"])
def cutout(e):
    base = e.get("legs", e.get("elevation", 0))
    ins = [i for i in installations if i["wallId"] == e["wallId"] and i["side"] == e["side"] and e["offset"] <= i["offset"] <= e["offset"] + e["width"]
           and base <= i["height"] <= base + e["height"]]
    if not ins: return None
    bc = rules["backCutout"]
    xs = [i["offset"] - e["offset"] for i in ins]; ys = [i["height"] - base for i in ins]
    r = lambda v: int(math.ceil(v / bc["round"]) * bc["round"])
    w = max(bc["minWidth"], r(max(xs) - min(xs) + 2 * bc["margin"])); h = max(bc["minHeight"], r(max(ys) - min(ys) + 2 * bc["margin"]))
    cx = (max(xs) + min(xs)) / 2; cy = (max(ys) + min(ys)) / 2
    names = "+".join({"water": "V", "drain": "O", "power": "S", "power400": "T", "gas": "G"}[i["kind"]] for i in ins)
    return dict(w=w, h=h, cx=round(cx), cy=round(cy), names=names)
back_cutouts = {}
for e in elements:
    W, H, D, k = e["width"], e["height"], e["depth"], e["kind"]; iw = W - 2 * T
    if k in ("base", "sink", "drawer", "oven", "corner-blind"):
        P(e, "Stranica", mats["carcass"], 2, H, D, C)
        P(e, "Pod", mats["carcass"], 1, iw, D, C); horiz(1, 3, 2)
        nl = 1 if k == "oven" else 2
        P(e, "Vezni komad", mats["carcass"], nl, iw, 100, C); horiz(nl, 2, 1)
        if e.get("shelves"): P(e, "Fah", mats["carcass"], e["shelves"], iw, D - 20, C); add("nosac-police", 4 * e["shelves"])
        # corner unit: 2 stubići (L profile the door closes on), floor → front rail, as wide as the rail; the blind part stays empty
        if k == "corner-blind": P(e, "Stubić", mats["carcass"], 2, H - 2 * T, 100, C)
        if k != "oven":
            co = cutout(e); note = None
            if co: back_cutouts[e["id"]] = co; note = f'izrez {co["w"]}×{co["h"]} za {co["names"]}'
            p = P(e, "Poleđina", mats["back"], 1, W - 4, H - 4, N, note); add("klamerica", staples(p["length"], p["width"]))
        add("nogica-100", 4); add("klipsa-sokla", 2)
        if k == "sink": add("alu-podloga-sudopera", 1)
    if k in ("base", "sink", "corner-blind"):
        n = e["doors"]; dw = (W - 3) if n == 1 else (W - 6) // 2
        if k == "corner-blind": dw = W - e["blindWidth"] - 3
        P(e, "Krilo", mats["front"], n, H - 4, dw, FR); add("sarka", n * hinges(H - 4)); add("rucka", n)
    if k in ("drawer", "oven"):
        for h in e["drawerFronts"]: P(e, "Fronta fioke", mats["front"], 1, W - 3, h, FR)
        # Drawer box (KONSTRUKCIJA "Fioke i klizači"), default slide GTV H45 telescopic (PK-0H45…XP, ball-bearing): NL = longest of 300..600 that is
        # <= D − 60; outer box = LW − 25 (12.5 per side), inner = outer − 2 × 16; box length = NL; side height = front − 50 down to 10,
        # min 70; front / back panel between the sides on the bottom: height − 0 (bottom flush) − 16; bottom = inner × box length.
        nd = len(e["drawerFronts"]); nl = max(l for l in range(300, 601, 50) if l <= D - 60)
        inner = iw - 25 - 2 * 16; bl = nl; hs = [max(70, (h - 50) // 10 * 10) for h in e["drawerFronts"]]
        uniq = list(dict.fromkeys(hs))
        for h in uniq: P(e, "Stranica fioke", mats["drawerBottom"], 2 * hs.count(h), bl, h, C)
        for h in uniq: P(e, "Prednja / zadnja strana fioke", mats["drawerBottom"], 2 * hs.count(h), inner, h - 0 - 16, C)
        P(e, "Pod fioke", mats["drawerBottom"], nd, inner, bl, N)
        add(f"klizac-gtv-h45-{nl}", nd); add("sraf-4x40", 12 * nd); add("rucka", nd)
    if k == "appliance-front": P(e, "Fronta MSP", mats["front"], 1, H - 4, W - 3, FR); add("rucka", 1)
    if k == "filler": P(e, "Filer", mats["front"], 1, H - 4, W - 4, FR)
    if k == "wall":
        P(e, "Stranica", mats["carcass"], 2, H, D, C); P(e, "Pod / plafon", mats["carcass"], 2, iw, D, C); horiz(2, 3, 2)
        P(e, "Fah", mats["carcass"], 1, iw, D - 20, C); add("nosac-police", 4)
        p = P(e, "Poleđina", mats["back"], 1, W - 4, H - 4, N); add("klamerica", staples(p["length"], p["width"]))
        P(e, "Krilo", mats["front"], 1, H - 4, W - 3, FR); add("sarka", hinges(H - 4)); add("rucka", 1); add("vesaljka-par", 1)
    if k == "tall":
        P(e, "Stranica", mats["carcass"], 2, H, D, C); P(e, "Pod / plafon / srednja stranica", mats["carcass"], 3, iw, D, C); horiz(3, 3, 2)
        p = P(e, "Poleđina (gornji deo)", mats["back"], 1, W - 4, 366, N); add("klamerica", staples(p["length"], p["width"]))
        P(e, "Krilo frižider", mats["front"], 1, 1696, W - 3, FR); P(e, "Krilo gornje", mats["front"], 1, 366, W - 3, FR)
        add("sarka", hinges(1696) + hinges(366)); add("rucka", 2); add("nogica-100", 4); add("klipsa-sokla", 2)
# Sokla (KONSTRUKCIJA "Sokla"), mode "po nizu": one piece per run on legs, front material, height = legs (100).
# Inside corner A/B: A reaches the corner (gap 0) and runs through to B's plinth back face (D5 depth 560 − 50 setback − 18) = 492;
# B stops 600 short of the corner and butts against A's plinth front face (D1 560 − 50) = 510 from wall A.
L_B = 1800 + (600 - (560 - 50)); L_A = 3200 - (560 - 50 - 18)
for i, L in enumerate((L_B, L_A)):  # walls in project order: B, A
    parts.append(dict(elementId=f"S{i + 1}", pos=f"S{i + 1}", name="Sokla", materialId=mats["front"], qty=1, length=L, width=100,
                      edges=dict(L1=0, L2=0, W1=0, W2=0), cutLength=L, cutWidth=100))
add("plocica-sarke", hw["sarka"]); add("sraf-3.5x16", hw["sarka"] * 2 + hw["plocica-sarke"] * 2 + hw["nogica-100"] * 4)

area = {}; edge = {}
for p in parts:
    area[p["materialId"]] = area.get(p["materialId"], 0) + p["qty"] * p["length"] * p["width"] / 1e6
    for key, ln in (("L1", p["length"]), ("L2", p["length"]), ("W1", p["width"]), ("W2", p["width"])):
        t = p["edges"][key]
        if t: edge[str(t)] = edge.get(str(t), 0) + p["qty"] * ln / 1000
sheet = 2.8 * 2.07
per_el_hw = {}
out = dict(
    _readme="JEDINI zajednički primer za sve ekrane (design/screens) i testove. Ulaz: project (format docs/DATA_MODEL.md). Izlaz: expected, po pravilima iz docs/KONSTRUKCIJA.md. Pravi ga tools/make_fixture.py.",
    project=dict(id="kuhinja-petrovic", name="Kuhinja Petrović — ugaona (L)", customer="Petrović", unit="mm", presetId="workshop", roomHeight=2600,
                 walls=walls, openings=openings, obstacles=obstacles, installations=installations, elements=elements, rules=rules, materials=materials),
    expected=dict(
        partLines=len(parts), pieceCount=sum(p["qty"] for p in parts), parts=parts,
        areaM2={k: round(v, 3) for k, v in area.items()},
        sheets={k: math.ceil(v * (1 + rules["wasteFactor"]) / sheet) for k, v in area.items()},
        edgeMeters={k: round(v, 2) for k, v in edge.items()},
        edgeMetersOrder={k: math.ceil(v * (1 + rules["edgeExtra"])) for k, v in edge.items()},
        hardware=dict(sorted(hw.items())),
        backCutouts=back_cutouts,
        accessories=dict(plinthMeters=(L_A + L_B) / 1000, wallStripMeters=4.4, worktopConnectors=3, siliconeTubes=2,
                         _rules="sokla = zbir dužina komada sokle (A 2708 + B 1890, ugao knap); zidna lajsna = dužine radnih ploča uz zid (3200 + 1200); 3 spojnice po spoju radnih ploča; 1 silikon po radnoj ploči"),
        worktops=[dict(id="PDT1", wallId="A", length=3200, depth=600, thickness=38, cutouts=[dict(kind="sink", centerFromLeft=1400, centerFromFront=300, w=780, h=480)]),
                  dict(id="PDT2", wallId="B", length=1200, depth=600, thickness=38, note="ugaoni spoj sa PDT1", cutouts=[dict(kind="hob", centerFromJoint=300, centerFromFront=300, w=560, h=490)])]))
json.dump(out, open(sys.argv[1], "w"), ensure_ascii=False, indent=1)
print("pieces", out["expected"]["pieceCount"], "lines", len(parts))
print("area", out["expected"]["areaM2"], "sheets", out["expected"]["sheets"])
print("edges", out["expected"]["edgeMeters"], out["expected"]["edgeMetersOrder"])
print("hw", out["expected"]["hardware"])
print("cutouts", back_cutouts)
d2 = [p for p in parts if p["elementId"] == "D2"]; print("D2", [(p["name"], p["length"], p["width"], p.get("note")) for p in d2])
print("staples per back", [(p["elementId"], staples(p["length"], p["width"])) for p in parts if p["name"].startswith("Poleđina")])
