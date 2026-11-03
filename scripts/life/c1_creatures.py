"""C1 concept test: village creatures, toon-shaded with an ink outline, isometric camera, transparent.

Run: flatpak run --filesystem=home org.blender.Blender -b --python scripts/life/c1_creatures.py -- [outdir] [name ...]
Eevee, 4x render, then downscaled by scripts/life/c1_downscale.py is NOT needed: PNGs are written at 4x
(<name>_<frame>.png) and at final size (<name>_<frame>_1x.png) by Blender's own resize.
Dragon: CC0 Ultimate Monsters (Flying/glTF/Dragon.gltf), posed asleep through its armature.
Mouse, cat, bird: primitives. Palette from docs/designs/village-style-bible.md.
"""
import json
import math
import pathlib
import sys

import bpy
from mathutils import Euler, Vector

ROOT = pathlib.Path(bpy.data.filepath or __file__).resolve()
while not (ROOT / "constants" / "isoSpec.json").exists():
    ROOT = ROOT.parent
ISO = json.loads((ROOT / "constants" / "isoSpec.json").read_text())
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = pathlib.Path(args[0] if args else ROOT / "docs/designs/village/life/scratch/c1/blender")
ONLY = args[1:]
DRAGON = pathlib.Path.home() / ".cache/bati-cc0/monsters/x/Ultimate Monsters/Flying/glTF/Dragon.gltf"

SHADOW, LIGHT, INK = "#2E3552", "#F2E2B4", "#0F1518"
SCALE = 4  # render / final


def rgb(h):
    h = h.lstrip("#")
    return [pow(int(h[i:i + 2], 16) / 255, 2.2) for i in (0, 2, 4)] + [1]


def mix(a, b, t):
    return [x * (1 - t) + y * t for x, y in zip(a, b)]


def toon(name, hexcol, image=None):
    """Diffuse -> shader-to-RGB -> constant ramp: shadow-tinted, base, warm-lit."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    n.clear()
    base = rgb(hexcol)
    d, s2r, ramp, out = (n.new(t) for t in ("ShaderNodeBsdfDiffuse", "ShaderNodeShaderToRGB", "ShaderNodeValToRGB", "ShaderNodeOutputMaterial"))
    d.inputs["Color"].default_value = [1, 1, 1, 1]
    ramp.color_ramp.interpolation = "CONSTANT"
    el = ramp.color_ramp.elements
    el[0].position, el[1].position = 0.0, 0.25
    el[0].color = mix(base, rgb(SHADOW), 0.55)
    el[1].color = base
    e3 = el.new(0.55)
    e3.color = mix(base, rgb(LIGHT), 0.4)
    l.new(d.outputs[0], s2r.inputs[0])
    l.new(s2r.outputs[0], ramp.inputs[0])
    em = n.new("ShaderNodeEmission")
    if image is not None:  # textured: ramp tints white, the texture multiplies it
        tx, mx = n.new("ShaderNodeTexImage"), n.new("ShaderNodeMix")
        tx.image = image
        mx.data_type, mx.blend_type = "RGBA", "MULTIPLY"
        mx.inputs[0].default_value = 1
        l.new(ramp.outputs[0], mx.inputs[6])
        l.new(tx.outputs[0], mx.inputs[7])
        l.new(mx.outputs[2], em.inputs[0])
    else:
        l.new(ramp.outputs[0], em.inputs[0])
    l.new(em.outputs[0], out.inputs[0])
    return m


def ink_mat():
    m = bpy.data.materials.new("ink")
    m.use_nodes = True
    n = m.node_tree.nodes
    n.clear()
    em, out = n.new("ShaderNodeEmission"), n.new("ShaderNodeOutputMaterial")
    em.inputs["Color"].default_value = rgb(INK)
    m.node_tree.links.new(em.outputs[0], out.inputs[0])
    m.use_backface_culling = True
    return m


INK_M = None
MATS = {}


def mat(hexcol):
    if hexcol not in MATS:
        MATS[hexcol] = toon("t" + hexcol, hexcol)
    return MATS[hexcol]


def outline(ob, width):
    """Inverted hull: a solidify with flipped normals, ink material, back faces culled."""
    ob.data.materials.append(INK_M)
    md = ob.modifiers.new("hull", "SOLIDIFY")
    md.thickness, md.offset, md.use_flip_normals = -width, 1, True
    md.material_offset = len(ob.data.materials) - 1
    md.use_rim = False


def prim(kind, loc, scale, hexcol, rot=(0, 0, 0), w=0.02, seg=20):
    if kind == "sphere":
        bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=1)
    elif kind == "cone":
        bpy.ops.mesh.primitive_cone_add(vertices=14, radius1=1, depth=2)
    else:
        bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=1, depth=2)
    ob = bpy.context.object
    ob.location, ob.scale = loc, scale
    ob.rotation_euler = [math.radians(a) for a in rot]
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.object.shade_smooth()
    ob.data.materials.append(mat(hexcol))
    outline(ob, w)
    return ob


def limb(a, b, r, hexcol, w=0.02):
    """Capsule-ish cylinder from point a to b."""
    a, b = Vector(a), Vector(b)
    d = b - a
    ob = prim("cyl", (a + b) / 2, (r, r, d.length / 2), hexcol, w=w)
    ob.rotation_mode = "QUATERNION"
    ob.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d)
    return ob


# Creatures face +x in the build (head toward +x); the model is turned to face screen-right-down later.
def mouse(pose):
    g, p, e = "#9A8F86", "#E8B6B0", "#6B625C"
    run = pose in ("runA", "runB")
    sit = pose == "sit"
    if sit:
        prim("sphere", (0, 0, .45), (.42, .38, .5), g, rot=(0, -20, 0))
        prim("sphere", (.28, 0, .98), (.3, .28, .28), g)
        prim("sphere", (.55, 0, .93), (.1, .1, .09), p)
        for s in (-1, 1):
            prim("sphere", (.2, s * .28, 1.2), (.12, .06, .15), p)
            prim("sphere", (.34, s * .2, .55), (.1, .08, .1), p)  # forepaws on chest
            prim("sphere", (.15, s * .3, .08), (.28, .14, .1), g)
        limb((-.3, 0, .15), (-.7, 0, .12), .04, p)
        return
    k = 1 if pose == "runA" else -1
    prim("sphere", (0, 0, .4), (.6, .32, .32), g)
    prim("sphere", (.62, 0, .46), (.3, .24, .24), g)
    prim("sphere", (.9, 0, .44), (.08, .08, .07), p)
    for s in (-1, 1):
        prim("sphere", (.55, s * .17, .7), (.1, .06, .14), p)
    for s, x, sign in ((-1, .35, k), (1, .35, -k), (-1, -.35, -k), (1, -.35, k)):
        x2 = x + sign * .28
        lift = .12 if sign > 0 else 0
        limb((x, s * .2, .3), (x2, s * .2, .06 + lift), .07, e)
    ang = .5 * k
    limb((-.55, 0, .4), (-1.2, 0, .3 + ang * .4), .04, p)


def cat(pose):
    g, l, e = "#D88A3F", "#F0D9B0", "#8F5A25"
    if pose == "sit":
        prim("sphere", (0, 0, .75), (.55, .5, .8), g, rot=(0, -12, 0))
        prim("sphere", (.1, 0, .35), (.7, .6, .38), g)
        prim("sphere", (.28, 0, 1.58), (.46, .44, .4), g)
        prim("sphere", (.65, 0, 1.5), (.14, .14, .1), l)
        for s in (-1, 1):
            prim("cone", (.2, s * .3, 2.0), (.15, .1, .22), g, rot=(s * -12, 0, 0))
            limb((.4, s * .22, 1.1), (.55, s * .22, .1), .09, l)
        limb((-.2, -.5, .12), (.5, -.62, .1), .1, g)
        limb((.5, -.62, .1), (.85, -.25, .1), .1, g)
        return
    k = 1 if pose == "walkA" else -1
    prim("sphere", (0, 0, 1.0), (.95, .45, .42), g)
    prim("sphere", (.88, 0, 1.28), (.42, .4, .38), g)
    prim("sphere", (1.28, 0, 1.2), (.13, .13, .1), l)
    for s in (-1, 1):
        prim("cone", (.82, s * .26, 1.72), (.14, .1, .2), g, rot=(s * -12, 0, 0))
    for s, x, sign in ((-1, .6, k), (1, .6, -k), (-1, -.6, -k), (1, -.6, k)):
        x2 = x + sign * .3
        lift = .12 if sign > 0 else 0
        limb((x, s * .28, .85), (x2, s * .28, .08 + lift), .11, l)
    limb((-.9, 0, 1.1), (-1.4, 0, 1.6), .08, g)
    limb((-1.4, 0, 1.6), (-1.55, 0, 2.1 + .12 * k), .08, g)


def bird(pose):
    b, w, bk = "#5D86B5", "#3E5E8A", "#E6A12E"
    prim("sphere", (0, 0, .7), (.55, .45, .55), b)
    prim("sphere", (.4, 0, 1.15), (.32, .3, .3), b)
    prim("cone", (.75, 0, 1.12), (.1, .1, .22), bk, rot=(0, 90, 0))
    prim("sphere", (.55, .12, 1.2), (.05, .05, .05), INK)
    prim("cone", (-.55, 0, .62), (.1, .22, .45), w, rot=(0, -80, 0))
    if pose == "perch":
        for s in (-1, 1):
            prim("sphere", (-.05, s * .42, .65), (.4, .1, .3), w, rot=(0, -15, 0))
            limb((0, s * .15, .25), (0, s * .15, 0), .04, bk)
        limb((0, -.45, -.02), (0, .45, -.02), .05, "#7A5A3A")
        return
    up = pose == "up"
    for s in (-1, 1):
        tip = (-.05, s * 1.5, 1.3 if up else -.1)
        prim("sphere", (0, s * .5, .8), (.35, .6, .08), w).rotation_euler = (0, 0, 0)
        limb((0, s * .3, .8), tip, .14, w)
        prim("sphere", tip, (.3, .35, .09), w)
    for s in (-1, 1):
        limb((0, s * .15, .25), (-.1, s * .15, -.1), .04, bk)


def dragon(pose):
    bpy.ops.import_scene.gltf(filepath=str(DRAGON))
    for o in list(bpy.data.objects):
        if o.name.startswith("Icosphere"):
            bpy.data.objects.remove(o)
    arm = bpy.data.objects["CharacterArmature"]
    mesh = bpy.data.objects["Dragon_Fly"]
    img = next(nd.image for nd in mesh.material_slots[0].material.node_tree.nodes if nd.type == "TEX_IMAGE")
    mesh.material_slots[0].material = toon("dragon", "#FFFFFF", img)
    outline(mesh, .02)
    arm.animation_data_clear()
    for pb in arm.pose.bones:
        pb.rotation_mode = "XYZ"
        if pb.name != "Root":
            pb.bone.inherit_scale = "NONE"
    P = arm.pose.bones
    br = 1.07 if pose == "in" else 1.0
    P["Torso"].scale = (br, br, br)
    P["Torso"].rotation_euler = (math.radians(-20), 0, 0)
    P["Neck"].rotation_euler = (math.radians(70), 0, math.radians(25))
    P["Head"].rotation_euler = (math.radians(35), 0, 0)
    for s in "LR":
        z = 1 if s == "L" else -1
        P["Wing1." + s].rotation_euler = (0, 0, z * math.radians(-60))
        P["Wing2." + s].rotation_euler = (0, 0, z * math.radians(-75))
        P["Wing3." + s].rotation_euler = (0, 0, z * math.radians(-60))
        P["Wing4." + s].rotation_euler = (0, 0, z * math.radians(-40))
    P["Body1"].rotation_euler = (math.radians(70), 0, math.radians(30))
    bpy.context.view_layer.update()
    return arm, mesh


CREATURES = {
    "mouse": (mouse, ["runA", "runB", "sit"], 2.4, 48),
    "cat": (cat, ["walkA", "walkB", "sit"], 4.4, 64),
    "bird": (bird, ["up", "down", "perch"], 4.2, 56),
    "dragon": (dragon, ["breatheIn", "breatheOut"], 4.6, 88),
}
DPOSE = {"breatheIn": "in", "breatheOut": "out"}


def setup_scene(ortho, final):
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.film_transparent = True
    sc.render.resolution_x = sc.render.resolution_y = final * SCALE
    sc.render.image_settings.file_format, sc.render.image_settings.color_mode = "PNG", "RGBA"
    sc.view_settings.view_transform = "Standard"
    sc.eevee.taa_render_samples = 16
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    sc.collection.objects.link(cam)
    cam.data.type, cam.data.ortho_scale = "ORTHO", ortho
    cam.data.clip_end = 200
    rot = Euler(tuple(math.radians(a) for a in ISO["cameraRotationDeg"]), "XYZ")
    cam.rotation_euler = rot
    m = rot.to_matrix()
    right, up, back = m @ Vector((1, 0, 0)), m @ Vector((0, 1, 0)), m @ Vector((0, 0, 1))
    # Warm sun from the top-left of the screen, a little toward the camera.
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
    sc.collection.objects.link(sun)
    v = -right * .7 + up * .7 + back * .9
    sun.rotation_euler = v.to_track_quat("Z", "Y").to_euler()
    sc.camera = cam
    return cam, (right, up, back)


def build_and_render(name, pose, fn, ortho, final):
    global INK_M
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()
    INK_M = ink_mat()
    ortho_ = ortho
    cam, (right, up, back) = setup_scene(ortho_, final)
    if name == "dragon":
        fn(DPOSE[pose])
    else:
        fn(pose)
    bpy.context.view_layer.update()
    # Face screen-right-down: build faces +x, so turn the whole creature to look along +gx (screen right-down).
    objs = [o for o in bpy.data.objects if o.type in {"MESH", "ARMATURE"} and o.parent is None]
    if name == "dragon":  # armature faces -y
        pivot = bpy.data.objects.new("pivot", None)
        bpy.context.scene.collection.objects.link(pivot)
        for o in objs:
            o.parent = pivot
        pivot.rotation_euler = (0, 0, math.radians(90 + 0))
        bpy.context.view_layer.update()
    else:
        pivot = bpy.data.objects.new("pivot", None)
        bpy.context.scene.collection.objects.link(pivot)
        for o in objs:
            o.parent = pivot
        pivot.rotation_euler = (0, 0, 0)
        bpy.context.view_layer.update()
    # Centre the bounding box on the camera axis.
    pts = []
    for o in bpy.data.objects:
        if o.type == "MESH" and o.name != "pivot":
            dg = bpy.context.evaluated_depsgraph_get()
            oe = o.evaluated_get(dg)
            pts += [oe.matrix_world @ Vector(c) for c in oe.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    c = (lo + hi) / 2
    c.z = lo.z + (hi.z - lo.z) * .45
    cam.location = c + back * 50
    # Ground-contact: lift nothing; frame fixed per creature so frames stay comparable.
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f"{name}_{pose}.png"
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    # Final-size copy, downscaled with Blender's own scaler.
    img = bpy.data.images.load(str(path))
    img.scale(final, final)
    img.filepath_raw = str(OUT / f"{name}_{pose}_1x.png")
    img.file_format = "PNG"
    img.save()


# Blender restarts the scene per frame; a render loop inside one process is fine since the factory reset is explicit.
for nm, (fn, poses, ortho, final) in CREATURES.items():
    if ONLY and nm not in ONLY:
        continue
    for ps in poses:
        build_and_render(nm, ps, fn, ortho, final)
