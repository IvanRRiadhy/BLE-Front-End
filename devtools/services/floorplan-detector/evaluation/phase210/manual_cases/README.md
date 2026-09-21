# BIONIC Floorplan Manual Cases Dataset (Phase 2.10)

This directory provides a dedicated staging area for floorplans identified during manual testing
or CMS uploads that demonstrate text and annotation interference.

## How to add a manual case:
1. Copy the floorplan image into this directory:
   `case_<name>.png` (or .jpg, .webp)
2. (Optional) Provide ground truth room annotations:
   `case_<name>.gt.json`
3. (Optional) Provide text bounding box annotations:
   `case_<name>.text.json`

## Text Annotation JSON Schema:
```json
{
  "image": "case_example.png",
  "regions": [
    {
      "id": "text_001",
      "type": "room_label",
      "polygon": [[120, 150], [240, 150], [240, 180], [120, 180]],
      "confidence": 1.0
    }
  ]
}
```

Supported region types:
- `room_label`: Room names ("BEDROOM", "KITCHEN", "LOBBY")
- `dimension`: Measurement annotations ("3.50 x 4.20", "12' x 14'")
- `annotation`: General notes or drawing revision remarks
- `grid_label`: Column/grid references ("A", "1", "C-2")
- `door_label`: Door hardware tags ("D01", "W02")
- `furniture_label`: Equipment or fixture labels ("BED", "DESK", "WC")
- `unknown`: Unclassified text markings
