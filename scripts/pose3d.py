"""Render a posed 3D mannequin for scripts/art-loop.py. Runs inside Blender, not on its own:

    flatpak run --filesystem=home org.blender.Blender --background --python scripts/pose3d.py -- pose.json out.png

Why 3D at all: the flat stick mannequin held side-on and front-on, but a body on the floor seen at
an angle came out unreadable, and those are exactly the poses that failed. Rendered in volume,
with light, the model gets the depth that tells "lying, legs raised" from "standing, arms out".

The pose is plain joint positions in metres (x right, y away, z up), built in art-loop.py: limbs
are capsules between joints, the body's left side warm, its right side cool, the trunk grey. The
floor is a plane barely lighter than the background, there for the cast shadow: without it a body
lying down reads as floating. A drawn grey floor was copied into a lit plane, so it stays dark.
"""

import json
import sys

import bpy
from mathutils import Vector

spec_path, out_path = sys.argv[sys.argv.index("--") + 1 :][:2]
spec = json.load(open(spec_path, encoding="utf-8"))

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

COLOURS = {"floor": (0.0033, 0.0048, 0.0091, 1), "left": (0.95, 0.55, 0.16, 1), "right": (0.23, 0.65, 0.91, 1),
           "trunk": (0.62, 0.65, 0.71, 1), "prop": (0.36, 0.38, 0.42, 1)}


def tint(obj, side):
    obj.color = COLOURS[side]


def ball(at, radius, side):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=at, segments=32, ring_count=16)
    tint(bpy.context.object, side)


def capsule(a, b, radius, side):
    a, b = Vector(a), Vector(b)
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=(b - a).length, location=(a + b) / 2,
                                        vertices=32)
    obj = bpy.context.object
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = (b - a).to_track_quat("Z", "Y")
    tint(obj, side)
    ball(a, radius, side)
    ball(b, radius, side)


if spec.get("floor", True):
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, 0))
    tint(bpy.context.object, "floor")

j = spec["joints"]
for a, b, radius, side in spec["limbs"]:
    capsule(j[a], j[b], radius, side)
ball(j["head"], 0.11, "trunk")

for box in spec.get("boxes", []):
    bpy.ops.mesh.primitive_cube_add(location=box["at"])
    bpy.context.object.scale = [s / 2 for s in box["size"]]
    tint(bpy.context.object, "prop")
for bar in spec.get("bars", []):
    capsule(bar[0], bar[1], bar[2], "prop")

cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
scene.collection.objects.link(cam)
cam.location = spec["camera"]["at"]
cam.rotation_euler = (Vector(spec["camera"]["look"]) - cam.location).to_track_quat("-Z", "Y").to_euler()
cam.data.lens = spec["camera"].get("lens", 50)
scene.camera = cam

scene.render.engine = "BLENDER_WORKBENCH"
shading = scene.display.shading
shading.light, shading.color_type = "STUDIO", "OBJECT"
shading.show_cavity = True
shading.show_shadows = True
shading.shadow_intensity = 0.6
scene.display.light_direction = (0.35, -0.35, 0.87)
shading.background_type = "VIEWPORT"
shading.background_color = (0.0033, 0.0048, 0.0091)  # #0B0F19 in linear, the app surface
scene.world = bpy.data.worlds.new("w")
scene.world.color = (0.0033, 0.0048, 0.0091)
scene.render.resolution_x = scene.render.resolution_y = 1024
scene.render.film_transparent = False
scene.render.filepath = out_path
bpy.ops.render.render(write_still=True)
