import httpx
import os
from emission_factors import CATEGORY_LABELS

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "google/gemma-4-31b-it:free"

async def generate_carbon_story(
    user_name: str,
    personality: str,
    score: int,
    total_co2: float,
    breakdown: dict,
    city: str,
) -> str:
    top_categories = list(breakdown.items())[:3]
    top_str = ", ".join([
        f"{CATEGORY_LABELS.get(k, k)} ({v:.1f} kg CO2)"
        for k, v in top_categories
    ])

    prompt = f"""You are LOOP, a personal carbon coach. Write a short, warm, direct Carbon Story for {user_name}.

Their data:
- City: {city}
- Loop Score: {score}/1000
- Carbon Personality: {personality}
- Total CO2 this month: {total_co2:.1f} kg
- Top emission sources: {top_str}

Write 3 short paragraphs:
1. What their footprint pattern says about them (honest, not preachy, specific to their top category)
2. The single biggest opportunity they have right now (concrete, local, actionable)
3. One motivating closing line about their potential

Tone: coach, not lecturer. Warm but direct. No em dashes. No bullet points. No headers. Plain paragraphs only."""

    try:
        async with httpx.AsyncClient(timeout=45) as client:
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
                    "temperature": 0.7,
                    "max_tokens": 400,
                }
            )
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        if not top_categories:
            return (
                f"You haven't uploaded any transactions yet. Head to the Upload page, "
                f"drop in your bank CSV, and your Carbon Story will be ready in seconds."
            )
        return (
            f"This month, your carbon footprint came in at {total_co2:.1f} kg CO2. "
            f"Your biggest source was {CATEGORY_LABELS.get(top_categories[0][0], 'daily habits')} "
            f"at {top_categories[0][1]:.1f} kg. "
            f"Cutting back there by just 30% would move your Loop Score by over 50 points. "
            f"You are a {personality} and the next level is within reach."
        )
