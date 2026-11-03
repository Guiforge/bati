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


if __name__ == "__main__":
    unittest.main()
