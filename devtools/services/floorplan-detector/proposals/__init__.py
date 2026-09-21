"""
Proposals Subsystem (Phase 2.10.4)
"""
from .models import (
    RoomProposal,
    ProposalStrategy,
    ProposalRelationToExisting,
    MissingGTRecoveryStatus,
)
from .geometry import validate_proposal_geometry, compute_proposal_wall_support
from .engine import ProposalEngine

__all__ = [
    "RoomProposal",
    "ProposalStrategy",
    "ProposalRelationToExisting",
    "MissingGTRecoveryStatus",
    "validate_proposal_geometry",
    "compute_proposal_wall_support",
    "ProposalEngine",
]
