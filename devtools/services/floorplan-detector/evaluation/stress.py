"""
Stress Testing Engine: Parametric Door Gap and Resolution Matrices
Runs rigorous boundary tests evaluating classical CV operational envelopes.
"""
import sys
import importlib.util
from pathlib import Path

# Service root is parent of evaluation
service_root = Path(__file__).resolve().parent.parent
if str(service_root) not in sys.path:
    sys.path.insert(0, str(service_root))

def _load_and_run(module_name: str, file_path: Path, func_name: str):
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    func = getattr(mod, func_name)
    return func()

def run_all_stress_tests():
    print("\n" + "#" * 80)
    print("BIONIC FLOORPLAN EVALUATION HARNESS: PARAMETRIC STRESS SUITE")
    print("#" * 80)

    door_test_path = service_root / "tests" / "test_door_stress.py"
    res_test_path = service_root / "tests" / "test_resolution_stress.py"

    door_results = _load_and_run("test_door_stress", door_test_path, "run_door_stress_tests")
    res_results = _load_and_run("test_resolution_stress", res_test_path, "run_resolution_stress_tests")

    print("\n[STRESS SUITE COMPLETE] All parametric stress matrices executed successfully.")
    return {"door": door_results, "resolution": res_results}

if __name__ == "__main__":
    run_all_stress_tests()
