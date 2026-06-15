def calculate_lerp_fraction(elapsed: float, total: float) -> float:
    """
    Calculate progress fraction f = T_elapsed / T_total.
    Clamped to [0.0, 1.0].
    """
    if total <= 0:
        return 0.0
    fraction = elapsed / total
    return max(0.0, min(1.0, fraction))


def interpolate_position(
    start: tuple[float, float],
    end: tuple[float, float],
    fraction: float,
) -> tuple[float, float]:
    """
    Linear interpolation between two coordinate points.
    P_current = P_start + f × (P_end - P_start)
    """
    lng_start, lat_start = start
    lng_end, lat_end = end

    lng_current = lng_start + fraction * (lng_end - lng_start)
    lat_current = lat_start + fraction * (lat_end - lat_start)

    return (lng_current, lat_current)
