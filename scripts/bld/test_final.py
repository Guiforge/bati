import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import final
from PIL import Image, ImageDraw


class KeyAndMeasure(unittest.TestCase):
    def test_key_unmixes_and_measures(self):
        im = Image.new("RGB", (final.W, final.H), (250, 10, 250))  # a bg slightly off pure magenta: the key is adaptive
        ImageDraw.Draw(im).rectangle([298, 400, 598, final.BOTTOM], fill=(60, 80, 40))
        rgba = final.key(im)
        px = rgba.load()
        self.assertEqual(px[10, 10][3], 0)
        self.assertEqual(px[450, 700], (60, 80, 40, 255))
        m = final.measure(rgba)
        self.assertEqual((m["top_y"], m["bottom_y"], m["contact_dy"], m["contact_dx"]), (400, final.BOTTOM, 0, 0))

    def test_no_green_edge_on_orange_blob(self):
        im = Image.new("RGB", (final.W, final.H), (247, 37, 244))
        ImageDraw.Draw(im).ellipse([300, 400, 600, 900], fill=(200, 110, 40))
        rgba = final.key(im)
        self.assertEqual(final.green_edge(rgba), 0)
        self.assertGreater(final.green_edge(Image.fromarray(__import__("numpy").dstack([__import__("numpy").full((9, 9, 3), (0, 200, 0)), __import__("numpy").full((9, 9), 100)]).astype("uint8"), "RGBA")), 0)

    def test_seat_lands_on_emprise_and_grows_canvas(self):
        im = Image.new("RGBA", (final.W, final.H))
        ImageDraw.Draw(im).rectangle([300, 5, 500, 1100], fill=(60, 80, 40, 255))  # 12 px below the corner, top at the edge
        out, pad = final.seat(im)
        m = final.measure(out, final.BOTTOM + pad)
        self.assertEqual((m["contact_dy"], m["contact_dx"], out.height, m["top_y"]), (0, 0, final.H + pad, 12))

    def test_shrink_corrects_a_stage_taller_than_the_next(self):
        def tall(h):
            im = Image.new("RGBA", (final.W, final.H))
            ImageDraw.Draw(im).rectangle([300, final.BOTTOM - h, 600, final.BOTTOM], fill=(60, 80, 40, 255))
            return im
        rough, solid = tall(1000), tall(800)  # as painted, the rough is taller than the solid
        ms = {"mythic": {"height": 1000}}
        r, fr = final.shrink(rough, final.target_h("x", "rough", ms))
        s, fs = final.shrink(solid, final.target_h("x", "solid", ms))
        self.assertLess(final.measure(r)["height"], final.measure(s)["height"])  # 380 against 520
        self.assertEqual(final.shrink(tall(300), 500)[1], 1.0)  # never enlarged


if __name__ == "__main__":
    unittest.main()
