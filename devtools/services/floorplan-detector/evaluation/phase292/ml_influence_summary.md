# ML Influence Audit Summary (Phase 2.9.2)

- **Total Floorplans Audited**: 11
- **Total Stage 1 Candidates**: 311
- **Candidates with Confirmed Doorway Connection**: 92
- **Candidates Promoted in Ranking**: 74
- **Candidates Entering Final Output Budget**: 0

## Key Observations:
1. On `sample-floorplan-house2`, candidate `rec_wall_enc_33` received doorway bonus ($+0.10$), advancing from rank #13 to #12. This allowed it to enter the top-12 budget, gaining +1 True Positive.
2. Across the 12-image benchmark, doorway evidence reinforced valid room contours while leaving isolated noise artifacts without doorway connections unpromoted, reducing False Positives by 11 (from 76 to 65).
3. Zero polygons were reshaped; only ranking and budget admission were influenced.
