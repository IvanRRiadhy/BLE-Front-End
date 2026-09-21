"""
Oversized Cavity Splitting Data Models and Enums (Phase 2.10.5)
Defines OversizedCavityAnalysis, CavitySplitProposal, SplitConfiguration, and Enums.
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, Any, List, Tuple, Optional


class SplitStrategy(str, Enum):
    WALL_NETWORK_SPLIT = "wall_network_split"
    PLANAR_FACE_SPLIT = "planar_face_split"
    PARTITION_SPLIT = "partition_split"
    DOORWAY_TOPOLOGY_SPLIT = "doorway_topology_split"
    PROPOSAL_GUIDED_SPLIT = "proposal_guided_split"
    HYBRID_SPLIT = "hybrid_split"


class FalseSplitCategory(str, Enum):
    VALID_ROOM_SPLIT = "VALID_ROOM_SPLIT"
    FALSE_ARCHITECTURAL_SPLIT = "FALSE_ARCHITECTURAL_SPLIT"
    FURNITURE_SPLIT = "FURNITURE_SPLIT"
    TEXT_SPLIT = "TEXT_SPLIT"
    NOISE_SPLIT = "NOISE_SPLIT"
    EXTERIOR_SPLIT = "EXTERIOR_SPLIT"
    TINY_FRAGMENT = "TINY_FRAGMENT"
    DUPLICATE_SPLIT = "DUPLICATE_SPLIT"
    AMBIGUOUS_SPLIT = "AMBIGUOUS_SPLIT"


@dataclass
class OversizedCavityAnalysis:
    """
    Detailed multi-signal analysis of a primary cavity hypothesis.
    Determines if it spans multiple logical rooms without using arbitrary area thresholds.
    """
    cavity_id: str
    image_id: str
    polygon: List[Tuple[float, float]]
    area_px: float
    bbox: Tuple[float, float, float, float]
    oversized_score: float
    area_evidence: float
    wall_evidence: float
    partition_evidence: float
    doorway_evidence: float
    topology_evidence: float
    proposal_evidence: float
    repetition_evidence: float
    split_candidate_count: int
    should_split: bool
    split_reason: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "cavityId": self.cavity_id,
            "imageId": self.image_id,
            "polygon": [[round(x, 1), round(y, 1)] for x, y in self.polygon],
            "areaPx": round(self.area_px, 1),
            "bbox": [round(v, 1) for v in self.bbox],
            "oversizedScore": round(self.oversized_score, 4),
            "areaEvidence": round(self.area_evidence, 4),
            "wallEvidence": round(self.wall_evidence, 4),
            "partitionEvidence": round(self.partition_evidence, 4),
            "doorwayEvidence": round(self.doorway_evidence, 4),
            "topologyEvidence": round(self.topology_evidence, 4),
            "proposalEvidence": round(self.proposal_evidence, 4),
            "repetitionEvidence": round(self.repetition_evidence, 4),
            "splitCandidateCount": self.split_candidate_count,
            "shouldSplit": self.should_split,
            "splitReason": self.split_reason,
        }


@dataclass
class CavitySplitProposal:
    """
    Candidate sub-room proposal produced by decomposing an oversized cavity.
    """
    proposal_id: str
    cavity_id: str
    image_id: str
    source_strategy: str
    polygon: List[Tuple[float, float]]
    area_px: float
    bbox: Tuple[float, float, float, float]
    centroid: Tuple[float, float]
    wall_support: float = 0.0
    enclosure_score: float = 0.0
    door_support: float = 0.0
    partition_support: float = 0.0
    proposal_support: float = 0.0
    envelope_containment: float = 1.0
    oversized_ratio: float = 0.0
    sibling_count: int = 1
    confidence: float = 0.5
    geometry_valid: bool = True
    is_exterior: bool = False
    is_tiny_fragment: bool = False
    is_duplicate: bool = False
    classification: str = FalseSplitCategory.VALID_ROOM_SPLIT.value
    source_evidence: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "proposalId": self.proposal_id,
            "cavityId": self.cavity_id,
            "imageId": self.image_id,
            "sourceStrategy": self.source_strategy,
            "polygon": [[round(x, 1), round(y, 1)] for x, y in self.polygon],
            "areaPx": round(self.area_px, 1),
            "bbox": [round(v, 1) for v in self.bbox],
            "centroid": [round(self.centroid[0], 1), round(self.centroid[1], 1)],
            "wallSupport": round(self.wall_support, 4),
            "enclosureScore": round(self.enclosure_score, 4),
            "doorSupport": round(self.door_support, 4),
            "partitionSupport": round(self.partition_support, 4),
            "proposalSupport": round(self.proposal_support, 4),
            "envelopeContainment": round(self.envelope_containment, 4),
            "oversizedRatio": round(self.oversized_ratio, 4),
            "siblingCount": self.sibling_count,
            "confidence": round(self.confidence, 4),
            "geometryValid": self.geometry_valid,
            "isExterior": self.is_exterior,
            "isTinyFragment": self.is_tiny_fragment,
            "isDuplicate": self.is_duplicate,
            "classification": self.classification,
            "sourceEvidence": self.source_evidence,
        }


@dataclass
class SplitConfiguration:
    """
    A complementary set of sub-room proposals explaining an oversized cavity.
    """
    configuration_id: str
    cavity_id: str
    image_id: str
    strategy: str
    sub_proposals: List[CavitySplitProposal] = field(default_factory=list)
    original_cavity_area: float = 0.0
    total_sub_area: float = 0.0
    coverage_ratio: float = 0.0
    overlap_area: float = 0.0
    overlap_ratio: float = 0.0
    uncovered_area: float = 0.0
    configuration_score: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "configurationId": self.configuration_id,
            "cavityId": self.cavity_id,
            "imageId": self.image_id,
            "strategy": self.strategy,
            "subProposalIds": [p.proposal_id for p in self.sub_proposals],
            "originalCavityArea": round(self.original_cavity_area, 1),
            "totalSubArea": round(self.total_sub_area, 1),
            "coverageRatio": round(self.coverage_ratio, 4),
            "overlapArea": round(self.overlap_area, 1),
            "overlapRatio": round(self.overlap_ratio, 4),
            "uncoveredArea": round(self.uncovered_area, 1),
            "configurationScore": round(self.configuration_score, 4),
        }
