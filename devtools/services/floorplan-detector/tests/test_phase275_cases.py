"""
Phase 2.7.5 Unit Test Suite: Architectural Topology & Room Graph Verification
"""
import unittest
import numpy as np
from pathlib import Path
import sys

base_dir = Path(__file__).parent.parent
sys.path.insert(0, str(base_dir))

from app.models import DetectionConfig, ArchitecturalOpeningDiagnostics
from app.wall_network import WallSegment
from app.topology import (
    ArchitecturalOpening,
    RoomGraph,
    RoomGraphNode,
    RoomGraphEdge,
    detect_architectural_openings,
    seal_doorway_openings,
)

class TestPhase275Cases(unittest.TestCase):
    def test_architectural_opening_model(self):
        """
        Verifies ArchitecturalOpening model initialization and diagnostic conversion.
        """
        op = ArchitecturalOpening(
            id="op_001",
            x1=100.0,
            y1=50.0,
            x2=140.0,
            y2=50.0,
            width=40.0,
            orientation="H",
            opening_type="door",
            wall_support=0.85,
            exterior_contact=False,
            confidence=0.90,
        )
        diag = op.to_diagnostics()
        self.assertEqual(diag.id, "op_001")
        self.assertEqual(diag.width, 40.0)
        self.assertEqual(diag.opening_type, "door")

    def test_gap_opening_detection(self):
        """
        Verifies detection of doorway gap along collinear wall segments.
        """
        s1 = WallSegment(id="seg1", x1=10.0, y1=100.0, x2=100.0, y2=100.0, orientation="H")
        s2 = WallSegment(id="seg2", x1=140.0, y1=100.0, x2=230.0, y2=100.0, orientation="H")
        
        wall_mask = np.zeros((300, 300), dtype=np.uint8)
        config = DetectionConfig()
        
        openings = detect_architectural_openings(wall_mask, [s1, s2], None, config)
        self.assertGreaterEqual(len(openings), 1)
        self.assertAlmostEqual(openings[0].width, 40.0, delta=1.0)
        self.assertEqual(openings[0].orientation, "H")

    def test_virtual_doorway_sealing(self):
        """
        Verifies that seal_doorway_openings renders sealing lines across detected gaps.
        """
        wall_mask = np.zeros((200, 200), dtype=np.uint8)
        op = ArchitecturalOpening(
            id="op_001",
            x1=50.0,
            y1=100.0,
            x2=90.0,
            y2=100.0,
            width=40.0,
            orientation="H",
        )
        sealed = seal_doorway_openings(wall_mask, [op])
        self.assertGreater(np.count_nonzero(sealed), 0)

    def test_room_graph_abstraction(self):
        """
        Verifies RoomGraph node and edge creation and dictionary export.
        """
        n1 = RoomGraphNode(id="node_001", area_id="detected-001", centroid=(100.0, 100.0), area_px=5000.0)
        n2 = RoomGraphNode(id="node_002", area_id="detected-002", centroid=(200.0, 100.0), area_px=6000.0)
        edge = RoomGraphEdge(id="edge_001", source_node_id="node_001", target_node_id="node_002", opening_id="op_001")
        
        graph = RoomGraph(nodes=[n1, n2], edges=[edge])
        d = graph.to_dict()
        
        self.assertEqual(len(d["nodes"]), 2)
        self.assertEqual(len(d["edges"]), 1)
        self.assertEqual(d["edges"][0]["source"], "node_001")

if __name__ == "__main__":
    unittest.main()
