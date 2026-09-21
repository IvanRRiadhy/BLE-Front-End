"""
Phase 2.9.0 Fusion Strategy Registry
Defines experimental strategies A through G and their ablation configurations.
"""
from typing import Dict, List
from .models import FusionStrategyConfig


def get_ablation_strategies() -> Dict[str, FusionStrategyConfig]:
    """
    Returns the complete registry of ablation strategies A through G.
    """
    strategies: Dict[str, FusionStrategyConfig] = {}

    # Strategy A: Baseline (Phase 2.7.9.2 Control Group)
    strategies["baseline"] = FusionStrategyConfig(
        strategy_id="baseline",
        strategy_name="Strategy A: Baseline (Pure Classical CV)",
        description="Phase 2.7.9.2 production ranking with zero ML evidence contribution",
    )

    # Strategy B: Cavity Penalty Sweep
    for weight in [0.10, 0.20, 0.30, 0.40, 0.50]:
        sid = f"cavity_p{int(weight * 100):02d}"
        strategies[sid] = FusionStrategyConfig(
            strategy_id=sid,
            strategy_name=f"Strategy B: Cavity Penalty (lambda={weight:.2f})",
            description=f"Deducts {weight:.2f} * cavityLikelihood from candidate confidence",
            cavity_penalty_weight=weight,
        )

    # Strategy C: Doorway Bonus Sweep
    for weight in [0.10, 0.20, 0.30, 0.40]:
        sid = f"door_b{int(weight * 100):02d}"
        strategies[sid] = FusionStrategyConfig(
            strategy_id=sid,
            strategy_name=f"Strategy C: Doorway Bonus (lambda={weight:.2f})",
            description=f"Adds {weight:.2f} * doorConnection to candidate confidence",
            door_bonus_weight=weight,
        )

    # Strategy D: Structural Score Sweep
    for weight in [0.10, 0.20, 0.30, 0.40]:
        sid = f"struct_s{int(weight * 100):02d}"
        strategies[sid] = FusionStrategyConfig(
            strategy_id=sid,
            strategy_name=f"Strategy D: Structural Score (lambda={weight:.2f})",
            description=f"Adds {weight:.2f} * structuralConfidence to candidate confidence",
            structural_score_weight=weight,
        )

    # Strategy E: Structural + Cavity Hybrid
    strategies["hybrid_d20_c20"] = FusionStrategyConfig(
        strategy_id="hybrid_d20_c20",
        strategy_name="Strategy E: Hybrid (Door +0.20, Cavity -0.20)",
        description="Combines +0.20 door connection bonus with -0.20 cavity penalty",
        door_bonus_weight=0.20,
        cavity_penalty_weight=0.20,
    )
    strategies["hybrid_d30_c30"] = FusionStrategyConfig(
        strategy_id="hybrid_d30_c30",
        strategy_name="Strategy E: Hybrid (Door +0.30, Cavity -0.30)",
        description="Combines +0.30 door connection bonus with -0.30 cavity penalty",
        door_bonus_weight=0.30,
        cavity_penalty_weight=0.30,
    )
    strategies["hybrid_s20_c20"] = FusionStrategyConfig(
        strategy_id="hybrid_s20_c20",
        strategy_name="Strategy E: Hybrid (Struct +0.20, Cavity -0.20)",
        description="Combines +0.20 structural confidence bonus with -0.20 cavity penalty",
        structural_score_weight=0.20,
        cavity_penalty_weight=0.20,
    )

    # Strategy F: ML Veto
    strategies["veto_c90_d05"] = FusionStrategyConfig(
        strategy_id="veto_c90_d05",
        strategy_name="Strategy F: ML Veto (Cavity >= 0.90, Door <= 0.05)",
        description="Vetoes candidates with cavityLikelihood >= 0.90 and doorConnection <= 0.05",
        enable_ml_veto=True,
        veto_cavity_threshold=0.90,
        veto_door_threshold=0.05,
    )
    strategies["veto_c95_d05"] = FusionStrategyConfig(
        strategy_id="veto_c95_d05",
        strategy_name="Strategy F: ML Veto (Cavity >= 0.95, Door <= 0.05)",
        description="Vetoes candidates with cavityLikelihood >= 0.95 and doorConnection <= 0.05",
        enable_ml_veto=True,
        veto_cavity_threshold=0.95,
        veto_door_threshold=0.05,
    )
    strategies["veto_c95_d10"] = FusionStrategyConfig(
        strategy_id="veto_c95_d10",
        strategy_name="Strategy F: ML Veto (Cavity >= 0.95, Door <= 0.10)",
        description="Vetoes candidates with cavityLikelihood >= 0.95 and doorConnection <= 0.10",
        enable_ml_veto=True,
        veto_cavity_threshold=0.95,
        veto_door_threshold=0.10,
    )

    # Strategy G: ML Second Chance
    strategies["second_chance_d80"] = FusionStrategyConfig(
        strategy_id="second_chance_d80",
        strategy_name="Strategy G: ML Second Chance (Door >= 0.80)",
        description="Grants second chance to threshold-rejected candidates with doorConnection >= 0.80",
        enable_ml_second_chance=True,
        second_chance_door_threshold=0.80,
        second_chance_bonus=0.10,
    )
    strategies["second_chance_d85"] = FusionStrategyConfig(
        strategy_id="second_chance_d85",
        strategy_name="Strategy G: ML Second Chance (Door >= 0.85)",
        description="Grants second chance to threshold-rejected candidates with doorConnection >= 0.85",
        enable_ml_second_chance=True,
        second_chance_door_threshold=0.85,
        second_chance_bonus=0.10,
    )
    strategies["second_chance_d90"] = FusionStrategyConfig(
        strategy_id="second_chance_d90",
        strategy_name="Strategy G: ML Second Chance (Door >= 0.90)",
        description="Grants second chance to threshold-rejected candidates with doorConnection >= 0.90",
        enable_ml_second_chance=True,
        second_chance_door_threshold=0.90,
        second_chance_bonus=0.10,
    )
    strategies["second_chance_d85_c20"] = FusionStrategyConfig(
        strategy_id="second_chance_d85_c20",
        strategy_name="Strategy G: Second Chance (Door >= 0.85) + Cavity Penalty (-0.20)",
        description="Combines ML second chance (door >= 0.85) with -0.20 cavity penalty",
        enable_ml_second_chance=True,
        second_chance_door_threshold=0.85,
        second_chance_bonus=0.10,
        cavity_penalty_weight=0.20,
    )

    return strategies


def get_strategies_for_group(group: str) -> List[FusionStrategyConfig]:
    """
    Returns strategy configurations matching a specific CLI group.
    """
    all_strats = get_ablation_strategies()
    g = group.lower()
    
    if g == "baseline":
        return [all_strats["baseline"]]
    elif g == "cavity":
        return [s for k, s in all_strats.items() if k.startswith("cavity_")]
    elif g == "door":
        return [s for k, s in all_strats.items() if k.startswith("door_")]
    elif g == "structural":
        return [s for k, s in all_strats.items() if k.startswith("struct_")]
    elif g == "hybrid":
        return [s for k, s in all_strats.items() if k.startswith("hybrid_")]
    elif g == "veto":
        return [s for k, s in all_strats.items() if k.startswith("veto_")]
    elif g in ("second-chance", "second_chance"):
        return [s for k, s in all_strats.items() if k.startswith("second_chance")]
    elif g == "all":
        return list(all_strats.values())
    elif g in all_strats:
        return [all_strats[g]]
    else:
        raise ValueError(f"Unknown strategy or group: {group}")
