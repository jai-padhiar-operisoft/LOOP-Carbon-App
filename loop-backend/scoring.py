from emission_factors import CATEGORY_FACTORS

# Personality archetypes based on Loop Score
PERSONALITIES = [
    {
        "name":        "Carbon Heavy",
        "min_score":   0,
        "max_score":   200,
        "description": "Your footprint is significantly above average. The good news: the biggest wins are right in front of you.",
        "color":       "#ef4444",
        "icon":        "flame",
    },
    {
        "name":        "Habitual Spender",
        "min_score":   201,
        "max_score":   350,
        "description": "Your habits are convenient but carbon-heavy. Small shifts in your top 2 categories can move you up fast.",
        "color":       "#f97316",
        "icon":        "trending-up",
    },
    {
        "name":        "Convenience Consumer",
        "min_score":   351,
        "max_score":   500,
        "description": "You optimize for speed and comfort. You are aware, but not yet consistent. The middle ground is the easiest to escape.",
        "color":       "#eab308",
        "icon":        "zap",
    },
    {
        "name":        "Mindful Consumer",
        "min_score":   501,
        "max_score":   650,
        "description": "You make conscious choices more often than not. You are above average and climbing.",
        "color":       "#84cc16",
        "icon":        "leaf",
    },
    {
        "name":        "Conscious Optimizer",
        "min_score":   651,
        "max_score":   800,
        "description": "Sustainability is part of how you live. You are in the top tier of your city.",
        "color":       "#22c55e",
        "icon":        "award",
    },
    {
        "name":        "Green Pioneer",
        "min_score":   801,
        "max_score":   1000,
        "description": "You are leading by example. Your choices are making a measurable difference.",
        "color":       "#10b981",
        "icon":        "star",
    },
]

# City average CO2 per month (kg) - used for relative benchmarking
CITY_AVERAGES = {
    "Bengaluru":  55.0,
    "Mumbai":     60.0,
    "Delhi":      70.0,
    "Chennai":    52.0,
    "Hyderabad":  58.0,
    "Pune":       50.0,
    "Kolkata":    65.0,
    "Ahmedabad":  54.0,
    "default":    58.0,
}

def calculate_loop_score(total_co2: float, city: str = "Bengaluru") -> int:
    """
    Score from 0-1000.
    1000 = near-zero footprint, 0 = extremely high.
    Uses exponential decay so even high footprints get a non-zero score,
    and the curve is smooth and meaningful across the full range.
    Benchmarked against city average.
    """
    import math
    city_avg = CITY_AVERAGES.get(city, CITY_AVERAGES["default"])

    if total_co2 <= 0:
        return 980

    # ratio relative to city average
    ratio = total_co2 / city_avg

    # Exponential decay: score = 1000 * e^(-k * ratio)
    # k tuned so that:
    #   ratio 0.0  -> 1000  (zero footprint)
    #   ratio 0.5  -> ~870  (half average = Green Pioneer)
    #   ratio 1.0  -> ~750  (at city average = Mindful Consumer)
    #   ratio 2.0  -> ~560  (2x average = Convenience Consumer)
    #   ratio 3.0  -> ~420  (3x average = Habitual Spender)
    #   ratio 5.0  -> ~230  (5x average = Carbon Heavy)
    #   ratio 10.0 -> ~54   (10x average = still non-zero)
    k = 0.29
    raw = 1000 * math.exp(-k * ratio)
    return max(10, min(980, int(raw)))


def get_personality(score: int) -> dict:
    for p in PERSONALITIES:
        if p["min_score"] <= score <= p["max_score"]:
            return p
    return PERSONALITIES[-1]


def get_category_breakdown(transactions: list[dict]) -> dict:
    """
    Returns CO2 by category, sorted descending.
    """
    breakdown = {}
    for tx in transactions:
        cat = tx.get("category", "other")
        co2 = tx.get("co2_kg", 0)
        breakdown[cat] = breakdown.get(cat, 0) + co2

    return dict(sorted(breakdown.items(), key=lambda x: x[1], reverse=True))


def co2_to_equivalents(co2_kg: float) -> dict:
    """Convert CO2 kg to relatable real-world equivalents."""
    return {
        # Basic equivalents
        "trees_month":     round(co2_kg / 21.77, 1),    # avg tree absorbs 21.77 kg/yr -> /12
        "km_driven":       round(co2_kg / 0.21, 0),      # avg car 0.21 kg/km
        "phone_charges":   round(co2_kg / 0.0084, 0),    # 8.4g per full charge
        "plastic_bottles": round(co2_kg / 0.083, 0),     # 83g CO2 per 500ml bottle
        
        # India-relevant equivalents
        "auto_rides":      round(co2_kg / 0.15, 0),      # avg 5km auto ride ~0.15 kg CO2
        "chai_cups":       round(co2_kg / 0.021, 0),     # 1 cup of chai ~21g CO2
        "ac_hours":        round(co2_kg / 0.9, 1),       # 1.5 ton AC ~0.9 kg/hr (India grid)
        "metro_trips":     round(co2_kg / 0.03, 0),      # Delhi Metro ~30g per 10km trip
        "flight_minutes":  round(co2_kg / 2.5, 1),       # domestic flight ~150kg/hr = 2.5/min
        "biryani_plates":  round(co2_kg / 2.5, 1),       # veg thali ~2.5 kg CO2
        "netflix_hours":   round(co2_kg / 0.036, 0),     # streaming ~36g/hr
        "led_bulb_hours":  round(co2_kg / 0.007, 0),     # 9W LED ~7g/hr (India grid)
    }


# Milestone definitions for gamification
MILESTONES = [
    {"id": "first_upload",   "name": "First Steps",        "description": "Uploaded your first transaction data",    "threshold": 0,    "icon": "upload",    "color": "#22c55e"},
    {"id": "carbon_aware",   "name": "Carbon Aware",       "description": "Tracked 10 kg of CO₂ emissions",          "threshold": 10,   "icon": "eye",       "color": "#4ade80"},
    {"id": "half_century",   "name": "Half Century",       "description": "Tracked 50 kg of CO₂ emissions",          "threshold": 50,   "icon": "target",    "color": "#a3e635"},
    {"id": "century_club",   "name": "Century Club",       "description": "Tracked 100 kg of CO₂ emissions",         "threshold": 100,  "icon": "award",     "color": "#fbbf24"},
    {"id": "quarter_ton",    "name": "Quarter Ton",        "description": "Tracked 250 kg of CO₂ emissions",         "threshold": 250,  "icon": "trending-up","color": "#f97316"},
    {"id": "half_ton",       "name": "Half Ton Hero",      "description": "Tracked 500 kg of CO₂ emissions",         "threshold": 500,  "icon": "zap",       "color": "#ef4444"},
    {"id": "one_ton",        "name": "Tonne Tracker",      "description": "Tracked 1,000 kg (1 tonne) of CO₂",       "threshold": 1000, "icon": "globe",     "color": "#8b5cf6"},
    {"id": "two_ton",        "name": "Climate Champion",   "description": "Tracked 2,000 kg of CO₂ emissions",       "threshold": 2000, "icon": "crown",     "color": "#ec4899"},
    {"id": "five_ton",       "name": "Carbon Master",      "description": "Tracked 5,000 kg of CO₂ emissions",       "threshold": 5000, "icon": "star",      "color": "#06b6d4"},
]


def get_unlocked_milestones(cumulative_co2: float, has_uploaded: bool = True) -> list[dict]:
    """Return list of milestones the user has unlocked based on cumulative CO2 tracked."""
    unlocked = []
    for m in MILESTONES:
        if m["id"] == "first_upload" and has_uploaded:
            unlocked.append({**m, "unlocked": True, "progress": 100})
        elif cumulative_co2 >= m["threshold"] and m["id"] != "first_upload":
            unlocked.append({**m, "unlocked": True, "progress": 100})
    return unlocked


def get_next_milestone(cumulative_co2: float) -> dict | None:
    """Return the next milestone the user is working towards."""
    for m in MILESTONES:
        if m["id"] == "first_upload":
            continue
        if cumulative_co2 < m["threshold"]:
            progress = round((cumulative_co2 / m["threshold"]) * 100, 1)
            return {**m, "unlocked": False, "progress": progress, "remaining": round(m["threshold"] - cumulative_co2, 1)}
    return None  # All milestones unlocked


def get_milestone_status(cumulative_co2: float, has_uploaded: bool = True) -> dict:
    """Get complete milestone status for a user."""
    unlocked = get_unlocked_milestones(cumulative_co2, has_uploaded)
    next_milestone = get_next_milestone(cumulative_co2)
    
    return {
        "cumulative_co2": round(cumulative_co2, 2),
        "unlocked": unlocked,
        "next": next_milestone,
        "total_milestones": len(MILESTONES),
        "unlocked_count": len(unlocked),
    }
