import unittest
from pathlib import Path
import sys
import shutil

base_dir = Path(__file__).parent.parent.parent
if str(base_dir) not in sys.path:
    sys.path.insert(0, str(base_dir))

from evaluation.run import run_benchmark
from evaluation.compare import compare_metrics

class TestHarnessIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.test_output = base_dir / "output" / "harness_integration_test"
        if cls.test_output.exists():
            shutil.rmtree(cls.test_output)

    def test_full_harness_execution_pipeline(self):
        # Run benchmark on synthetic suite limited to 3 samples
        report_paths = run_benchmark(
            dataset_name="synthetic",
            limit=3,
            seed=42,
            output_dir=self.test_output,
            enable_vis=True,
        )

        self.assertTrue(report_paths["report_json"].exists())
        self.assertTrue(report_paths["report_csv"].exists())
        self.assertTrue(report_paths["summary_html"].exists())
        self.assertTrue(report_paths["images_dir"].exists())

        # Test regression comparison against itself
        comparison_text, has_reg = compare_metrics(
            baseline_path=report_paths["report_json"],
            candidate_path=report_paths["report_json"],
        )
        self.assertFalse(has_reg)
        self.assertIn("NEUTRAL", comparison_text)

    @classmethod
    def tearDownClass(cls):
        if cls.test_output.exists():
            shutil.rmtree(cls.test_output)

if __name__ == "__main__":
    unittest.main()
