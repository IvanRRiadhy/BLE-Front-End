import sys
import unittest
from pathlib import Path
from starlette.testclient import TestClient

base_dir = Path(__file__).parent.parent
sys.path.insert(0, str(base_dir))

from api.main import app

class TestFloorplanApi(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.samples_dir = base_dir / "samples"

    def test_health_endpoint(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_detect_endpoint_with_sample(self):
        sample_path = self.samples_dir / "03_three_rooms_connected.png"
        self.assertTrue(sample_path.exists())

        with open(sample_path, "rb") as f:
            response = self.client.post(
                "/detect",
                files={"file": ("03_three_rooms_connected.png", f, "image/png")},
            )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("imageWidth", data)
        self.assertIn("imageHeight", data)
        self.assertIn("areas", data)
        self.assertEqual(data["imageWidth"], 1000)
        self.assertEqual(data["imageHeight"], 700)
        self.assertEqual(len(data["areas"]), 3)

        for area in data["areas"]:
            self.assertIn("id", area)
            self.assertIn("polygon", area)
            self.assertGreaterEqual(len(area["polygon"]), 3)
            for pt in area["polygon"]:
                self.assertIn("xPx", pt)
                self.assertIn("yPx", pt)

    def test_detect_endpoint_invalid_file(self):
        # Empty payload
        response = self.client.post(
            "/detect",
            files={"file": ("empty.png", b"", "image/png")},
        )
        self.assertEqual(response.status_code, 400)

if __name__ == "__main__":
    unittest.main(verbosity=2)
