from app.services.interpolation import calculate_lerp_fraction, interpolate_position


def test_lerp_fraction_at_start():
    fraction = calculate_lerp_fraction(elapsed=0, total=100)
    assert fraction == 0.0


def test_lerp_fraction_at_end():
    fraction = calculate_lerp_fraction(elapsed=100, total=100)
    assert fraction == 1.0


def test_lerp_fraction_midpoint():
    fraction = calculate_lerp_fraction(elapsed=50, total=100)
    assert fraction == 0.5


def test_lerp_fraction_clamped():
    fraction = calculate_lerp_fraction(elapsed=150, total=100)
    assert fraction == 1.0


def test_interpolate_position_start():
    start = (77.2090, 28.6139)  # New Delhi
    end = (80.9462, 26.8467)  # Lucknow
    pos = interpolate_position(start, end, 0.0)
    assert pos == start


def test_interpolate_position_end():
    start = (77.2090, 28.6139)
    end = (80.9462, 26.8467)
    pos = interpolate_position(start, end, 1.0)
    assert pos == end


def test_interpolate_position_midpoint():
    start = (0.0, 0.0)
    end = (10.0, 10.0)
    pos = interpolate_position(start, end, 0.5)
    assert pos == (5.0, 5.0)
