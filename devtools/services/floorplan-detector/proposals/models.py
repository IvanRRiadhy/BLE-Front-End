"""
Room Proposal Data Models and Enums (Phase 2.10.4)
Defines RoomProposal, ProposalClassification, and ProposalStrategy types.
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, Any, List, Tuple, Optional


class ProposalStrategy(str, Enum):
    WALL_NETWORK_FACE = "wall_network_face"
    DOORWAY_CONNECTED = "doorway_connected"
    INTERNAL_PARTITION = "internal_partition"
    REPEATED_ROOM = "repeated_room"
    NEIGHBORING_ROOM = "neighboring_room"
    COMBINED = "combined"


class ProposalRelationToExisting(str, Enum):
    NEW_PROPOSAL = "NEW_PROPOSAL"
    DUPLICATE_EXISTING = "DUPLICATE_EXISTING"
    PARTIAL_EXISTING = "PARTIAL_EXISTING"
    OVERSIZED_EXISTING = "OVERSIZED_EXISTING"
    UNKNOWN = "UNKNOWN"


class MissingGTRecoveryStatus(str, Enum):
    RECOVERED_NEW_PROPOSAL = "RECOVERED_NEW_PROPOSAL"
    RECOVERED_EXISTING_GEOMETRY = "RECOVERED_EXISTING_GEOMETRY"
    PARTIAL_PROPOSAL = "PARTIAL_PROPOSAL"
    OVERSIZED_PROPOSAL = "OVERSIZED_PROPOSAL"
    WRONG_BOUNDARY = "WRONG_BOUNDARY"
    NO_PROPOSAL = "NO_PROPOSAL"
    EXTERIOR_CONFUSION = "EXTERIOR_CONFUSION"
    OTHER = "OTHER"


@dataclass
class RoomProposal:
    """
    Candidate geometric room proposal produced by recovery strategies.
    Strictly geometry-driven with pixel coordinates in original image space.
    """
    proposal_id: str
    image_id: str
    source_strategy: str
    polygon: List[Tuple[float, float]]
    area_px: float
    bbox: Tuple[float, float, float, float]  # (min_x, min_y, width, height)
    centroid: Tuple[float, float]
    wall_support: float = 0.0
    enclosure_score: float = 0.0
    door_support: float = 0.0
    partition_support: float = 0.0
    repetition_support: float = 0.0
    envelope_containment: float = 1.0
    overlap_existing_candidate: float = 0.0
    overlap_other_proposal: float = 0.0
    confidence: float = 0.5
    geometry_valid: bool = True
    is_oversized: bool = False
    is_exterior: bool = False
    parent_proposal_id: Optional[str] = None
    source_evidence: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "proposalId": self.proposal_id,
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
            "repetitionSupport": round(self.repetition_support, 4),
            "envelopeContainment": round(self.envelope_containment, 4),
            "overlapExistingCandidate": round(self.overlap_existing_candidate, 4),
            "overlapOtherProposal": round(self.overlap_other_proposal, 4),
            "confidence": round(self.confidence, 4),
            "geometryValid": self.geometry_valid,
            "isOversized": self.is_oversized,
            "isExterior": self.is_exterior,
            "parentProposalId": self.parent_proposal_id,
            "sourceEvidence": self.source_evidence,
        }
