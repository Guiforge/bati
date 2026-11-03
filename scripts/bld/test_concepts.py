import pathlib
import sys
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import concepts


class Free(unittest.TestCase):
    def test_refuses_to_overwrite(self):
        with tempfile.TemporaryDirectory() as t:
            p = pathlib.Path(t) / "a.png"
            self.assertEqual(concepts.free([p]), [p])
            p.write_bytes(b"x")
            with self.assertRaises(SystemExit):
                concepts.free([p])


class Style(unittest.TestCase):
    def test_own_building_excluded_and_two_refs(self):
        for b in ("druid_grove", "castle_wall", "tent"):
            names = [p.parent.name + "/" + p.stem for p in concepts.style_refs(b)]
            self.assertEqual(len(names), 2)
            self.assertFalse(any(n.startswith(b + "/") for n in names))
        self.assertIn(concepts.SPARE, [p.parent.name + "/" + p.stem for p in concepts.style_refs("druid_grove")])
        self.assertTrue(all(p.exists() for p in concepts.style_refs("druid_grove")))


if __name__ == "__main__":
    unittest.main()
