import sys, time, pickle, cv2
import os
sys.path.insert(0, r'E:\mencoba\Web\Modernize\packages\typescript\devtools\services\floorplan-detector')
os.chdir(r'E:\mencoba\Web\Modernize\packages\typescript\devtools\services\floorplan-detector')
sys.stdout.reconfigure(line_buffering=True)

with open('evaluation/cache_precomputed_bundles.pkl', 'rb') as f:
    bundles = pickle.load(f)

from evaluation.datasets.my_floorplan import MyFloorplanAdapter
from app.wall_refinement.wall_refinement_pipeline import MultimodalWallRefinementPipeline

adapter = MyFloorplanAdapter()
pipe = MultimodalWallRefinementPipeline()
samples = adapter.discover_samples()

print(f'Samples: {samples}', flush=True)

# Run Strategy G for all 12
print('--- Strategy G (all 12) ---', flush=True)
refined_results = {}
for idx, sid in enumerate(samples):
    bnd, _ = bundles[sid]
    img_path = adapter.get_image_path(sid)
    img = cv2.imread(str(img_path))
    t0 = time.perf_counter()
    res = pipe.run_refinement(img, sid, bnd['wall_mask'], bnd.get('wall_network'), bnd.get('doors', []), bnd.get('openings_diag', []),
                              use_ml=True, protect_openings=True, repair_gaps=True, repair_junctions=True, strategy_name='G')
    refined_results[sid] = res
    print(f'  G [{idx+1:02d}/12] {sid[:30]} done in {1000*(time.perf_counter()-t0):.0f}ms', flush=True)

# Now ablation Strategy A — with DIAGNOSTIC prints before and after each step
print('--- Strategy A ablation (diagnostic) ---', flush=True)
for idx, sid in enumerate(samples):
    bnd, _ = bundles[sid]
    img_path = adapter.get_image_path(sid)
    print(f'  [{idx+1:02d}] loading img: {img_path}', flush=True)
    img = cv2.imread(str(img_path))
    print(f'  [{idx+1:02d}] loaded: {img.shape if img is not None else None}', flush=True)
    cached_ev = refined_results[sid].structural_evidence
    print(f'  [{idx+1:02d}] got cached_ev, calling run_refinement...', flush=True)
    t0 = time.perf_counter()
    res = pipe.run_refinement(img, sid, bnd['wall_mask'], bnd.get('wall_network'), bnd.get('doors', []), bnd.get('openings_diag', []),
                              use_ml=False, protect_openings=False, repair_gaps=False, repair_junctions=False,
                              strategy_name='A', precomputed_evidence=cached_ev)
    print(f'  [{idx+1:02d}] A done: {1000*(time.perf_counter()-t0):.0f}ms WallPx={res.wall_metrics.wall_pixel_count}', flush=True)

print('ALL DONE', flush=True)
