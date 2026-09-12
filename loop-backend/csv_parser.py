"""
Smart CSV parser for LOOP.
Handles real-world bank exports from HDFC, SBI, ICICI, Axis, Kotak,
PhonePe, Google Pay, Paytm, CRED, and generic formats without requiring
users to rename columns.
"""

import io
import re
import pandas as pd
from typing import Optional


# ── Known bank formats ────────────────────────────────────────────────────────
# Each entry maps raw column names to our standard names.
# Checked before the generic detector runs.

KNOWN_BANK_FORMATS = [
    # HDFC Bank
    {
        "signature": ["narration", "withdrawal_amt.", "deposit_amt.", "closing_balance"],
        "merchant": "narration",
        "amount": "withdrawal_amt.",
        "date": "date",
    },
    # ICICI Bank
    {
        "signature": ["transaction_remarks", "withdrawal_amount_(inr)", "deposit_amount_(inr)"],
        "merchant": "transaction_remarks",
        "amount": "withdrawal_amount_(inr)",
        "date": "transaction_date",
    },
    # Axis Bank
    {
        "signature": ["particulars", "debit", "credit", "balance"],
        "merchant": "particulars",
        "amount": "debit",
        "date": "tran._date",
    },
    # SBI
    {
        "signature": ["description", "debit", "credit", "balance"],
        "merchant": "description",
        "amount": "debit",
        "date": "txn_date",
    },
    # Kotak Mahindra
    {
        "signature": ["description", "debit_amount", "credit_amount"],
        "merchant": "description",
        "amount": "debit_amount",
        "date": "transaction_date",
    },
    # PhonePe / Google Pay / Paytm export
    {
        "signature": ["transaction_details", "paid", "received"],
        "merchant": "transaction_details",
        "amount": "paid",
        "date": "date",
    },
    # CRED
    {
        "signature": ["merchant_name", "amount", "transaction_type"],
        "merchant": "merchant_name",
        "amount": "amount",
        "date": "date",
    },
    # Amazon Pay
    {
        "signature": ["payment_details", "total", "transaction_type"],
        "merchant": "payment_details",
        "amount": "total",
        "date": "date",
    },
]


# ── Column role scoring ────────────────────────────────────────────────────────

# Words that suggest a column is the merchant/description
MERCHANT_KEYWORDS = [
    "merchant", "description", "narration", "particulars", "details",
    "remark", "remarks", "transaction_details", "payment_details",
    "beneficiary", "payee", "vendor", "name", "to", "paid_to",
    "towards", "note", "info", "text", "ref", "reference",
]

# Words that suggest a column is the amount
AMOUNT_KEYWORDS = [
    "amount", "debit", "withdrawal", "spent", "paid", "charge",
    "transaction_amount", "debit_amount", "withdrawal_amount",
    "dr", "dr.", "dr_amount", "debit_amt", "inr", "rupee",
    "total", "value",
]

# Words that suggest a column is the date
DATE_KEYWORDS = [
    "date", "txn_date", "transaction_date", "value_date",
    "posted_date", "tran._date", "booking_date", "payment_date",
]

# Words that suggest a column should be SKIPPED (credit/balance columns)
SKIP_KEYWORDS = [
    "credit", "deposit", "received", "closing_balance", "balance",
    "available", "cr", "cr.", "credit_amount",
]


def normalise_col(name: str) -> str:
    """Lowercase, strip spaces, normalise separators."""
    return re.sub(r"[\s\-/\(\)]+", "_", name.strip().lower()).strip("_")


def score_as_merchant(col: str, series: pd.Series) -> float:
    """Score how likely a column is the merchant/description column."""
    score = 0.0
    col_n = normalise_col(col)

    # Name match
    for kw in MERCHANT_KEYWORDS:
        if kw in col_n:
            score += 3.0
            break

    # Skip obvious non-merchant columns
    for kw in SKIP_KEYWORDS + AMOUNT_KEYWORDS + DATE_KEYWORDS:
        if kw in col_n:
            score -= 2.0

    # Content analysis: text columns have long strings, many unique values
    try:
        sample = series.dropna().astype(str)
        if len(sample) == 0:
            return -999
        avg_len = sample.str.len().mean()
        unique_ratio = sample.nunique() / len(sample)
        numeric_ratio = pd.to_numeric(sample, errors="coerce").notna().mean()

        if avg_len > 8:        score += 2.0
        if avg_len > 15:       score += 1.0
        if unique_ratio > 0.3: score += 2.0
        if numeric_ratio < 0.1: score += 2.0  # text, not numbers
        if numeric_ratio > 0.8: score -= 3.0  # mostly numbers = not merchant
    except Exception:
        pass

    return score


def score_as_amount(col: str, series: pd.Series) -> float:
    """Score how likely a column is the amount column."""
    score = 0.0
    col_n = normalise_col(col)

    for kw in AMOUNT_KEYWORDS:
        if kw in col_n:
            score += 3.0
            break

    for kw in SKIP_KEYWORDS:
        if kw in col_n and "debit" not in kw and "withdrawal" not in kw:
            score -= 2.0

    try:
        sample = series.dropna()
        numeric = pd.to_numeric(
            sample.astype(str).str.replace(",", "").str.replace("₹", "").str.strip(),
            errors="coerce"
        )
        numeric_ratio = numeric.notna().mean()
        if numeric_ratio > 0.7:  score += 3.0
        if numeric_ratio > 0.9:  score += 1.0

        valid = numeric.dropna()
        if len(valid) > 0:
            mean_val = valid.mean()
            # Typical Indian transactions are between ₹10 and ₹1,00,000
            if 10 < mean_val < 100000: score += 2.0
            if valid.min() >= 0:       score += 1.0  # non-negative = good
    except Exception:
        pass

    return score


def score_as_date(col: str, series: pd.Series) -> float:
    """Score how likely a column is the date column."""
    score = 0.0
    col_n = normalise_col(col)

    for kw in DATE_KEYWORDS:
        if kw in col_n:
            score += 4.0
            break

    try:
        sample = series.dropna().astype(str).head(20)
        parsed = pd.to_datetime(sample, errors="coerce", infer_datetime_format=True)
        parse_ratio = parsed.notna().mean()
        if parse_ratio > 0.5: score += 3.0
        if parse_ratio > 0.8: score += 2.0
    except Exception:
        pass

    return score


def clean_amount_series(series: pd.Series) -> pd.Series:
    """Clean amount strings like '1,234.50', '₹500', '1000.00 Dr' etc."""
    return (
        series.astype(str)
        .str.replace(",", "", regex=False)
        .str.replace("₹", "", regex=False)
        .str.replace("Rs.", "", regex=False)
        .str.replace("Rs", "", regex=False)
        .str.replace("INR", "", regex=False)
        .str.replace(r"\s*(dr|cr|debit|credit).*", "", case=False, regex=True)
        .str.strip()
        .pipe(pd.to_numeric, errors="coerce")
        .abs()
        .fillna(0)
    )


def try_read_csv(contents: bytes) -> Optional[pd.DataFrame]:
    """Try various CSV reading strategies to handle malformed exports."""
    strategies = [
        # Standard
        lambda: pd.read_csv(io.BytesIO(contents)),
        # Skip metadata rows at top (many bank exports have 3-5 header rows)
        lambda: pd.read_csv(io.BytesIO(contents), skiprows=1),
        lambda: pd.read_csv(io.BytesIO(contents), skiprows=2),
        lambda: pd.read_csv(io.BytesIO(contents), skiprows=3),
        lambda: pd.read_csv(io.BytesIO(contents), skiprows=4),
        lambda: pd.read_csv(io.BytesIO(contents), skiprows=5),
        # Different separators
        lambda: pd.read_csv(io.BytesIO(contents), sep="|"),
        lambda: pd.read_csv(io.BytesIO(contents), sep="\t"),
        # With encoding fallbacks
        lambda: pd.read_csv(io.BytesIO(contents), encoding="latin-1"),
        lambda: pd.read_csv(io.BytesIO(contents), encoding="utf-8-sig"),
    ]
    for strategy in strategies:
        try:
            df = strategy()
            if len(df) >= 2 and len(df.columns) >= 2:
                return df
        except Exception:
            continue
    return None


def detect_columns(df: pd.DataFrame) -> dict:
    """
    Auto-detect which column is merchant, amount, and date.
    Returns dict with keys: merchant, amount, date (date may be None).
    """
    # Normalise column names for matching
    norm_cols = {col: normalise_col(col) for col in df.columns}

    # Check known bank formats first
    norm_set = set(norm_cols.values())
    for fmt in KNOWN_BANK_FORMATS:
        sig = set(fmt["signature"])
        if sig.issubset(norm_set):
            # Found a known format - map back to actual column names
            reverse = {v: k for k, v in norm_cols.items()}
            merchant_col = reverse.get(normalise_col(fmt["merchant"]))
            amount_col   = reverse.get(normalise_col(fmt["amount"]))
            date_col     = reverse.get(normalise_col(fmt.get("date", "")))
            if merchant_col and amount_col:
                return {
                    "merchant": merchant_col,
                    "amount":   amount_col,
                    "date":     date_col,
                    "matched_format": True,
                }

    # Generic scoring-based detection
    merchant_scores = {}
    amount_scores   = {}
    date_scores     = {}

    for col in df.columns:
        merchant_scores[col] = score_as_merchant(col, df[col])
        amount_scores[col]   = score_as_amount(col, df[col])
        date_scores[col]     = score_as_date(col, df[col])

    # Pick best candidate for each role
    best_merchant = max(merchant_scores, key=merchant_scores.get)
    best_amount   = max(amount_scores,   key=amount_scores.get)
    best_date     = max(date_scores,     key=date_scores.get)

    # Ensure no two roles share the same column
    used = set()
    result = {}

    if merchant_scores[best_merchant] > 0:
        result["merchant"] = best_merchant
        used.add(best_merchant)
    else:
        result["merchant"] = None

    if best_amount not in used and amount_scores[best_amount] > 0:
        result["amount"] = best_amount
        used.add(best_amount)
    else:
        # Try second-best amount column
        remaining = {k: v for k, v in amount_scores.items() if k not in used}
        if remaining:
            sb = max(remaining, key=remaining.get)
            result["amount"] = sb if amount_scores[sb] > 0 else None
        else:
            result["amount"] = None

    if best_date not in used and date_scores[best_date] > 1:
        result["date"] = best_date
    else:
        result["date"] = None

    result["matched_format"] = False
    return result


def parse_csv(contents: bytes) -> tuple[pd.DataFrame, dict]:
    """
    Main entry point. Returns (cleaned_dataframe, detection_info).
    DataFrame has columns: merchant, amount, date (date may be missing).
    Raises ValueError with a human-readable message if parsing fails.
    """
    df = try_read_csv(contents)
    if df is None:
        raise ValueError(
            "Could not read the file. Make sure it is a valid CSV exported from your bank or UPI app."
        )

    # Drop completely empty rows and columns
    df = df.dropna(how="all").dropna(axis=1, how="all")
    df = df.reset_index(drop=True)

    if len(df) == 0 or len(df.columns) < 2:
        raise ValueError("The CSV appears to be empty or has too few columns.")

    detection = detect_columns(df)

    if not detection.get("merchant"):
        raise ValueError(
            "Could not find a transaction description column. "
            "The file may be a summary report rather than a transaction list. "
            "Please export the full transaction history from your bank app."
        )

    if not detection.get("amount"):
        raise ValueError(
            "Could not find a transaction amount column. "
            "Please export the full transaction history with debit/amount columns."
        )

    merchant_col = detection["merchant"]
    amount_col   = detection["amount"]
    date_col     = detection.get("date")

    # Build clean dataframe
    result = pd.DataFrame()
    result["merchant"] = df[merchant_col].fillna("Unknown").astype(str).str.strip()
    result["amount"]   = clean_amount_series(df[amount_col])

    if date_col:
        try:
            result["date"] = pd.to_datetime(
                df[date_col], errors="coerce", infer_datetime_format=True
            ).dt.strftime("%Y-%m-%d")
        except Exception:
            result["date"] = None
    else:
        result["date"] = None

    # Remove zero/invalid amounts
    result = result[result["amount"] > 0].copy()

    # Remove rows where merchant is just whitespace or a number
    result = result[result["merchant"].str.len() > 1].copy()
    result = result[~result["merchant"].str.fullmatch(r"[\d,\.\s]+", na=False)].copy()

    if len(result) == 0:
        raise ValueError(
            "No valid debit transactions found. "
            "Make sure the file contains actual transaction history."
        )

    # Cap at 200 rows
    if len(result) > 200:
        result = result.head(200)

    result = result.reset_index(drop=True)

    detection["rows_found"]    = len(df)
    detection["rows_used"]     = len(result)
    detection["merchant_col"]  = merchant_col
    detection["amount_col"]    = amount_col
    detection["date_col"]      = date_col

    return result, detection
