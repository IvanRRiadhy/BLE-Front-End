# Manual Cases Dataset Report (Phase 2.10.0)

## 1. Overview
The manual cases dataset mechanism provides an isolated, curated staging ground for
real-world CMS floorplans that exhibit text-stroke interference.

- **Storage Location**: `evaluation/phase210/manual_cases/`
- **Supported File Types**: Images (`.png`, `.jpg`, `.webp`), Ground Truth (`.gt.json`), Text Annotations (`.text.json`).
- **Target Interference Types**: Room labels, dimension lines, structural notes, furniture tags, CAD grid labels.

## 2. Dataset Status & Initial Inventory
- **Total Registered Cases**: 1 (Template / Reference Case)
- **Cases with Room Labels**: 1
- **Cases with Dimensions**: 0
- **Cases with Text Near Walls**: 1
- **Cases with Text Splitting Rooms**: 1
- **Preservation Validation**: Wall protection verified to shield adjacent structural strokes.

## 3. Usage & Next Steps
As developers and users test additional challenging floorplans via the DevTools CMS,
cases can be dropped directly into `evaluation/phase210/manual_cases/` to continuously enrich
the BIONIC hard-negative validation suite.
