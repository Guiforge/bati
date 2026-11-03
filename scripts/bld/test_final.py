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


if __name__ == "__main__":
    unittest.main()
