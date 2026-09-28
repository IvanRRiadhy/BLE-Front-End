"""
False Positive Taxonomy for Phase 2.10.8 Room Validity & False Positive Suppression.
Defines standardized reason codes for why candidate hypotheses fail room validity.
"""
from enum import Enum
from typing import List, Dict, Any


class FalsePositiveReason(str, Enum):
    FP_EXTERIOR = "FP_EXTERIOR"
    FP_BACKGROUND = "FP_BACKGROUND"
    FP_FURNITURE = "FP_FURNITURE"
    FP_TEXT = "FP_TEXT"
    FP_HATCH = "FP_HATCH"
    FP_DIMENSION = "FP_DIMENSION"
    FP_CORRIDOR_MISCLASSIFIED = "FP_CORRIDOR_MISCLASSIFIED"
    FP_BALCONY = "FP_BALCONY"
    FP_PATIO = "FP_PATIO"
    FP_ARTIFICIAL_CAVITY = "FP_ARTIFICIAL_CAVITY"
    FP_WALL_FRAGMENT = "FP_WALL_FRAGMENT"
    FP_SLIVER = "FP_SLIVER"
    FP_DUPLICATE = "FP_DUPLICATE"
    FP_UNSUPPORTED_BOUNDARY = "FP_UNSUPPORTED_BOUNDARY"
    FP_LOW_ARCHITECTURAL_SUPPORT = "FP_LOW_ARCHITECTURAL_SUPPORT"
    FP_UNKNOWN = "FP_UNKNOWN"


def describe_reason(reason: FalsePositiveReason) -> str:
    descriptions = {
        FalsePositiveReason.FP_EXTERIOR: "Located outside architectural footprint or contacts exterior boundary",
        FalsePositiveReason.FP_BACKGROUND: "Formed in empty drawing canvas or margin space",
        FalsePositiveReason.FP_FURNITURE: "Internal cavity formed by furniture arrangement or fixtures",
        FalsePositiveReason.FP_TEXT: "Enclosure formed predominantly by text annotations or labels",
        FalsePositiveReason.FP_HATCH: "Enclosure formed by repetitive hatch lines or pattern textures",
        FalsePositiveReason.FP_DIMENSION: "Enclosure bounded by dimension witness lines or arrows",
        FalsePositiveReason.FP_CORRIDOR_MISCLASSIFIED: "Corridor segment incorrectly formed without circulation continuity",
        FalsePositiveReason.FP_BALCONY: "Exterior balcony or terrace lacking full enclosure",
        FalsePositiveReason.FP_PATIO: "Exterior outdoor patio or deck space",
        FalsePositiveReason.FP_ARTIFICIAL_CAVITY: "Artificial cavity enclosed by intersecting non-wall elements",
        FalsePositiveReason.FP_WALL_FRAGMENT: "Tiny pocket inside a thick wall or column assembly",
        FalsePositiveReason.FP_SLIVER: "Extreme narrow polygon or sliver with negligible usable area",
        FalsePositiveReason.FP_DUPLICATE: "Redundant alternative boundary of an already accepted room",
        FalsePositiveReason.FP_UNSUPPORTED_BOUNDARY: "Significant perimeter length lacks underlying wall support",
        FalsePositiveReason.FP_LOW_ARCHITECTURAL_SUPPORT: "Composite architectural evidence is insufficient for room status",
        FalsePositiveReason.FP_UNKNOWN: "Unclassified rejection reason",
    }
    return descriptions.get(reason, "Unknown rejection reason")
