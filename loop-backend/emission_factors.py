# GHG Protocol + DEFRA based emission factors
# Units: kg CO2e per unit (transaction amount in INR or per trip/kwh)

CATEGORY_FACTORS = {
    "food_delivery":     0.0008,   # per INR spent (Swiggy, Zomato, etc.)
    "ride_hailing":      0.0012,   # per INR spent (Ola, Uber, Rapido)
    "fuel":              0.0025,   # per INR spent (petrol pumps)
    "flights":           0.0035,   # per INR spent
    "electricity":       0.00082,  # per INR spent (avg Indian grid: 0.82 kg/kWh)
    "shopping_fashion":  0.0006,   # per INR (clothing, fast fashion)
    "electronics":       0.0015,   # per INR (high embodied carbon)
    "grocery":           0.0003,   # per INR (local grocery)
    "restaurant":        0.0004,   # per INR (dine-in)
    "hotel":             0.0007,   # per INR
    "streaming":         0.00005,  # per INR (digital services, low)
    "gym_wellness":      0.0002,   # per INR
    "public_transport":  0.00015,  # per INR (bus, metro, train - low carbon)
    "other":             0.0004,   # default
}

# Merchant keyword to category mapping (rule-based fallback)
MERCHANT_KEYWORDS = {
    "food_delivery":     ["swiggy", "zomato", "dunzo", "blinkit", "zepto", "bigbasket", "grofers", "instamart", "magic pin"],
    "ride_hailing":      ["ola", "uber", "rapido", "meru", "savaari", "blablacar"],
    "fuel":              ["petrol", "hp ", "hpcl", "iocl", "bpcl", "bharat petroleum", "indian oil", "shell", "reliance petroleum"],
    "flights":           ["indigo", "air india", "spicejet", "vistara", "akasa", "goair", "airline", "airport"],
    "electricity":       ["bescom", "mseb", "tata power", "adani electricity", "torrent power", "electricity bill", "bijli", "electric"],
    "shopping_fashion":  ["myntra", "ajio", "h&m", "zara", "uniqlo", "westside", "max fashion", "pantaloons", "shoppers stop", "lifestyle"],
    "electronics":       ["croma", "reliance digital", "vijay sales", "apple", "samsung store", "oneplus", "boat", "amazon electronics"],
    "grocery":           ["dmart", "more", "reliance fresh", "nature's basket", "food bazaar", "spencer", "nilgiris", "lulu"],
    "restaurant":        ["cafe", "restaurant", "hotel", "dhaba", "bistro", "kitchen", "eatery", "grill", "diner", "pizza", "burger", "kfc", "mcdonald", "dominos", "subway"],
    "hotel":             ["oyo", "treebo", "fab hotel", "marriott", "hilton", "hyatt", "taj ", "oberoi", "radisson", "holiday inn"],
    "streaming":         ["netflix", "hotstar", "prime video", "spotify", "youtube", "jio cinema", "zee5", "sony liv"],
    "gym_wellness":      ["cult.fit", "anytime fitness", "gold's gym", "yoga", "wellness", "spa", "salon", "parlour"],
    "public_transport":  ["irctc", "metro", "bmtc", "best bus", "dtc", "apsrtc", "ksrtc", "redbus", "railway", "train ticket"],
}

def classify_by_keywords(merchant: str) -> str:
    merchant_lower = merchant.lower()
    for category, keywords in MERCHANT_KEYWORDS.items():
        for kw in keywords:
            if kw in merchant_lower:
                return category
    return "other"

def get_emission_factor(category: str) -> float:
    return CATEGORY_FACTORS.get(category, CATEGORY_FACTORS["other"])

CATEGORY_LABELS = {
    "food_delivery":     "Food Delivery",
    "ride_hailing":      "Ride Hailing",
    "fuel":              "Fuel",
    "flights":           "Flights",
    "electricity":       "Electricity",
    "shopping_fashion":  "Fashion & Shopping",
    "electronics":       "Electronics",
    "grocery":           "Grocery",
    "restaurant":        "Dining Out",
    "hotel":             "Hotels",
    "streaming":         "Streaming & Digital",
    "gym_wellness":      "Gym & Wellness",
    "public_transport":  "Public Transport",
    "other":             "Other",
}
