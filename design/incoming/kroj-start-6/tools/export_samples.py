"""Generate sample exports (DXF top view, DXF elevation, OBJ+MTL, GLB) for the example kitchen.
Usage: python3 export_samples.py <out_dir>
"""
import sys, os, json, struct, math

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- DXF (R12, ASCII, mm)
class DXF:
    def __init__(self):
        self.ents = []
        self.layers = {}

    def layer(self, name, color, ltype="CONTINUOUS"):
        self.layers[name] = (color, ltype)

    def line(self, L, x1, y1, x2, y2):
        self.ents += ["0", "LINE", "8", L, "10", f"{x1:.3f}", "20", f"{y1:.3f}", "30", "0.0",
                      "11", f"{x2:.3f}", "21", f"{y2:.3f}", "31", "0.0"]

    def rect(self, L, x0, y0, x1, y1):
        self.line(L, x0, y0, x1, y0); self.line(L, x1, y0, x1, y1)
        self.line(L, x1, y1, x0, y1); self.line(L, x0, y1, x0, y0)

    def poly(self, L, pts):
        for a, b in zip(pts, pts[1:]):
            self.line(L, a[0], a[1], b[0], b[1])

    def circle(self, L, x, y, r):
        self.ents += ["0", "CIRCLE", "8", L, "10", f"{x:.3f}", "20", f"{y:.3f}", "30", "0.0", "40", f"{r:.3f}"]

    def arc(self, L, x, y, r, a0, a1):
        self.ents += ["0", "ARC", "8", L, "10", f"{x:.3f}", "20", f"{y:.3f}", "30", "0.0", "40", f"{r:.3f}",
                      "50", f"{a0:.3f}", "51", f"{a1:.3f}"]

    def text(self, L, x, y, s, h=80, center=True, rot=0):
        e = ["0", "TEXT", "8", L, "10", f"{x:.3f}", "20", f"{y:.3f}", "30", "0.0", "40", f"{h:.3f}", "1", s]
        if rot:
            e += ["50", f"{rot:.3f}"]
        if center:
            e += ["72", "1", "73", "2", "11", f"{x:.3f}", "21", f"{y:.3f}", "31", "0.0"]
        self.ents += e

    def dim_chain_h(self, L, xs, y, h=70, tick=40):
        self.line(L, xs[0], y, xs[-1], y)
        for x in xs:
            self.line(L, x - tick / 2, y - tick / 2, x + tick / 2, y + tick / 2)
            self.line(L, x, y - tick, x, y + tick)
        for a, b in zip(xs, xs[1:]):
            self.text(L, (a + b) / 2, y + 70, f"{round(b - a)}", h)

    def dim_chain_v(self, L, ys, x, h=70, tick=40):
        self.line(L, x, ys[0], x, ys[-1])
        for y in ys:
            self.line(L, x - tick / 2, y - tick / 2, x + tick / 2, y + tick / 2)
            self.line(L, x - tick, y, x + tick, y)
        for a, b in zip(ys, ys[1:]):
            self.text(L, x + 80, (a + b) / 2, f"{round(b - a)}", h, rot=90)

    def save(self, path):
        out = ["0", "SECTION", "2", "HEADER",
               "9", "$ACADVER", "1", "AC1009",
               "9", "$DWGCODEPAGE", "3", "ANSI_1250",
               "9", "$INSBASE", "10", "0.0", "20", "0.0", "30", "0.0",
               "0", "ENDSEC",
               "0", "SECTION", "2", "TABLES",
               "0", "TABLE", "2", "LTYPE", "70", "2",
               "0", "LTYPE", "2", "CONTINUOUS", "70", "0", "3", "Solid line", "72", "65", "73", "0", "40", "0.0",
               "0", "LTYPE", "2", "DASHED", "70", "0", "3", "Dashed __ __ __", "72", "65", "73", "2", "40", "150.0", "49", "100.0", "49", "-50.0",
               "0", "ENDTAB",
               "0", "TABLE", "2", "LAYER", "70", str(len(self.layers))]
        for name, (color, lt) in self.layers.items():
            out += ["0", "LAYER", "2", name, "70", "0", "62", str(color), "6", lt]
        out += ["0", "ENDTAB", "0", "ENDSEC", "0", "SECTION", "2", "ENTITIES"]
        out += self.ents
        out += ["0", "ENDSEC", "0", "EOF"]
        with open(path, "w", encoding="cp1250", newline="\r\n") as f:
            f.write("\n".join(out) + "\n")


# ---- top view (plan): x right, y into room -> DXF Y = -y
d = DXF()
for n, c, lt in [("ZIDOVI", 7, "CONTINUOUS"), ("OTVORI", 4, "CONTINUOUS"), ("ELEMENTI_DONJI", 7, "CONTINUOUS"),
                 ("ELEMENTI_GORNJI", 30, "DASHED"), ("ELEMENTI_VISOKI", 8, "CONTINUOUS"), ("OTVARANJE", 6, "CONTINUOUS"),
                 ("INSTALACIJE", 5, "CONTINUOUS"), ("KOTE", 3, "CONTINUOUS"), ("TEKST", 7, "CONTINUOUS")]:
    d.layer(n, c, lt)
F = lambda y: -y
# walls: outer and inner outline, door gap on bottom wall (x 1900..2800)
d.poly("ZIDOVI", [(1900, F(2520)), (-120, F(2520)), (-120, F(-120)), (3320, F(-120)), (3320, F(2520)), (2800, F(2520))])
d.poly("ZIDOVI", [(1900, F(2400)), (0, F(2400)), (0, F(0)), (3200, F(0)), (3200, F(2400)), (2800, F(2400))])
d.line("ZIDOVI", 1900, F(2400), 1900, F(2520)); d.line("ZIDOVI", 2800, F(2400), 2800, F(2520))
# window in wall A (x 1100..2100)
d.line("OTVORI", 1100, F(-40), 2100, F(-40)); d.line("OTVORI", 1100, F(-80), 2100, F(-80))
# room door: hinge (2800,2400), leaf to (2800,1500), arc 90..180
d.line("OTVORI", 2800, F(2400), 2800, F(1500)); d.arc("OTVORI", 2800, F(2400), 900, 90, 180)
# lower elements
lowA = [("D1", 0, 1000), ("D2", 1000, 1800), ("D3", 1800, 2400), ("D4", 2400, 3000), ("F", 3000, 3200)]
for n, x0, x1 in lowA:
    d.rect("ELEMENTI_DONJI", x0, F(0), x1, F(560)); d.text("TEKST", (x0 + x1) / 2, F(300), n, 90)
d.line("ELEMENTI_DONJI", 0, F(0), 400, F(560)); d.line("ELEMENTI_DONJI", 400, F(0), 0, F(560))
lowB = [("D5", 600, 1200), ("D6", 1200, 1800)]
for n, y0, y1 in lowB:
    d.rect("ELEMENTI_DONJI", 0, F(y0), 560, F(y1)); d.text("TEKST", 280, F((y0 + y1) / 2), n, 90)
d.rect("ELEMENTI_VISOKI", 0, F(1800), 560, F(2400)); d.text("TEKST", 280, F(2100), "V1", 90)
d.line("ELEMENTI_VISOKI", 0, F(1800), 560, F(2400)); d.line("ELEMENTI_VISOKI", 560, F(1800), 0, F(2400))
for n, x0, x1 in [("G1", 0, 600), ("G2", 600, 1000), ("G3", 2200, 2800), ("G4", 2800, 3200)]:
    d.rect("ELEMENTI_GORNJI", x0, F(0), x1, F(320)); d.text("ELEMENTI_GORNJI", (x0 + x1) / 2, F(120), n, 70)
# door swings (open leaves at 45 deg from hinge)
for a, b in [((1000, 560), (745, 815)), ((1000, 560), (1170, 730)), ((1800, 560), (1630, 730)),
             ((560, 1800), (815, 1545)), ((560, 2400), (815, 2145))]:
    d.line("OTVARANJE", a[0], F(a[1]), b[0], F(b[1]))
for a, b in [((0, 320), (170, 490)), ((1000, 320), (885, 435)), ((2200, 320), (2370, 490)), ((3200, 320), (3085, 435))]:
    d.line("ELEMENTI_GORNJI", a[0], F(a[1]), b[0], F(b[1]))
# installations at wall face
for s, x, y in [("V", 1500, 40), ("O", 1650, 40), ("S", 2700, 40), ("S", 40, 900), ("S", 40, 2100)]:
    d.circle("INSTALACIJE", x, F(y), 40); d.text("INSTALACIJE", x, F(y), s, 50)
# dims
d.dim_chain_h("KOTE", [0, 1000, 1800, 2400, 3000, 3200], F(-300))
d.dim_chain_h("KOTE", [0, 3200], F(-500))
d.dim_chain_v("KOTE", [F(2400), F(1800), F(1200), F(600), F(0)], -300)
d.dim_chain_v("KOTE", [F(2400), F(0)], -500)
d.dim_chain_h("KOTE", [0, 1900, 2800, 3200], F(2750))
d.text("TEKST", 1600, F(-800), "Kuhinja Petrovic - tlocrt, mere u mm", 100)
d.save(os.path.join(OUT, "kuhinja-petrovic_tlocrt.dxf"))

# ---- elevation wall A: X along wall, Y = height
e = DXF()
for n, c, lt in [("KONTURA", 7, "CONTINUOUS"), ("FRONTE", 7, "CONTINUOUS"), ("OTVARANJE", 6, "DASHED"), ("RADNA_PLOCA", 2, "CONTINUOUS"),
                 ("OTVORI", 4, "CONTINUOUS"), ("INSTALACIJE", 5, "CONTINUOUS"), ("KOTE", 3, "CONTINUOUS"), ("TEKST", 7, "CONTINUOUS")]:
    e.layer(n, c, lt)
e.rect("KONTURA", 0, 0, 3200, 2600); e.rect("KONTURA", 0, 0, 3200, 100)
e.rect("RADNA_PLOCA", 0, 820, 3200, 858)
e.rect("OTVORI", 1100, 1000, 2100, 2200); e.rect("OTVORI", 1140, 1040, 1580, 2160); e.rect("OTVORI", 1620, 1040, 2060, 2160)
e.rect("FRONTE", 0, 100, 400, 820)
e.line("FRONTE", 0, 100, 400, 820); e.line("FRONTE", 400, 100, 0, 820)
e.rect("FRONTE", 3000, 100, 3200, 820); e.line("FRONTE", 3000, 100, 3200, 820); e.line("FRONTE", 3200, 100, 3000, 820)
for x0, x1, y0, y1 in [(403, 997, 102, 818), (1003, 1397, 102, 818), (1403, 1797, 102, 818), (1803, 2397, 102, 818),
                       (2403, 2997, 642, 818), (2403, 2997, 373, 639), (2403, 2997, 104, 370),
                       (3, 597, 1453, 2167), (603, 997, 1453, 2167), (2203, 2797, 1453, 2167), (2803, 3197, 1453, 2167)]:
    e.rect("FRONTE", x0, y0, x1, y1)
for pts in [[(403, 818), (997, 460), (403, 102)], [(1397, 818), (1003, 460), (1397, 102)], [(1403, 818), (1797, 460), (1403, 102)],
            [(1803, 818), (2100, 102), (2397, 818)],
            [(597, 2167), (3, 1810), (597, 1453)], [(603, 2167), (997, 1810), (603, 1453)],
            [(2797, 2167), (2203, 1810), (2797, 1453)], [(2803, 2167), (3197, 1810), (2803, 1453)]]:
    e.poly("OTVARANJE", pts)
for n, x in [("D1", 700), ("D2", 1400), ("D3", 2100), ("D4", 2700), ("F", 3100)]:
    e.text("TEKST", x, 180, n, 70)
for n, x in [("G1", 300), ("G2", 800), ("G3", 2500), ("G4", 3000)]:
    e.text("TEKST", x, 1530, n, 70)
e.text("TEKST", 200, 460, "slepo", 60)
for s, x, y in [("V", 1500, 500), ("O", 1650, 450), ("S", 2100, 300), ("S", 2700, 1100)]:
    e.circle("INSTALACIJE", x, y, 40); e.text("INSTALACIJE", x, y, s, 50); e.text("INSTALACIJE", x + 60, y - 90, f"h{y}", 45, center=False)
e.rect("INSTALACIJE", 1390, 350, 1690, 600)
e.text("INSTALACIJE", 1540, 650, "Pažnja: izrez leđa 300x250", 50)
e.dim_chain_h("KOTE", [0, 1000, 1800, 2400, 3000, 3200], -200)
e.dim_chain_h("KOTE", [0, 3200], -400)
e.dim_chain_v("KOTE", [0, 100, 820, 858, 1450, 2170, 2600], 3400)
e.dim_chain_v("KOTE", [0, 2600], 3650)
e.text("TEKST", 1600, 2800, "Zid A - pogled spreda, mere u mm", 100)
e.save(os.path.join(OUT, "kuhinja-petrovic_zidA-spreda.dxf"))

# ---------------------------------------------------------------- 3D (meters, Y up)
MATS = {"korpus": (0.95, 0.95, 0.94), "fronta": (0.75, 0.77, 0.78), "radna": (0.72, 0.61, 0.46), "zid": (0.93, 0.91, 0.88),
        "pod": (0.85, 0.82, 0.77), "sokla": (0.23, 0.22, 0.21), "aparat": (0.62, 0.64, 0.66), "rerna": (0.12, 0.12, 0.12),
        "inox": (0.78, 0.80, 0.82), "ploca": (0.07, 0.07, 0.07)}
boxes = []  # (object, material, x0,x1, y0,y1 (plan, into room), z0,z1 (height)) in mm
def B(obj, mat, x0, x1, y0, y1, z0, z1):
    boxes.append((obj, mat, x0, x1, y0, y1, z0, z1))
# walls
B("Zid_A", "zid", -120, 1100, -120, 0, 0, 2600); B("Zid_A", "zid", 2100, 3320, -120, 0, 0, 2600)
B("Zid_A", "zid", 1100, 2100, -120, 0, 0, 1000); B("Zid_A", "zid", 1100, 2100, -120, 0, 2200, 2600)
B("Zid_B", "zid", -120, 0, 0, 2400, 0, 2600); B("Zid_C", "zid", 3200, 3320, 0, 2400, 0, 2600)
B("Zid_D", "zid", -120, 1900, 2400, 2520, 0, 2600); B("Zid_D", "zid", 2800, 3320, 2400, 2520, 0, 2600); B("Zid_D", "zid", 1900, 2800, 2400, 2520, 2050, 2600)
B("Pod", "pod", -120, 3320, -120, 2520, -20, 0)
# lower A (korpus y 0..560, front 560..578)
for n, x0, x1, mat in [("D1", 0, 1000, "korpus"), ("D2", 1000, 1800, "korpus"), ("D3", 1800, 2400, "aparat"), ("D4", 2400, 3000, "korpus")]:
    B(n, mat, x0, x1, 0, 560, 100, 820)
for n, x0, x1, z0, z1 in [("D1", 403, 997, 102, 818), ("D2", 1002, 1398, 102, 818), ("D2", 1402, 1798, 102, 818), ("D3", 1802, 2398, 102, 818),
                          ("D4", 2402, 2998, 642, 818), ("D4", 2402, 2998, 373, 639), ("D4", 2402, 2998, 104, 370), ("F", 3000, 3200, 100, 820)]:
    B(n, "fronta", x0, x1, 560, 578, z0, z1)
B("Sokla", "sokla", 0, 3200, 510, 528, 0, 100); B("Sokla", "sokla", 510, 528, 600, 1800, 0, 100)
# lower B (korpus x 0..560, front x 560..578)
B("D5", "korpus", 0, 560, 600, 1200, 100, 820); B("D5", "fronta", 560, 578, 602, 1198, 104, 220); B("D5", "rerna", 560, 578, 602, 1198, 223, 818)
B("D6", "korpus", 0, 560, 1200, 1800, 100, 820); B("D6", "fronta", 560, 578, 1202, 1798, 102, 818)
B("V1", "korpus", 0, 560, 1800, 2400, 100, 2170); B("V1", "fronta", 560, 578, 1802, 2398, 104, 1800); B("V1", "fronta", 560, 578, 1802, 2398, 1803, 2167)
B("V1", "sokla", 510, 528, 1800, 2400, 0, 100)
# worktops, sink, hob
B("Radna_PDT1", "radna", 0, 3200, 0, 600, 820, 858); B("Radna_PDT2", "radna", 0, 600, 600, 1800, 820, 858)
B("Sudopera", "inox", 1010, 1790, 60, 540, 858, 861); B("Ploca", "ploca", 20, 580, 655, 1145, 858, 862)
# uppers
for n, x0, x1 in [("G1", 0, 600), ("G2", 600, 1000), ("G3", 2200, 2800), ("G4", 2800, 3200)]:
    B(n, "korpus", x0, x1, 0, 320, 1450, 2170); B(n, "fronta", x0 + 3, x1 - 3, 320, 338, 1453, 2167)

def box_geom(x0, x1, y0, y1, z0, z1):
    # plan (x, y) + height z  ->  glTF (X = x, Y = z, Z = y), meters
    X0, X1, Y0, Y1, Z0, Z1 = x0 / 1000, x1 / 1000, z0 / 1000, z1 / 1000, y0 / 1000, y1 / 1000
    faces = [((0, 0, 1), [(X0, Y0, Z1), (X1, Y0, Z1), (X1, Y1, Z1), (X0, Y1, Z1)]),
             ((0, 0, -1), [(X1, Y0, Z0), (X0, Y0, Z0), (X0, Y1, Z0), (X1, Y1, Z0)]),
             ((1, 0, 0), [(X1, Y0, Z1), (X1, Y0, Z0), (X1, Y1, Z0), (X1, Y1, Z1)]),
             ((-1, 0, 0), [(X0, Y0, Z0), (X0, Y0, Z1), (X0, Y1, Z1), (X0, Y1, Z0)]),
             ((0, 1, 0), [(X0, Y1, Z1), (X1, Y1, Z1), (X1, Y1, Z0), (X0, Y1, Z0)]),
             ((0, -1, 0), [(X0, Y0, Z0), (X1, Y0, Z0), (X1, Y0, Z1), (X0, Y0, Z1)])]
    return faces

# OBJ + MTL
with open(os.path.join(OUT, "kuhinja-petrovic.mtl"), "w") as f:
    for m, (r, g, b) in MATS.items():
        f.write(f"newmtl {m}\nKd {r:.3f} {g:.3f} {b:.3f}\nKa 0 0 0\nd 1\nillum 1\n\n")
with open(os.path.join(OUT, "kuhinja-petrovic.obj"), "w") as f:
    f.write("# Kroj - Kuhinja Petrovic (primer). Jedinice: metri, Y gore.\nmtllib kuhinja-petrovic.mtl\n")
    vi = 1; ni = 1; cur = None; part = 0
    for obj, mat, *bb in boxes:
        part += 1
        f.write(f"o {obj}_{part}\nusemtl {mat}\n")
        for n, quad in box_geom(*bb):
            for v in quad:
                f.write(f"v {v[0]:.4f} {v[1]:.4f} {v[2]:.4f}\n")
            f.write(f"vn {n[0]} {n[1]} {n[2]}\n")
            f.write(f"f {vi}//{ni} {vi+1}//{ni} {vi+2}//{ni} {vi+3}//{ni}\n")
            vi += 4; ni += 1

# GLB
pos = bytearray(); nor = bytearray(); idx = bytearray()
accessors = []; meshes = []; nodes = []
mat_index = {m: i for i, m in enumerate(MATS)}
groups = {}
for i, (obj, mat, *bb) in enumerate(boxes):
    p_off, n_off, i_off = len(pos), len(nor), len(idx)
    mn = [1e9] * 3; mx = [-1e9] * 3
    k = 0; indices = []
    for n, quad in box_geom(*bb):
        for v in quad:
            pos += struct.pack("<3f", *v); nor += struct.pack("<3f", *n)
            mn = [min(a, b) for a, b in zip(mn, v)]; mx = [max(a, b) for a, b in zip(mx, v)]
        indices += [k, k + 1, k + 2, k, k + 2, k + 3]; k += 4
    idx += struct.pack(f"<{len(indices)}H", *indices)
    a_pos = len(accessors); accessors.append({"bufferView": 0, "byteOffset": p_off, "componentType": 5126, "count": 24, "type": "VEC3", "min": mn, "max": mx})
    a_nor = len(accessors); accessors.append({"bufferView": 1, "byteOffset": n_off, "componentType": 5126, "count": 24, "type": "VEC3"})
    a_idx = len(accessors); accessors.append({"bufferView": 2, "byteOffset": i_off, "componentType": 5123, "count": 36, "type": "SCALAR"})
    meshes.append({"name": f"{obj}_{i}", "primitives": [{"attributes": {"POSITION": a_pos, "NORMAL": a_nor}, "indices": a_idx, "material": mat_index[mat]}]})
    groups.setdefault(obj, []).append(len(nodes))
    nodes.append({"name": f"{obj}_{mat}_{i}", "mesh": len(meshes) - 1})
parents = []
for obj, children in groups.items():
    parents.append(len(nodes)); nodes.append({"name": obj, "children": children})
while len(idx) % 4:
    idx += b"\x00"
bin_data = bytes(pos) + bytes(nor) + bytes(idx)
gltf = {
    "asset": {"version": "2.0", "generator": "Kroj export (primer)"},
    "scene": 0, "scenes": [{"name": "Kuhinja Petrovic", "nodes": parents}],
    "nodes": nodes, "meshes": meshes, "accessors": accessors,
    "materials": [{"name": m, "pbrMetallicRoughness": {"baseColorFactor": [r, g, b, 1], "metallicFactor": 0.3 if m == "inox" else 0.0, "roughnessFactor": 0.6}} for m, (r, g, b) in MATS.items()],
    "buffers": [{"byteLength": len(bin_data)}],
    "bufferViews": [{"buffer": 0, "byteOffset": 0, "byteLength": len(pos), "target": 34962},
                    {"buffer": 0, "byteOffset": len(pos), "byteLength": len(nor), "target": 34962},
                    {"buffer": 0, "byteOffset": len(pos) + len(nor), "byteLength": len(idx), "target": 34963}],
}
js = json.dumps(gltf, separators=(",", ":")).encode()
while len(js) % 4:
    js += b" "
glb = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bin_data))
glb += struct.pack("<II", len(js), 0x4E4F534A) + js + struct.pack("<II", len(bin_data), 0x004E4942) + bin_data
with open(os.path.join(OUT, "kuhinja-petrovic.glb"), "wb") as f:
    f.write(glb)
print("boxes", len(boxes), "objects", len(groups), "glb bytes", len(glb))
