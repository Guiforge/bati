"""Render one iso blockout for the village POC. Runs inside Blender, not on its own:

    flatpak run --filesystem=home org.blender.Blender --background \
        --python scripts/iso/iso_blockout.py -- spec.json out.png [--no-lines] [--catcher] [--swap-tones]

Why a blockout at all: FLUX paints well and measures badly. Given a picture that already has the
exact angle, footprint, height and material colours, it only has to paint; asked to invent the
geometry it drifts in all four. The blockout is the one reference every sprite is drawn from, and
the masks, anchors, shadows and light pools the app needs come from it rather than from the
painting.

Colour is composed, not lit (prompt v5 §5.1). A lit render would put the moon's falloff, Filmic's
curve and a sampling noise between the palette and the pixel; we want the palette exactly. So
Cycles renders flat passes and isolib.compose() picks each pixel's colour:

  .tone.png        each face in its material's tone for its n.L (top, lit, shadow), with ink
  .shadowtone.png  every face in its shadow tone, with the same ink
  .direct.png      white diffuse lit by one sun alone, the moon or the spec's `light` (strength pi,
                   so unoccluded = n.L), 16 bit
  .ndotl.png       each face's n.L as a flat grey, 16 bit (same light)
  .cls.png         material index and tone class, unfiltered, for the audit's light check

A pixel whose direct light falls under occludedRatio x n.L is in a cast shadow inside the sprite
(an eave, a chimney) and takes the shadow tone; the threshold is relative because an absolute one
fails near the terminator. Emissive parts (amber windows, fire) keep their colour everywhere and
throw no shadow. The passes are separate renders rather than render passes because the 5.x
compositor API moved under our feet and a material swap is plain Python; the result is the same.

Why Cycles and not EEVEE: only Cycles traces the moon's occlusion exactly and has a shadow catcher
(G0 checks the computed shadow polygon against it). Freestyle draws the ink in both.

Coordinates in the spec are grid units (gx right-down, gy left-down, z up), turned into Blender
coordinates here and nowhere else, through isoSpec.json `gridToBlender`.

Besides the passes, the anchor JSON carries the stage's exports that only the scene knows: the
ground shadow and light pools, the `volumes` (each part's vertices in grid units, so any sun's
shadow can be redone without Blender), the `pointsAccroche` (with `foyer` and `fenetres`) and an `exports` index of all eight.
The roof mask rides in the .cls pass's blue channel. The format is written once, in
scripts/iso/exports/stage_exports.py, which turns all this into files.
"""

import json
import math
import pathlib
import sys

import bpy
import bmesh
from mathutils import Euler, Matrix, Vector

args = sys.argv[sys.argv.index("--") + 1 :]
spec_path, out_path = args[0], pathlib.Path(args[1])
lines = "--no-lines" not in args
catcher = "--catcher" in args
swap = "--swap-tones" in args  # test_audit: the same blockout lit from the wrong side

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
ISO = json.loads((ROOT / "constants" / "isoSpec.json").read_text(encoding="utf-8"))
spec = json.loads(pathlib.Path(spec_path).read_text(encoding="utf-8"))
canvas = ISO["canvases"][spec["canvas"]]
W, H = canvas["w"], canvas["h"]
PXSCALE = spec.get("pxScale", canvas.get("pxScale", 1))  # a spec may draw larger than its canvas (T36 painting references)
K = ISO["pxPerUnit"] * PXSCALE
MOON = Vector(ISO["moon"]["L"]).normalized()
TONES = ISO["tones"]
MATERIALS = {k: v for k, v in ISO["materials"].items() if not k.startswith("_")}
EMISSIVE = {k: v for k, v in ISO["emissive"].items() if not k.startswith("_")}
MAT_INDEX = {name: i + 1 for i, name in enumerate(sorted(MATERIALS) + sorted(EMISSIVE))}
# A spec may bring classes of its own (`materials`: the dry-grass base; `emissive`: a cold crystal).
# Their codes come after the spec's, so no existing code moves.
for _name, _m in spec.get("materials", {}).items():
    MATERIALS[_name] = _m
    MAT_INDEX[_name] = len(MAT_INDEX) + 1
for _name, _colour in spec.get("emissive", {}).items():
    EMISSIVE[_name] = _colour
    MAT_INDEX[_name] = len(MAT_INDEX) + 1


def blender(g):
    """Grid point -> Blender point. The only place the axes are turned."""
    return Vector((g[0], -g[1], g[2] if len(g) > 2 else 0.0))


# The light that picks the tones: the moon, unless the spec gives its own `light` (grid direction
# toward it). A villager is lit from the front (CHECKLIST item 15) so its mirrored walk stays true;
# its ground shadow still falls under the moon (ground_of below).
L = blender(spec["light"]).normalized() if "light" in spec else MOON


def to_grid(v):
    return [round(v.x, 4), round(-v.y, 4)]


def srgb(hex_colour):
    return tuple(int(hex_colour[i : i + 2], 16) / 255 for i in (1, 3, 5))


def linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def tone_class(ndotl):
    return 0 if ndotl >= TONES["top"] else 1 if ndotl > TONES["lit"] else 2


bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# One emission material reading a per-corner colour attribute, switched pass by pass; one white
# diffuse for the direct-light pass.
flat = bpy.data.materials.new("flat")
flat.use_nodes = True
nodes = flat.node_tree.nodes
nodes.clear()
attribute = nodes.new("ShaderNodeAttribute")
emission = nodes.new("ShaderNodeEmission")
output = nodes.new("ShaderNodeOutputMaterial")
flat.node_tree.links.new(attribute.outputs["Color"], emission.inputs["Color"])
flat.node_tree.links.new(emission.outputs["Emission"], output.inputs["Surface"])
white = bpy.data.materials.new("white")
white.use_nodes = True
white.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (1, 1, 1, 1)
white.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 1.0

parts = []  # (object, material name, emissive?)


def is_roof(part):
    """A roof takes snow: a gable prism, a tile or thatch part, or one the spec marks `"roof": true`."""
    return part.get("roof", part["type"] == "roof" or part.get("mat") in ("tile", "thatch"))


def finish(obj, name, roofed=False, socle=False):
    mesh = obj.data
    mesh.materials.append(flat)
    emissive = name in EMISSIVE
    layers = {key: mesh.color_attributes.new(key, "FLOAT_COLOR", "CORNER")
              for key in ("tone", "shadowtone", "ndotl", "cls")}
    world = obj.matrix_world.to_3x3()
    for poly in mesh.polygons:
        poly.use_smooth = False
        n = (world @ poly.normal).normalized()
        d = max(0.0, n.dot(L))
        if emissive:
            lit = shadowed = srgb(EMISSIVE[name])
            cls = 3
        else:
            tones = MATERIALS[name]["tones"]
            if swap:  # the light-direction fault: lit and shadow tones traded
                tones = [tones[0], tones[2], tones[1]]
            cls = tone_class(d)
            lit, shadowed = srgb(tones[cls]), srgb(tones[2])
        values = {
            "tone": (*map(linear, lit), 1.0),
            "shadowtone": (*map(linear, shadowed), 1.0),
            "ndotl": (d, d, d, 1.0),
            # sRGB codes chosen so the 8-bit PNG reads back exactly: R material, G tone class,
            # B 255 on a roof face that looks up (the roof mask), 64 on the socle's top face (under the
            # mask's >= 128 threshold; compose(socle_shadow=False) reads it); compose() otherwise keeps R, G.
            "cls": (linear(MAT_INDEX[name] * 8 / 255), linear((cls * 60 + 20) / 255),
                    1.0 if roofed and n.z > 0.2 else linear(64 / 255) if socle and n.z > 0.2 else 0.0, 1.0),
        }
        for loop in poly.loop_indices:
            for key, layer in layers.items():
                layer.data[loop].color = values[key]
    parts.append((obj, name, emissive))


def place(obj, rot_z=0.0, tilt=None):
    if tilt is not None:
        obj.rotation_mode = "QUATERNION"
        obj.rotation_quaternion = blender(tilt).normalized().to_track_quat("Z", "Y")
    else:
        obj.rotation_euler = (0, 0, math.radians(-rot_z))
    bpy.context.view_layer.update()


def apply_transform(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)


def box(p):
    sx, sy, sz = p["size"]
    at = Vector(p["at"]) + Vector((sx / 2, sy / 2, sz / 2))
    bpy.ops.mesh.primitive_cube_add(size=1, location=blender(at))
    obj = bpy.context.object
    obj.scale = (sx, sy, sz)
    place(obj, p.get("rotZ", 0.0))
    apply_transform(obj)
    return obj


def roof(p):
    """A gable prism: the box's footprint, its ridge along gx ("x") or gy ("y") at full height."""
    sx, sy, sz = p["size"]
    x0, y0, z0 = p["at"]
    if p.get("ridge", "x") == "x":
        verts = [(x0, y0, z0), (x0 + sx, y0, z0), (x0 + sx, y0 + sy, z0), (x0, y0 + sy, z0),
                 (x0, y0 + sy / 2, z0 + sz), (x0 + sx, y0 + sy / 2, z0 + sz)]
        faces = [(0, 1, 2, 3), (0, 4, 5, 1), (3, 2, 5, 4), (0, 3, 4), (1, 5, 2)]
    else:
        verts = [(x0, y0, z0), (x0 + sx, y0, z0), (x0 + sx, y0 + sy, z0), (x0, y0 + sy, z0),
                 (x0 + sx / 2, y0, z0 + sz), (x0 + sx / 2, y0 + sy, z0 + sz)]
        faces = [(0, 1, 2, 3), (0, 4, 5, 3), (1, 2, 5, 4), (0, 1, 4), (3, 5, 2)]
    pivot = blender((x0 + sx / 2, y0 + sy / 2, z0))
    turn = Matrix.Rotation(math.radians(-p.get("rotZ", 0.0)), 3, "Z")
    mesh = bpy.data.meshes.new("roof")
    mesh.from_pydata([tuple(pivot + turn @ (blender(v) - pivot)) for v in verts], [], faces)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    # Mirroring gy flips the winding: recompute outward normals rather than trust the table.
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new("roof", mesh)
    scene.collection.objects.link(obj)
    return obj


def cylinder(p, cone=False):
    r, h = p["r"], p["h"]
    base = Vector(p["center"])
    axis = p.get("axis")
    centre = blender(base) + (blender(axis).normalized() * h / 2 if axis else Vector((0, 0, h / 2)))
    # At least 32 segments for a round part (prompt v5 §5.1); 4 means a deliberate pyramid, 8 a
    # deliberately faceted dome (L1-T04 art review: 32 facets read as a smooth, shiny volume).
    verts = p["verts"] if p.get("verts") in (4, 8) else max(p.get("verts", 32), 32)
    if cone:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=p.get("r2", 0.0), depth=h, location=centre)
    else:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=centre)
    obj = bpy.context.object
    place(obj, p.get("rotZ", 0.0), tilt=axis)
    apply_transform(obj)
    return obj


def sphere(p):
    """A faceted ball: `verts` segments (8 by default) by `rings` (6), flat-shaded like every part."""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=p.get("verts", 8), ring_count=p.get("rings", 6),
                                         radius=p["r"], location=blender(p["center"]))
    return bpy.context.object


def sails(p):
    """`count` (4 by default) bare, symmetric blades in the plane facing the camera, so a 2D rotation is exact."""
    length, width = p["length"], p["width"]
    mesh = bpy.data.meshes.new("sails")
    bm = bmesh.new()
    count = p.get("count", 4)
    for i in range(count):
        angle = math.radians(45 + 360 / count * i)
        d = Vector((math.cos(angle), math.sin(angle), 0))
        n = Vector((-d.y, d.x, 0))
        start = d * p.get("hub", 0.08)
        corners = [start - n * width / 2, start + d * length - n * width / 2,
                   start + d * length + n * width / 2, start + n * width / 2]
        bm.faces.new([bm.verts.new(c) for c in corners])
    bmesh.ops.create_circle(bm, cap_ends=True, segments=32, radius=p.get("hub", 0.08) * 1.4)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new("sails", mesh)
    scene.collection.objects.link(obj)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = CAM_ROT.to_quaternion()
    bpy.context.view_layer.update()
    mesh.transform(obj.matrix_world)
    obj.matrix_world.identity()
    return obj


CAM_ROT = Euler(tuple(math.radians(a) for a in ISO["cameraRotationDeg"]), "XYZ").to_matrix()
right, up, back = CAM_ROT @ Vector((1, 0, 0)), CAM_ROT @ Vector((0, 1, 0)), CAM_ROT @ Vector((0, 0, 1))

built = []  # (spec part, object), in spec order: the volumes and anchor points read them
for part in spec.get("parts", []):
    kind = part["type"]
    builder = {"box": box, "roof": roof, "cyl": cylinder, "cone": lambda p: cylinder(p, cone=True), "sails": sails,
               "sphere": sphere}[kind]
    obj = builder(part)
    # The socle: the one box at the origin covering the whole footprint (as the L1-T18 audit finds it).
    is_socle = (kind == "box" and part["at"] == [0, 0, 0] and part["size"][:2] == list(canvas["footprint"])
                and not part.get("rotZ"))
    finish(obj, part.get("mat", "wood"), is_roof(part), is_socle)
    obj["noShadow"] = bool(part.get("noShadow"))
    built.append((part, obj))

fw, fh = canvas["footprint"]
anchor_kind = canvas["anchor"]
if anchor_kind == "footprintBottom":
    anchor_world, target = blender((fw, fh, 0)), tuple(spec.get("anchorPx", (W / 2, H - ISO["anchorMarginPx"])))
elif anchor_kind == "cellCenter":
    anchor_world, target = blender((0.5, 0.5, 0)), tuple(spec.get("anchorPx", (W / 2, H - ISO["anchorMarginPx"])))
else:
    anchor_world, target = Vector((0, 0, 0)), (W / 2, H / 2)

cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
scene.collection.objects.link(cam)
cam.data.type = "ORTHO"
cam.data.ortho_scale = max(W, H) / K
cam.data.sensor_fit = "AUTO"
cam.data.clip_start, cam.data.clip_end = 0.1, 200
cam.rotation_euler = Euler(tuple(math.radians(a) for a in ISO["cameraRotationDeg"]), "XYZ")
cam.location = anchor_world - right * (target[0] - W / 2) / K - up * (H / 2 - target[1]) / K + back * 50
scene.camera = cam

sun = bpy.data.objects.new("moon", bpy.data.lights.new("moon", "SUN"))
scene.collection.objects.link(sun)
sun.data.angle = 0.0
sun.data.energy = math.pi  # white diffuse then reads exactly n.L where nothing occludes it
sun.rotation_mode = "QUATERNION"
sun.rotation_quaternion = L.to_track_quat("Z", "Y")  # its -Z, the light's travel, is -L
bpy.context.view_layer.update()


def to_px(point):
    d = Vector(point) - cam.location
    return [round(W / 2 + d.dot(right) * K, 3), round(H / 2 - d.dot(up) * K, 3)]


scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.seed = 0
scene.cycles.use_denoising = False
scene.cycles.max_bounces = 0
scene.cycles.use_adaptive_sampling = False
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "None"
scene.view_settings.exposure = 0.0
scene.view_settings.gamma = 1.0
scene.render.dither_intensity = 0.0  # the 8-bit dither adds ±1 to every code and palette value
scene.world = bpy.data.worlds.new("w")
scene.world.color = (0, 0, 0)
scene.render.film_transparent = True
scene.render.resolution_x, scene.render.resolution_y = W, H
scene.render.resolution_percentage = 100
settings = bpy.context.view_layer.freestyle_settings
settings.crease_angle = math.radians(140)
lineset = settings.linesets[0] if settings.linesets else settings.linesets.new("ink")
lineset.select_silhouette = lineset.select_border = lineset.select_crease = True
if lineset.linestyle is None:
    lineset.linestyle = bpy.data.linestyles.new("ink")
lineset.linestyle.color = (0, 0, 0)
# `lineScale` thins a piece's ink (a villager: at the buildings' width a door-high figure is all ink).
lineset.linestyle.thickness = ISO["lineThicknessPx"] * PXSCALE * spec.get("lineScale", 1)
scene.render.line_thickness_mode = "ABSOLUTE"
scene.render.line_thickness = 1.0  # a multiplier on the line style's thickness, not a second width


def render(suffix, attribute_name=None, *, ink=False, override=None, samples=16, filter_width=1.5,
           depth="8", mode="RGBA"):
    attribute.attribute_name = attribute_name or "tone"
    bpy.context.view_layer.material_override = override
    scene.render.use_freestyle = ink and lines
    scene.cycles.samples = samples
    scene.cycles.filter_width = filter_width
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = mode
    scene.render.image_settings.color_depth = depth
    scene.render.filepath = str(out_path.with_suffix(suffix))
    bpy.ops.render.render(write_still=True)


render(".tone.png", "tone", ink=True)
render(".shadowtone.png", "shadowtone", ink=True)
render(".direct.png", override=white, samples=32, depth="16", mode="BW")
render(".ndotl.png", "ndotl", depth="16", mode="BW")
render(".cls.png", "cls", samples=1, filter_width=0.01, mode="RGB")

if catcher:
    # G0: Blender's own shadow on a ground plane, to check the polygons computed below.
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
    ground = bpy.context.object
    ground.is_shadow_catcher = True
    render(".catcher.png", override=white, samples=32)


def hull(points):
    pts = sorted(set((round(p[0], 6), round(p[1], 6)) for p in points))
    if len(pts) < 3:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def ground_of(v):
    return v - MOON * (v.z / MOON.z)


anchor_px = to_px(anchor_world)
shadows = []
for obj, name, emissive in parts:
    if emissive or obj["noShadow"]:
        continue
    world = [obj.matrix_world @ v.co for v in obj.data.vertices]
    projected = [ground_of(v) for v in world]
    # Hull in grid coordinates (x right-down, y left-down): a uniform winding for the app.
    poly = hull([(p.x, -p.y) for p in projected])
    shadows.append({
        "part": name,
        "grid": [[round(x, 4), round(y, 4)] for x, y in poly],
        "px": [[round(a - b, 2) for a, b in zip(to_px(Vector((x, -y, 0))), anchor_px)] for x, y in poly],
    })

pools = []
pool_rules = ISO["pools"]
for obj, name, emissive in parts:
    if name != "amber":
        continue
    world = obj.matrix_world
    # A window is a thin box: its pool comes from its broad face, never from its edges.
    faces = [p for p in obj.data.polygons
             if (world.to_3x3() @ p.normal).normalized().dot(Vector((0, -1, 0))) > 0.95
             or (world.to_3x3() @ p.normal).normalized().dot(Vector((1, 0, 0))) > 0.95]
    for poly in sorted(faces, key=lambda p: p.area, reverse=True)[:1]:
        n = (world.to_3x3() @ poly.normal).normalized()
        quad = [world @ obj.data.vertices[i].co for i in poly.vertices]
        if min(v.z for v in quad) > pool_rules["maxSill"]:
            continue
        centre = sum(quad, Vector()) / len(quad)
        lamp = centre - n * pool_rules["lampInset"]
        lamp.z = max(v.z for v in quad) + pool_rules["lampAbove"]
        ground = [lamp + (v - lamp) * (lamp.z / (lamp.z - v.z)) for v in quad]
        pts = hull([(g.x, -g.y) for g in ground])
        pools.append({
            "grid": [[round(x, 4), round(y, 4)] for x, y in pts],
            "px": [[round(a - b, 2) for a, b in zip(to_px(Vector((x, -y, 0))), anchor_px)] for x, y in pts],
        })


def grid3(v):
    # 6 decimals, near float32's own precision: a shadow redone from these and rounded to 4
    # decimals (heights.json) lands on the one computed from the spec. `+ 0.0` drops -0.0.
    return [round(v.x, 6) + 0.0, round(-v.y, 6) + 0.0, round(v.z, 6) + 0.0]


# Volumes: every primitive's vertices in grid units. Each primitive is convex (the sails' blades
# excepted, whose shadow is a hull anyway), so its ground shadow under any sun is the hull of its
# vertices' ground points: the app can redo `shadow` for another light without Blender.
volumes = [{
    "part": i,
    "type": part["type"],
    "mat": part.get("mat", "wood"),
    "emissive": part.get("mat", "wood") in EMISSIVE,
    "noShadow": bool(obj["noShadow"]),
    "roof": bool(is_roof(part)),
    "vertices": [grid3(obj.matrix_world @ v.co) for v in obj.data.vertices],
} for i, (part, obj) in enumerate(built)]


def world_vertices(objs):
    return [o.matrix_world @ v.co for o in objs for v in o.data.vertices]


def level_centre(vertices, top, eps=1e-3):
    """The centre of the highest (or lowest) vertices: a ridge's middle, a cone's tip, a door's sill."""
    z = max(v.z for v in vertices) if top else min(v.z for v in vertices)
    level = [v for v in vertices if abs(v.z - z) <= eps]
    return sum(level, Vector()) / len(level)


def eave_points(obj, keep=8, eps=1e-3):
    """A roof's lower rim, walked around its centre, at most `keep` points."""
    world = world_vertices([obj])
    z = min(v.z for v in world)
    rim = [v for v in world if v.z <= z + eps]
    c = sum(rim, Vector()) / len(rim)
    rim.sort(key=lambda v: math.atan2(-(v.y - c.y), v.x - c.x))
    return rim[:: max(1, len(rim) // keep)][:keep]


def tagged(tag):
    """Parts the spec marks `"accroche": tag`: a door or a chimney is not told by its shape."""
    return [obj for part, obj in built if part.get("accroche") == tag]


roofs = [obj for part, obj in built if is_roof(part)]
door, chimney = tagged("porte"), tagged("cheminee")
points3 = {
    # isoSpec.json pointsAccroche: faite on the highest roof, porte at the middle of the door's foot
    # (its sill), cheminee on top of the highest chimney part, avantToits around each roof's rim.
    "faite": level_centre(world_vertices(roofs), top=True) if roofs else None,
    "porte": level_centre(world_vertices(door[:1]), top=False) if door else None,
    "cheminee": level_centre(world_vertices(chimney), top=True) if chimney else None,
    "avantToits": [p for o in roofs for p in eave_points(o)],
}


def both(value, convert):
    if value is None:
        return None
    return [convert(v) for v in value] if isinstance(value, list) else convert(value)


hooks = {
    "px": {k: both(v, to_px) for k, v in points3.items()},
    "grid": {k: both(v, grid3) for k, v in points3.items()},
}
# foyer and fenetres (L5-T03) come from the volumes with this scene's own projection; the windows
# the emissive mask does not show (back walls) are dropped later, in stage_exports.py.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent / "exports"))
import accroches  # noqa: E402

hooks.update(accroches.extras(volumes, lambda g: to_px(blender(g))))

info = {
    "canvas": spec["canvas"],
    "size": [W, H],
    "anchor": anchor_px,
    "anchorKind": anchor_kind,
    "blender": bpy.app.version_string,
    "engine": scene.render.engine,
    "lines": lines,
    "moon": ISO["moon"]["L"],
    **({"light": spec["light"]} if "light" in spec else {}),
    **({"lineScale": spec["lineScale"]} if "lineScale" in spec else {}),
    **({"pxScale": spec["pxScale"]} if "pxScale" in spec else {}),
    "materialIndex": MAT_INDEX,
    "shadow": shadows,
    "pools": pools,
    "volumes": volumes,
    "pointsAccroche": hooks,
    # Where each of isoSpec.json `exportsParStade` lives: `#key` is a key of this file, `.x.png` a
    # file beside it with that suffix (written by scripts/iso/exports/stage_exports.py).
    "exports": {
        "volumes": "#volumes",
        "masqueEmissif": ".emissive.png",
        "pointsAccroche": "#pointsAccroche",
        "masqueToit": ".roof.png",
        "ombre": "#shadow",
        "flaques": "#pools",
        "masqueTap": ".mask.png",
        "ancrage": "#anchor",
    },
}
if "pivot" in spec:
    info["pivot"] = to_px(blender(spec["pivot"]))
if "sailsScale" in spec:
    info["sailsScale"] = spec["sailsScale"]
out_path.with_suffix(".anchor.json").write_text(json.dumps(info, indent=2) + "\n")
