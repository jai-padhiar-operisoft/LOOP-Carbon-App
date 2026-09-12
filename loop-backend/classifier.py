import httpx
import json
import os
from emission_factors import classify_by_keywords

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free"

CATEGORIES = [
    "food_delivery", "ride_hailing", "fuel", "flights", "electricity",
    "shopping_fashion", "electronics", "grocery", "restaurant", "hotel",
    "streaming", "gym_wellness", "public_transport", "other"
]

async def classify_transactions_llm(merchants: list[str]) -> list[str]:
    """
    Classify a batch of merchant names via LLM.
    Returns a list of category strings in the same order.
    Falls back to keyword matching if LLM fails.
    """
    merchant_list = "\n".join([f"{i+1}. {m}" for i, m in enumerate(merchants)])
    prompt = f"""You are a carbon footprint classifier. Classify each merchant into exactly one category.

Valid categories: {", ".join(CATEGORIES)}

Merchants:
{merchant_list}

Respond with ONLY a JSON array of category strings in the same order, no explanation.
Example: ["food_delivery", "ride_hailing", "grocery"]"""

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://loop-carbon.app",
                    "X-Title": "LOOP Carbon App",
                },
                json={
                    "model": MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens": 500,
                }
            )
            data = response.json()
            content = data["choices"][0]["message"]["content"].strip()
            # Extract JSON array from response
            start = content.find("[")
            end = content.rfind("]") + 1
            if start != -1 and end > start:
                categories = json.loads(content[start:end])
                # Validate each category
                return [
                    c if c in CATEGORIES else classify_by_keywords(merchants[i])
                    for i, c in enumerate(categories)
                ]
    except Exception:
        pass

    # Full fallback to keyword matching
    return [classify_by_keywords(m) for m in merchants]


async def classify_with_fallback(merchants: list[str]) -> list[str]:
    """
    First try keyword matching for all merchants.
    Only send unresolved ones (category = 'other') to LLM to save API calls.
    """
    results = [classify_by_keywords(m) for m in merchants]
    unresolved_indices = [i for i, r in enumerate(results) if r == "other"]

    if not unresolved_indices:
        return results

    unresolved_merchants = [merchants[i] for i in unresolved_indices]
    llm_results = await classify_transactions_llm(unresolved_merchants)

    for idx, category in zip(unresolved_indices, llm_results):
        results[idx] = category

    return results
