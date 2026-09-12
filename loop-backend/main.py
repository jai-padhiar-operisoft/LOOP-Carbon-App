import io
import json
import random
import string
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional

import httpx
import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from auth import (
    generate_otp, otp_expiry, is_otp_expired,
    hash_password, verify_password,
    create_token, decode_token,
    send_otp_email, validate_password, validate_username,
)
from streaks import update_streaks_for_user, get_circle_streaks, get_user_reward_status
from csv_parser import parse_csv
from classifier import classify_with_fallback
from database import get_conn, init_db, migrate_db, get_city_circle_id
from emission_factors import CATEGORY_LABELS, get_emission_factor
from scoring import (
    calculate_loop_score,
    co2_to_equivalents,
    get_category_breakdown,
    get_personality,
)
from story_generator import generate_carbon_story

app = FastAPI(title="LOOP API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()
    migrate_db()
    # Ensure avatars upload dir exists
    AVATARS_DIR = Path(__file__).parent / "avatars"
    AVATARS_DIR.mkdir(exist_ok=True)

# Mount avatars directory as static files
AVATARS_DIR = Path(__file__).parent / "avatars"
AVATARS_DIR.mkdir(exist_ok=True)
app.mount("/avatars", StaticFiles(directory=str(AVATARS_DIR)), name="avatars")


# ── MODELS ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str
    city: str = "Bengaluru"

class UpdateProfileRequest(BaseModel):
    name:     Optional[str] = None
    username: Optional[str] = None
    city:     Optional[str] = None
    bio:      Optional[str] = None

class CircleJoin(BaseModel):
    user_id: int
    code: str

class CircleCreate(BaseModel):
    user_id: int
    name: str

# Auth models
class SendOTPRequest(BaseModel):
    email: str

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str

class SetPasswordRequest(BaseModel):
    email: str
    password: str
    name: str
    username: str
    city: str = "Bengaluru"

class LoginRequest(BaseModel):
    email: str
    password: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

# ── AUTH HELPER ───────────────────────────────────────────────────────────────

def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return {"user_id": int(payload["sub"]), "email": payload["email"]}


# ── AUTH ROUTES ───────────────────────────────────────────────────────────────

@app.post("/api/auth/send-otp")
def send_otp(payload: SendOTPRequest):
    email = payload.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address")

    conn = get_conn()
    cur  = conn.cursor()

    # Check if user exists (returning user vs new user)
    user = cur.execute("SELECT id, is_verified FROM users WHERE email = ?", (email,)).fetchone()
    is_new = user is None or not user["is_verified"]

    # Invalidate any previous unused OTPs for this email
    cur.execute("UPDATE otp_store SET used = 1 WHERE email = ? AND used = 0", (email,))

    otp     = generate_otp()
    expires = otp_expiry()
    cur.execute(
        "INSERT INTO otp_store (email, otp, expires_at) VALUES (?, ?, ?)",
        (email, otp, expires)
    )
    conn.commit()
    conn.close()

    sent = send_otp_email(email, otp, is_new_user=is_new)
    if not sent:
        raise HTTPException(status_code=500, detail="Failed to send OTP email. Check your email address.")

    # Do NOT reveal is_new_user — prevents email enumeration
    return {
        "message": "If an account exists for this email, a verification code has been sent.",
        "email":   email,
    }


@app.post("/api/auth/verify-otp")
def verify_otp(payload: VerifyOTPRequest):
    email = payload.email.strip().lower()
    conn  = get_conn()
    cur   = conn.cursor()

    row = cur.execute(
        """SELECT id, otp, expires_at, used FROM otp_store
           WHERE email = ? AND used = 0
           ORDER BY id DESC LIMIT 1""",
        (email,)
    ).fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=400, detail="No active OTP found. Please request a new one.")

    if row["used"]:
        conn.close()
        raise HTTPException(status_code=400, detail="OTP already used. Please request a new one.")

    if is_otp_expired(row["expires_at"]):
        conn.close()
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    if row["otp"] != payload.otp.strip():
        conn.close()
        raise HTTPException(status_code=400, detail="Incorrect OTP. Please try again.")

    # Mark OTP as used
    cur.execute("UPDATE otp_store SET used = 1 WHERE id = ?", (row["id"],))

    # Check if user already has a password set (returning user)
    user = cur.execute(
        "SELECT id, name, city, password, is_verified FROM users WHERE email = ?", (email,)
    ).fetchone()

    conn.commit()
    conn.close()

    if user and user["password"] and user["is_verified"]:
        # Returning user - log them in directly
        token = create_token(user["id"], email)
        return {
            "verified":   True,
            "needs_setup": False,
            "token":      token,
            "user_id":    user["id"],
            "name":       user["name"],
            "city":       user["city"],
        }

    return {
        "verified":    True,
        "needs_setup": True,
        "email":       email,
    }


@app.post("/api/auth/setup")
def setup_account(payload: SetPasswordRequest):
    email    = payload.email.strip().lower()
    username = payload.username.strip()

    # Validate username format
    username_errors = validate_username(username)
    if username_errors:
        raise HTTPException(status_code=400, detail={"message": "Invalid username", "errors": username_errors})

    # Validate password
    pw_errors = validate_password(payload.password)
    if pw_errors:
        raise HTTPException(status_code=400, detail={"message": "Password does not meet requirements", "errors": pw_errors})

    conn = get_conn()
    cur  = conn.cursor()

    # Check username uniqueness
    existing = cur.execute(
        "SELECT id FROM users WHERE LOWER(username) = LOWER(?)", (username,)
    ).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=409, detail="Username already taken. Please choose another.")

    user   = cur.execute("SELECT id, password, is_verified FROM users WHERE email = ?", (email,)).fetchone()
    hashed = hash_password(payload.password)

    # Block if account already fully set up
    if user and user["is_verified"] and user["password"]:
        conn.close()
        raise HTTPException(
            status_code=409,
            detail="An account already exists with this email. Please sign in instead."
        )

    if user:
        cur.execute(
            "UPDATE users SET name=?, username=?, city=?, password=?, is_verified=1 WHERE email=?",
            (payload.name.strip(), username, payload.city, hashed, email)
        )
        user_id = user["id"]
    else:
        cur.execute(
            "INSERT INTO users (name, username, city, email, password, is_verified) VALUES (?,?,?,?,?,1)",
            (payload.name.strip(), username, payload.city, email, hashed)
        )
        user_id = cur.lastrowid
        cur.execute(
            "INSERT INTO loop_scores (user_id, score, personality, total_co2) VALUES (?, 500, 'Explorer', 0)",
            (user_id,)
        )
        circle_id = get_city_circle_id(payload.city, cur)
        if circle_id:
            cur.execute(
                "INSERT OR IGNORE INTO circle_members (circle_id, user_id) VALUES (?, ?)",
                (circle_id, user_id)
            )

    conn.commit()
    conn.close()

    token = create_token(user_id, email)
    return {
        "token":    token,
        "user_id":  user_id,
        "name":     payload.name.strip(),
        "username": username,
        "city":     payload.city,
        "email":    email,
    }


@app.post("/api/auth/login")
def login(payload: LoginRequest):
    email = payload.email.strip().lower()
    conn  = get_conn()
    user  = conn.execute(
        "SELECT id, name, city, password, is_verified FROM users WHERE email = ?", (email,)
    ).fetchone()
    conn.close()

    # Generic message for all failure cases — prevents email enumeration
    FAIL = "Invalid email or password"

    if not user:
        raise HTTPException(status_code=401, detail=FAIL)
    if not user["is_verified"] or not user["password"]:
        raise HTTPException(status_code=401, detail=FAIL)
    if not verify_password(payload.password, user["password"]):
        raise HTTPException(status_code=401, detail=FAIL)

    token = create_token(user["id"], email)
    return {
        "token":   token,
        "user_id": user["id"],
        "name":    user["name"],
        "city":    user["city"],
        "email":   email,
    }


@app.get("/api/auth/check-username/{username}")
def check_username(username: str):
    from auth import validate_username
    fmt_errors = validate_username(username)
    if fmt_errors:
        return {"available": False, "reason": fmt_errors[0]}
    conn = get_conn()
    exists = conn.execute(
        "SELECT id FROM users WHERE LOWER(username) = LOWER(?)", (username.strip(),)
    ).fetchone()
    conn.close()
    if exists:
        return {"available": False, "reason": "Username already taken"}
    return {"available": True, "reason": ""}


@app.get("/api/auth/me")
def get_me(authorization: Optional[str] = Header(None)):
    current = get_current_user(authorization)
    conn = get_conn()
    user = conn.execute(
        "SELECT id, name, username, city, email, bio, avatar_url FROM users WHERE id = ?",
        (current["user_id"],)
    ).fetchone()
    conn.close()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(user)


@app.patch("/api/auth/me")
def update_me(payload: UpdateProfileRequest, authorization: Optional[str] = Header(None)):
    current = get_current_user(authorization)
    conn = get_conn()
    cur  = conn.cursor()

    updates = {}
    if payload.name is not None:
        n = payload.name.strip()
        if not n:
            conn.close()
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        updates["name"] = n

    if payload.username is not None:
        uname = payload.username.strip()
        if uname:
            errs = validate_username(uname)
            if errs:
                conn.close()
                raise HTTPException(status_code=400, detail=errs[0])
            # Check uniqueness (excluding current user)
            taken = cur.execute(
                "SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?",
                (uname, current["user_id"])
            ).fetchone()
            if taken:
                conn.close()
                raise HTTPException(status_code=409, detail="Username already taken")
        updates["username"] = uname if uname else None

    if payload.city is not None:
        c = payload.city.strip()
        if c:
            updates["city"] = c

    if payload.bio is not None:
        bio = payload.bio.strip()[:280]   # hard cap at 280 chars
        updates["bio"] = bio

    if not updates:
        conn.close()
        raise HTTPException(status_code=400, detail="Nothing to update")

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values     = list(updates.values()) + [current["user_id"]]
    cur.execute(f"UPDATE users SET {set_clause} WHERE id = ?", values)
    conn.commit()

    user = cur.execute(
        "SELECT id, name, username, city, email, bio, avatar_url FROM users WHERE id = ?",
        (current["user_id"],)
    ).fetchone()
    conn.close()
    return dict(user)


@app.post("/api/auth/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
):
    current = get_current_user(authorization)

    # Validate file type
    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, and GIF are allowed")

    # Max 3 MB
    contents = await file.read()
    if len(contents) > 3 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 3 MB")

    ext  = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    fname = f"user_{current['user_id']}.{ext}"
    dest  = AVATARS_DIR / fname
    with open(dest, "wb") as f:
        f.write(contents)

    avatar_url = f"/avatars/{fname}"
    conn = get_conn()
    conn.execute("UPDATE users SET avatar_url = ? WHERE id = ?", (avatar_url, current["user_id"]))
    conn.commit()
    conn.close()
    return {"avatar_url": avatar_url}


@app.post("/api/auth/reset-password")
def reset_password(payload: ResetPasswordRequest):
    email = payload.email.strip().lower()
    conn  = get_conn()
    cur   = conn.cursor()

    # Verify OTP
    row = cur.execute(
        """SELECT id, otp, expires_at, used FROM otp_store
           WHERE email = ? AND used = 0
           ORDER BY id DESC LIMIT 1""",
        (email,)
    ).fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=400, detail="No active OTP found. Request a new one.")

    if row["used"]:
        conn.close()
        raise HTTPException(status_code=400, detail="OTP already used. Request a new one.")

    if is_otp_expired(row["expires_at"]):
        conn.close()
        raise HTTPException(status_code=400, detail="OTP has expired. Request a new one.")

    if row["otp"] != payload.otp.strip():
        conn.close()
        raise HTTPException(status_code=400, detail="Incorrect OTP. Please try again.")

    # Validate new password
    pw_errors = validate_password(payload.new_password)
    if pw_errors:
        conn.close()
        raise HTTPException(
            status_code=400,
            detail={"message": "Password does not meet requirements", "errors": pw_errors}
        )

    # Check user exists
    user = cur.execute(
        "SELECT id, name, city FROM users WHERE email = ? AND is_verified = 1",
        (email,)
    ).fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="No verified account found for this email.")

    # Mark OTP used and update password
    cur.execute("UPDATE otp_store SET used = 1 WHERE id = ?", (row["id"],))
    hashed = hash_password(payload.new_password)
    cur.execute("UPDATE users SET password = ? WHERE email = ?", (hashed, email))
    conn.commit()

    # Return a fresh session token so user is logged in after reset
    token = create_token(user["id"], email)
    conn.close()
    return {
        "token":   token,
        "user_id": user["id"],
        "name":    user["name"],
        "city":    user["city"],
        "email":   email,
        "message": "Password reset successfully",
    }


# ── USER ──────────────────────────────────────────────────────────────────────

@app.post("/api/user")
def create_user(payload: UserCreate):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO users (name, city) VALUES (?, ?)",
        (payload.name, payload.city)
    )
    user_id = cur.lastrowid
    cur.execute(
        "INSERT INTO loop_scores (user_id, score, personality, total_co2) VALUES (?, 500, 'Explorer', 0)",
        (user_id,)
    )
    # Auto-join city circle
    circle_id = get_city_circle_id(payload.city, cur)
    if circle_id:
        cur.execute(
            "INSERT OR IGNORE INTO circle_members (circle_id, user_id) VALUES (?, ?)",
            (circle_id, user_id)
        )
    conn.commit()
    conn.close()
    return {"user_id": user_id, "name": payload.name, "city": payload.city}


@app.get("/api/user/{user_id}")
def get_user(user_id: int):
    conn = get_conn()
    cur = conn.cursor()
    user = cur.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    score_row = cur.execute(
        "SELECT * FROM loop_scores WHERE user_id = ?", (user_id,)
    ).fetchone()
    conn.close()
    return {
        "user_id": user_id,
        "name": user["name"],
        "city": user["city"],
        "score": score_row["score"] if score_row else 500,
        "personality": score_row["personality"] if score_row else "Explorer",
        "total_co2": score_row["total_co2"] if score_row else 0,
    }


# ── UPLOAD & CLASSIFY ─────────────────────────────────────────────────────────

@app.post("/api/upload")
async def upload_transactions(
    file: UploadFile = File(...),
    user_id: int = Form(...),
):
    import hashlib
    
    contents = await file.read()
    
    # Generate hash of file contents to detect duplicates
    file_hash = hashlib.sha256(contents).hexdigest()
    
    # Check if this exact CSV was already uploaded by this user
    conn = get_conn()
    cur = conn.cursor()
    existing_upload = cur.execute(
        "SELECT id, uploaded_at, total_co2 FROM csv_uploads WHERE user_id = ? AND file_hash = ?",
        (user_id, file_hash)
    ).fetchone()
    
    if existing_upload:
        conn.close()
        raise HTTPException(
            status_code=400,
            detail=f"This CSV was already uploaded on {existing_upload['uploaded_at'][:10]}. Please upload a different file."
        )
    
    try:
        df, detection = parse_csv(contents)
    except ValueError as e:
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail="Could not read the file. Please upload a valid CSV exported from your bank or UPI app.")

    merchants = df["merchant"].tolist()
    categories = await classify_with_fallback(merchants)

    df["category"] = categories
    df["co2_kg"] = df.apply(
        lambda row: row["amount"] * get_emission_factor(row["category"]), axis=1
    )

    # Clear previous transactions for this user
    cur.execute("DELETE FROM transactions WHERE user_id = ?", (user_id,))

    rows = []
    for _, row in df.iterrows():
        rows.append((
            user_id,
            row.get("date", datetime.now().strftime("%Y-%m-%d")),
            row["merchant"],
            float(row["amount"]),
            row["category"],
            float(row["co2_kg"]),
        ))

    cur.executemany(
        "INSERT INTO transactions (user_id, date, merchant, amount, category, co2_kg) VALUES (?,?,?,?,?,?)",
        rows
    )

    total_co2 = df["co2_kg"].sum()

    # Fetch user city for scoring
    user = cur.execute("SELECT city FROM users WHERE id = ?", (user_id,)).fetchone()
    city = user["city"] if user else "Bengaluru"

    score = calculate_loop_score(total_co2, city)
    personality = get_personality(score)

    # Get existing cumulative CO2 and add this upload's total
    existing = cur.execute("SELECT cumulative_co2 FROM loop_scores WHERE user_id = ?", (user_id,)).fetchone()
    old_cumulative = existing["cumulative_co2"] if existing and existing["cumulative_co2"] else 0
    new_cumulative = old_cumulative + total_co2

    cur.execute(
        """INSERT INTO loop_scores (user_id, score, personality, total_co2, cumulative_co2)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET
             score=excluded.score,
             personality=excluded.personality,
             total_co2=excluded.total_co2,
             cumulative_co2=excluded.cumulative_co2,
             updated_at=CURRENT_TIMESTAMP""",
        (user_id, score, personality["name"], total_co2, new_cumulative)
    )

    # Check for newly unlocked milestones
    from scoring import MILESTONES
    newly_unlocked = []
    for m in MILESTONES:
        if m["id"] == "first_upload":
            # Always unlock first_upload on any upload
            cur.execute(
                "INSERT OR IGNORE INTO user_milestones (user_id, milestone_id) VALUES (?, ?)",
                (user_id, m["id"])
            )
            # Check if it was actually inserted (newly unlocked)
            if cur.rowcount > 0:
                newly_unlocked.append(m)
        elif new_cumulative >= m["threshold"] and old_cumulative < m["threshold"]:
            # Crossed this threshold with this upload
            cur.execute(
                "INSERT OR IGNORE INTO user_milestones (user_id, milestone_id) VALUES (?, ?)",
                (user_id, m["id"])
            )
            newly_unlocked.append(m)

    # Record this upload to prevent duplicates
    cur.execute(
        "INSERT INTO csv_uploads (user_id, file_hash, filename, total_co2, transaction_count) VALUES (?, ?, ?, ?, ?)",
        (user_id, file_hash, file.filename, total_co2, len(df))
    )

    conn.commit()
    conn.close()

    # Update rank streaks for this user across all their circles
    update_streaks_for_user(user_id)

    breakdown = get_category_breakdown(df.to_dict("records"))
    equivalents = co2_to_equivalents(total_co2)

    return {
        "user_id": user_id,
        "transaction_count": len(df),
        "columns_detected": {
            "merchant": detection.get("merchant_col"),
            "amount":   detection.get("amount_col"),
            "date":     detection.get("date_col"),
        },
        "total_co2": round(total_co2, 2),
        "cumulative_co2": round(new_cumulative, 2),
        "score": score,
        "personality": personality,
        "breakdown": {
            k: {
                "co2_kg": round(v, 2),
                "label": CATEGORY_LABELS.get(k, k),
                "percentage": round((v / total_co2) * 100, 1) if total_co2 > 0 else 0,
            }
            for k, v in breakdown.items()
        },
        "equivalents": equivalents,
        "newly_unlocked_milestones": newly_unlocked,
    }


# ── TRANSACTIONS ──────────────────────────────────────────────────────────────

@app.get("/api/transactions/{user_id}")
def get_transactions(user_id: int):
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM transactions WHERE user_id = ? ORDER BY co2_kg DESC LIMIT 50",
        (user_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


class ManualTransactionRequest(BaseModel):
    user_id: int
    category: str
    amount: float
    merchant: str = ""
    date: str = ""  # YYYY-MM-DD format, defaults to today


@app.post("/api/transactions/manual")
def add_manual_transaction(req: ManualTransactionRequest):
    """Add a single manual transaction and recalculate user's carbon score."""
    from scoring import MILESTONES
    
    # Validate category
    if req.category not in CATEGORY_FACTORS:
        raise HTTPException(status_code=400, detail=f"Invalid category: {req.category}")
    
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    # Calculate CO2 for this transaction
    co2_kg = req.amount * get_emission_factor(req.category)
    
    # Use today's date if not provided
    tx_date = req.date if req.date else datetime.now().strftime("%Y-%m-%d")
    merchant = req.merchant if req.merchant else CATEGORY_LABELS.get(req.category, req.category)
    
    conn = get_conn()
    cur = conn.cursor()
    
    # Insert the transaction
    cur.execute(
        "INSERT INTO transactions (user_id, date, merchant, amount, category, co2_kg) VALUES (?,?,?,?,?,?)",
        (req.user_id, tx_date, merchant, req.amount, req.category, co2_kg)
    )
    
    # Recalculate total CO2 from all transactions
    total_co2 = cur.execute(
        "SELECT COALESCE(SUM(co2_kg), 0) FROM transactions WHERE user_id = ?",
        (req.user_id,)
    ).fetchone()[0]
    
    # Get user city for scoring
    user = cur.execute("SELECT city FROM users WHERE id = ?", (req.user_id,)).fetchone()
    city = user["city"] if user else "Bengaluru"
    
    # Calculate new score
    score = calculate_loop_score(total_co2, city)
    personality = get_personality(score)
    
    # Get existing cumulative CO2 and add this transaction's CO2
    existing = cur.execute("SELECT cumulative_co2 FROM loop_scores WHERE user_id = ?", (req.user_id,)).fetchone()
    old_cumulative = existing["cumulative_co2"] if existing and existing["cumulative_co2"] else 0
    new_cumulative = old_cumulative + co2_kg
    
    # Update loop_scores
    cur.execute(
        """INSERT INTO loop_scores (user_id, score, personality, total_co2, cumulative_co2)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET
             score=excluded.score,
             personality=excluded.personality,
             total_co2=excluded.total_co2,
             cumulative_co2=excluded.cumulative_co2,
             updated_at=CURRENT_TIMESTAMP""",
        (req.user_id, score, personality["name"], total_co2, new_cumulative)
    )
    
    # Check for newly unlocked milestones
    newly_unlocked = []
    for m in MILESTONES:
        if m["id"] == "first_upload":
            continue  # Skip first_upload for manual entries
        elif new_cumulative >= m["threshold"] and old_cumulative < m["threshold"]:
            cur.execute(
                "INSERT OR IGNORE INTO user_milestones (user_id, milestone_id) VALUES (?, ?)",
                (req.user_id, m["id"])
            )
            if cur.rowcount > 0:
                newly_unlocked.append(m)
    
    conn.commit()
    conn.close()
    
    # Update rank streaks
    update_streaks_for_user(req.user_id)
    
    return {
        "success": True,
        "transaction": {
            "category": req.category,
            "amount": req.amount,
            "merchant": merchant,
            "date": tx_date,
            "co2_kg": round(co2_kg, 3),
        },
        "updated_stats": {
            "total_co2": round(total_co2, 2),
            "cumulative_co2": round(new_cumulative, 2),
            "score": score,
            "personality": personality,
        },
        "newly_unlocked_milestones": newly_unlocked,
    }


@app.get("/api/categories")
def get_categories():
    """Return list of available categories with labels and emission factors."""
    return [
        {
            "id": cat_id,
            "label": CATEGORY_LABELS.get(cat_id, cat_id),
            "factor": factor,
            "co2_per_100": round(factor * 100, 3),  # CO2 for ₹100 spent
        }
        for cat_id, factor in CATEGORY_FACTORS.items()
    ]


@app.get("/api/calendar/{user_id}")
def get_calendar(user_id: int):
    """Returns daily CO2 totals for the last 35 days — used by the carbon calendar heatmap."""
    from datetime import date, timedelta
    conn = get_conn()

    rows = conn.execute(
        """SELECT date, SUM(co2_kg) as daily_co2, SUM(amount) as daily_spend, COUNT(*) as txn_count
           FROM transactions WHERE user_id = ?
           GROUP BY date ORDER BY date""",
        (user_id,)
    ).fetchall()
    conn.close()

    # Build a day-keyed dict
    by_date = {r["date"]: {"co2": round(r["daily_co2"], 2), "spend": round(r["daily_spend"], 0), "txns": r["txn_count"]}
               for r in rows if r["date"]}

    # Figure out max co2 for intensity scaling
    max_co2 = max((v["co2"] for v in by_date.values()), default=1)

    # Return all dates found plus metadata
    calendar = []
    for d, v in sorted(by_date.items()):
        intensity = min(1.0, v["co2"] / max_co2) if max_co2 > 0 else 0
        calendar.append({
            "date":      d,
            "co2":       v["co2"],
            "spend":     v["spend"],
            "txns":      v["txns"],
            "intensity": round(intensity, 3),
        })

    return {"calendar": calendar, "max_co2": round(max_co2, 2)}


@app.get("/api/city-rank/{user_id}")
def get_city_rank(user_id: int):
    """Returns the user's percentile rank among all users in their city."""
    conn = get_conn()

    user = conn.execute("SELECT city FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")

    city = user["city"]

    # Get all scores in this city
    scores = conn.execute(
        """SELECT ls.score FROM loop_scores ls
           JOIN users u ON ls.user_id = u.id
           WHERE u.city = ? AND ls.score > 0
           ORDER BY ls.score DESC""",
        (city,)
    ).fetchall()

    my_score_row = conn.execute(
        "SELECT score FROM loop_scores WHERE user_id = ?", (user_id,)
    ).fetchone()
    conn.close()

    if not my_score_row or not scores:
        return {"rank": None, "total": 0, "percentile": 50, "city": city}

    my_score = my_score_row["score"]
    total    = len(scores)
    all_scores = [r["score"] for r in scores]
    rank     = sum(1 for s in all_scores if s > my_score) + 1
    percentile = round(((total - rank) / total) * 100) if total > 1 else 50

    return {
        "rank":       rank,
        "total":      total,
        "percentile": percentile,
        "city":       city,
        "my_score":   my_score,
        "top_score":  all_scores[0] if all_scores else my_score,
    }


# ── MILESTONES ────────────────────────────────────────────────────────────────

@app.get("/api/milestones/{user_id}")
def get_milestones(user_id: int):
    """Returns the user's milestone progress: unlocked milestones, next milestone, and cumulative impact."""
    from scoring import MILESTONES, get_milestone_status
    
    conn = get_conn()
    
    # Get user's cumulative CO2
    score_row = conn.execute(
        "SELECT total_co2, cumulative_co2 FROM loop_scores WHERE user_id = ?", (user_id,)
    ).fetchone()
    
    cumulative_co2 = 0
    has_uploaded = False
    if score_row:
        cumulative_co2 = score_row["cumulative_co2"] or score_row["total_co2"] or 0
        has_uploaded = score_row["total_co2"] > 0
    
    # Get already unlocked milestones from DB
    unlocked_rows = conn.execute(
        "SELECT milestone_id, unlocked_at, notified FROM user_milestones WHERE user_id = ?",
        (user_id,)
    ).fetchall()
    conn.close()
    
    unlocked_ids = {r["milestone_id"]: {"unlocked_at": r["unlocked_at"], "notified": r["notified"]} for r in unlocked_rows}
    
    # Build milestone status with DB data
    status = get_milestone_status(cumulative_co2, has_uploaded)
    
    # Enrich with DB unlocked_at timestamps
    for m in status["unlocked"]:
        if m["id"] in unlocked_ids:
            m["unlocked_at"] = unlocked_ids[m["id"]]["unlocked_at"]
            m["notified"] = bool(unlocked_ids[m["id"]]["notified"])
    
    return status


@app.post("/api/milestones/{user_id}/mark-notified")
def mark_milestones_notified(user_id: int, milestone_ids: list[str]):
    """Mark milestones as notified so the celebration modal doesn't show again."""
    conn = get_conn()
    cur = conn.cursor()
    
    for mid in milestone_ids:
        cur.execute(
            "UPDATE user_milestones SET notified = 1 WHERE user_id = ? AND milestone_id = ?",
            (user_id, mid)
        )
    
    conn.commit()
    conn.close()
    return {"success": True}


# ── ACTIONS ───────────────────────────────────────────────────────────────────

@app.get("/api/actions/{user_id}")
async def get_actions(user_id: int):
    conn = get_conn()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Top categories with totals
    top_cats = conn.execute(
        """SELECT category, SUM(amount) as total_amount, SUM(co2_kg) as total_co2,
                  COUNT(*) as txn_count
           FROM transactions WHERE user_id = ?
           GROUP BY category ORDER BY total_co2 DESC LIMIT 5""",
        (user_id,)
    ).fetchall()

    # Top individual merchants (highest CO₂, named specifically)
    top_merchants = conn.execute(
        """SELECT merchant, category, SUM(amount) as total_amount,
                  SUM(co2_kg) as total_co2, COUNT(*) as frequency
           FROM transactions WHERE user_id = ?
           GROUP BY merchant ORDER BY total_co2 DESC LIMIT 10""",
        (user_id,)
    ).fetchall()

    # User's loop score for context
    score_row = conn.execute(
        "SELECT score, personality FROM loop_scores WHERE user_id = ?", (user_id,)
    ).fetchone()

    conn.close()

    if not top_cats:
        return {"actions": []}

    city  = user["city"]
    score = score_row["score"] if score_row else 500
    personality = score_row["personality"] if score_row else "Explorer"

    # Build detailed merchant list
    merchant_lines = "\n".join([
        f"  - {r['merchant']} ({CATEGORY_LABELS.get(r['category'], r['category'])}): "
        f"{r['frequency']}x this month, INR {r['total_amount']:.0f} spent, {r['total_co2']:.1f} kg CO2"
        for r in top_merchants
    ])

    cat_lines = "\n".join([
        f"  - {CATEGORY_LABELS.get(r['category'], r['category'])}: "
        f"{r['txn_count']} transactions, INR {r['total_amount']:.0f} total, {r['total_co2']:.1f} kg CO2"
        for r in top_cats
    ])

    prompt = f"""You are LOOP, a hyper-personalised carbon reduction coach. Generate 5 specific, actionable suggestions for this exact user.

USER PROFILE:
- City: {city}, India
- Loop Score: {score}/1000
- Carbon Personality: {personality}

TOP EMISSION CATEGORIES:
{cat_lines}

ACTUAL MERCHANTS THIS MONTH (most carbon-heavy first):
{merchant_lines}

RULES:
1. Each suggestion MUST reference a specific merchant or spending pattern from the data above by name
2. Tailor every suggestion to {city} specifically (use local services, transit, and platforms)
3. Rank by CO2 saving potential — highest impact first
4. Include a realistic estimated CO2 saving in kg
5. Effort level: low (< 5 min change), medium (new habit), high (lifestyle shift)
6. No em dashes. No bullet points inside descriptions. Plain sentences only.
7. If the user spends on flights, suggest alternatives relevant to their route patterns
8. If electricity is high, suggest specific appliance or usage changes

Return ONLY a valid JSON array of exactly 5 objects. Each object must have:
  category (string), title (string), description (string), co2_saving_kg (number), effort_level ("low"|"medium"|"high")

Example format:
[{{"category":"food_delivery","title":"Cut 3 Swiggy orders this week","description":"You ordered from Swiggy 12 times this month in {city}. Cooking Sunday meal prep covers Monday and Tuesday, cutting 3 orders weekly.","co2_saving_kg":2.8,"effort_level":"medium"}}]"""

    try:
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {os.environ.get('OPENROUTER_API_KEY', '')}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://loop-carbon.app",
                    "X-Title": "LOOP Carbon App",
                },
                json={
                    "model": "nvidia/nemotron-3-ultra-550b-a55b:free",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.35,
                    "max_tokens": 1000,
                }
            )
            data = response.json()
            content = data["choices"][0]["message"]["content"].strip()
            start = content.find("[")
            end   = content.rfind("]") + 1
            if start != -1 and end > start:
                actions = json.loads(content[start:end])
                # Validate structure
                valid = [
                    a for a in actions
                    if isinstance(a, dict)
                    and "title" in a and "description" in a
                    and "co2_saving_kg" in a and "effort_level" in a
                ]
                if valid:
                    return {"actions": valid[:5]}
    except Exception:
        pass

    # Fallback — built from actual user data, city-specific
    metro_name = {
        "Bengaluru": "Namma Metro", "Mumbai": "Mumbai Metro", "Delhi": "Delhi Metro",
        "Chennai": "Chennai Metro", "Hyderabad": "Hyderabad Metro",
        "Kolkata": "Kolkata Metro", "Pune": "Pune Metro", "Ahmedabad": "BRTS / AMTS bus",
    }.get(city, "public transit")

    secondhand = {
        "Ahmedabad": "OLX or Facebook Marketplace",
    }.get(city, "OLX or Quikr")

    # Build fallback actions from actual top categories
    fallback = []
    used_categories = set()

    category_fallbacks = {
        "food_delivery": lambda r: {
            "category": "food_delivery",
            "title": f"Cut back on {r['merchant'].split('/')[0].split('*')[0].strip()} orders",
            "description": f"You spent INR {r['total_amount']:.0f} on food delivery this month in {city} across {r['frequency']} orders. Cooking 2 extra days a week would save roughly {r['total_co2'] * 0.25:.1f} kg CO2 and around INR {r['total_amount'] * 0.25:.0f}.",
            "co2_saving_kg": round(r["total_co2"] * 0.25, 1),
            "effort_level": "medium",
        },
        "ride_hailing": lambda r: {
            "category": "ride_hailing",
            "title": f"Replace {r['frequency']} cab rides with {metro_name}",
            "description": f"You took {r['frequency']} cab rides this month in {city}, producing {r['total_co2']:.1f} kg CO2. {metro_name} covers most city routes at under 5% of the carbon cost.",
            "co2_saving_kg": round(r["total_co2"] * 0.6, 1),
            "effort_level": "low",
        },
        "electricity": lambda r: {
            "category": "electricity",
            "title": "Raise AC set point by 2 degrees",
            "description": f"Your electricity bill this month was INR {r['total_amount']:.0f} in {city}, contributing {r['total_co2']:.1f} kg CO2. Setting AC to 24C instead of 20C reduces consumption by about 6% per degree.",
            "co2_saving_kg": round(r["total_co2"] * 0.12, 1),
            "effort_level": "low",
        },
        "fuel": lambda r: {
            "category": "fuel",
            "title": "Consolidate petrol trips this week",
            "description": f"You spent INR {r['total_amount']:.0f} on fuel this month in {city}. Combining errands into fewer trips and maintaining correct tyre pressure cuts fuel use by 10 to 15%.",
            "co2_saving_kg": round(r["total_co2"] * 0.12, 1),
            "effort_level": "low",
        },
        "flights": lambda r: {
            "category": "flights",
            "title": "Choose train for your next short route",
            "description": f"Flights produced {r['total_co2']:.1f} kg CO2 this month. For routes under 500 km, train travel emits 80 to 90% less CO2 and is often comparable in door-to-door time.",
            "co2_saving_kg": round(r["total_co2"] * 0.5, 1),
            "effort_level": "medium",
        },
        "shopping_fashion": lambda r: {
            "category": "shopping_fashion",
            "title": "Buy secondhand for your next clothing purchase",
            "description": f"You spent INR {r['total_amount']:.0f} on fashion this month. {secondhand} in {city} has quality items at 60% lower carbon cost than buying new.",
            "co2_saving_kg": round(r["total_co2"] * 0.4, 1),
            "effort_level": "low",
        },
        "electronics": lambda r: {
            "category": "electronics",
            "title": "Repair before replacing your next device",
            "description": f"Electronics spending produced {r['total_co2']:.1f} kg CO2. Local repair shops in {city} fix most devices for under INR 500, saving up to 15 kg CO2 vs buying new.",
            "co2_saving_kg": round(r["total_co2"] * 0.5, 1),
            "effort_level": "low",
        },
    }

    for row in top_merchants:
        cat = row["category"]
        if cat in used_categories:
            continue
        if cat in category_fallbacks:
            fallback.append(category_fallbacks[cat](row))
            used_categories.add(cat)
        if len(fallback) == 5:
            break

    # Pad with generic if needed
    if len(fallback) < 5:
        fallback.append({
            "category": "other",
            "title": "Audit your top 3 recurring subscriptions",
            "description": f"Streaming, software, and delivery subscriptions add up. Cancelling unused ones saves both money and the server energy behind them.",
            "co2_saving_kg": 0.5,
            "effort_level": "low",
        })

    return {"actions": fallback[:5]}


# ── CARBON STORY ──────────────────────────────────────────────────────────────

@app.get("/api/story/{user_id}")
async def get_story(user_id: int):
    conn = get_conn()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    score_row = conn.execute(
        "SELECT * FROM loop_scores WHERE user_id = ?", (user_id,)
    ).fetchone()
    txns = conn.execute(
        "SELECT category, co2_kg FROM transactions WHERE user_id = ?", (user_id,)
    ).fetchall()
    conn.close()

    if not user or not score_row:
        raise HTTPException(status_code=404, detail="User data not found")

    if not txns:
        return {
            "story": "You haven't uploaded any transactions yet. Head to the Upload page, drop in your bank CSV, and your Carbon Story will be ready in seconds.",
            "score": score_row["score"] if score_row else 0,
            "personality": score_row["personality"] if score_row else "Explorer",
            "total_co2": 0,
        }

    breakdown = get_category_breakdown([dict(t) for t in txns])

    story = await generate_carbon_story(
        user_name=user["name"],
        personality=score_row["personality"],
        score=score_row["score"],
        total_co2=score_row["total_co2"],
        breakdown=breakdown,
        city=user["city"],
    )

    return {
        "story": story,
        "score": score_row["score"],
        "personality": score_row["personality"],
        "total_co2": score_row["total_co2"],
    }


# ── MAP (OpenStreetMap Nominatim + Overpass) ──────────────────────────────────

@app.get("/api/map/{user_id}")
def get_map_points(user_id: int, lat: float = 12.9716, lon: float = 77.5946):
    import math, random

    def haversine(lat1, lon1, lat2, lon2) -> float:
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
        return R * 2 * math.asin(math.sqrt(a))

    conn = get_conn()
    all_cats = conn.execute(
        """SELECT category, SUM(co2_kg) as total_co2, SUM(amount) as total_spent
           FROM transactions WHERE user_id = ?
           GROUP BY category ORDER BY total_co2 DESC""",
        (user_id,)
    ).fetchall()
    user = conn.execute("SELECT city FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()

    city = user["city"] if user else "Bengaluru"

    # City-specific place names for realism
    CITY_NAMES: dict = {
        "Bengaluru":  {"metro": "Namma Metro", "bike": "Yulu Bike Dock", "recycle": "BBMP Dry Waste Centre",  "ev": "BESCOM EV Charger",   "thrift": "Hastashilpa Thrift",    "compost": "Namma Compost Hub",   "repair": "SP Road E-Waste Drop", "solar": "Bescom Solar Kiosk"},
        "Mumbai":     {"metro": "Mumbai Metro", "bike": "Mobi Cycles",    "recycle": "BMC Recycling Point",    "ev": "MSEDCL EV Charger",   "thrift": "Chor Bazaar Thrift",    "compost": "Mahanagar Compost",   "repair": "Lamington Road Repair","solar": "BEST Solar Hub"},
        "Delhi":      {"metro": "Delhi Metro",  "bike": "Cycles4Change",  "recycle": "MCD Recycling Kiosk",    "ev": "BSES EV Station",     "thrift": "Sarojini Thrift Shop",  "compost": "Delhi Compost Depot", "repair": "Nehru Place Repair",   "solar": "BRPL Solar Point"},
        "Chennai":    {"metro": "Chennai Metro","bike": "Pedal Chennai",  "recycle": "GCC Dry Waste Centre",   "ev": "TNEB EV Charger",     "thrift": "Moore Market Thrift",   "compost": "Chennai Compost Hub", "repair": "Ritchie St Repair",    "solar": "TANGEDCO Solar Kiosk"},
        "Hyderabad":  {"metro": "Hyderabad Metro","bike":"Pedal Hyd",     "recycle": "GHMC Dry Waste Centre",  "ev": "TSREDCO EV Charger",  "thrift": "Abids Thrift Market",   "compost": "GHMC Compost Centre", "repair": "SP Road E-Waste",      "solar": "TSGENCO Solar Hub"},
        "Pune":       {"metro": "Pune Metro",   "bike": "Smart Bike Pune","recycle": "PMC Recycling Point",    "ev": "MSEDCL EV Hub",       "thrift": "Tulsi Baug Thrift",     "compost": "PMC Compost Depot",   "repair": "Deccan E-Waste Drop",  "solar": "MSEDCL Solar Kiosk"},
        "Kolkata":    {"metro": "Kolkata Metro","bike": "KMC Cycle Dock", "recycle": "KMC Recycling Centre",   "ev": "CESC EV Charger",     "thrift": "New Market Thrift",     "compost": "KMC Green Hub",       "repair": "Chandni Chowk Repair", "solar": "WBSEDCL Solar Point"},
        "Ahmedabad":  {"metro": "BRTS / AMTS",  "bike": "AMC Cycle Stand","recycle": "AMC Dry Waste Centre",   "ev": "UGVCL EV Charger",    "thrift": "Law Garden Thrift",     "compost": "AMC Compost Centre",  "repair": "RTO Circle E-Waste",   "solar": "GUVNL Solar Kiosk"},
    }
    names = CITY_NAMES.get(city, CITY_NAMES["Bengaluru"])

    # Full catalogue of point types — category → multiple points
    CATALOGUE = [
        # (label, category, color, icon, action, co2_saving_kg, (dlat, dlon))
        # Metro / transit
        (names["metro"] + " Station",     "ride_hailing",    "#3b82f6", "train",   "use metro instead of cab",           6.8,  ( 0.012,  0.009)),
        (names["metro"] + " Station",     "ride_hailing",    "#3b82f6", "train",   "use metro instead of cab",           5.1,  (-0.018,  0.014)),
        # Bikes
        (names["bike"],                    "ride_hailing",    "#34d399", "bike",    "rent a bicycle for short trips",     3.2,  ( 0.005, -0.011)),
        (names["bike"] + " (South)",       "ride_hailing",    "#34d399", "bike",    "rent a bicycle for short trips",     2.9,  (-0.009,  0.017)),
        # EV
        (names["ev"],                      "fuel",            "#f97316", "zap",     "charge your EV here",                5.1,  ( 0.022, -0.008)),
        (names["ev"] + " (Express)",       "fuel",            "#f97316", "zap",     "charge your EV here",                4.4,  (-0.014, -0.019)),
        # Recycling / dry waste
        (names["recycle"],                 "grocery",         "#84cc16", "recycle", "drop off dry waste for recycling",   1.4,  (-0.007,  0.006)),
        (names["recycle"] + " (Ward 2)",   "grocery",         "#84cc16", "recycle", "drop off dry waste for recycling",   1.2,  ( 0.016,  0.021)),
        # Composting
        (names["compost"],                 "food_delivery",   "#22c55e", "leaf",    "compost food and organic waste",     2.1,  (-0.019,  0.009)),
        (names["compost"] + " (North)",    "food_delivery",   "#22c55e", "leaf",    "compost food and organic waste",     1.8,  ( 0.004, -0.023)),
        # Thrift / secondhand
        (names["thrift"],                  "shopping_fashion","#ec4899", "shirt",   "buy or donate secondhand clothing",  4.2,  ( 0.009,  0.024)),
        (names["thrift"] + " Exchange",    "shopping_fashion","#ec4899", "shirt",   "buy or donate secondhand clothing",  3.7,  (-0.021,  0.005)),
        # E-waste / repair
        (names["repair"],                  "electronics",     "#06b6d4", "wrench",  "repair or recycle old electronics",  8.4,  ( 0.017, -0.013)),
        (names["repair"] + " (Annex)",     "electronics",     "#06b6d4", "wrench",  "repair or recycle old electronics",  7.1,  (-0.011, -0.020)),
        # Solar
        (names["solar"],                   "electricity",     "#eab308", "sun",     "explore solar energy options",       3.9,  ( 0.025,  0.003)),
        # Extra baseline points
        ("Community Green Park",           "food_delivery",   "#16a34a", "leaf",    "walk or cycle here instead of driving", 1.5, (-0.006, -0.008)),
        ("Zero-Waste Grocery",             "grocery",         "#65a30d", "recycle", "bring your own bags and containers", 0.9,  ( 0.011,  0.016)),
        ("Bicycle Parking Hub",            "ride_hailing",    "#10b981", "bike",    "cycle to nearby destinations",       2.4,  (-0.015,  0.022)),
        ("Organic Farmers Market",         "food_delivery",   "#22c55e", "leaf",    "buy local produce to cut delivery emissions", 2.8, (0.020, -0.017)),
        ("Textile Collection Point",       "shopping_fashion","#d946ef", "shirt",   "donate old clothes instead of discarding",   3.1, (-0.024, 0.011)),
    ]

    # Determine which categories user actually has (for personalisation)
    user_cats = {r["category"]: r["total_co2"] for r in all_cats}

    all_points = []
    seen = set()

    for (name, cat, color, icon, action, base_saving, (dlat, dlon)) in CATALOGUE:
        plat = lat + dlat
        plon = lon + dlon
        key  = f"{plat:.5f}_{plon:.5f}"
        if key in seen:
            continue
        seen.add(key)

        dist_km = round(haversine(lat, lon, plat, plon), 2)

        # Scale CO2 saving by user's actual emissions in that category
        co2_in_cat = user_cats.get(cat, 0)
        if co2_in_cat > 0:
            saving = round(base_saving * (1 + co2_in_cat / 50), 1)
        else:
            saving = base_saving

        all_points.append({
            "lat":            plat,
            "lon":            plon,
            "name":           name,
            "type":           cat,
            "category":       cat,
            "category_label": CATEGORY_LABELS.get(cat, cat.replace("_", " ").title()),
            "color":          color,
            "icon":           icon,
            "address":        f"Near {city} city centre",
            "distance_km":    dist_km,
            "action":         action,
            "co2_saving_kg":  saving,
            "opening_hours":  "Mon-Sat 9am-7pm",
            "phone":          "",
            "website":        "",
        })

    # Sort by distance, prioritise user's top-emission categories first
    def sort_key(p):
        # Primary: user has emissions in this category (lower = higher priority)
        has_data = 0 if p["category"] in user_cats else 1
        return (has_data, p["distance_km"])

    all_points.sort(key=sort_key)

    # Build category summary for filter tabs
    cat_summary: dict = {}
    for p in all_points:
        cat = p["category"]
        if cat not in cat_summary:
            cat_summary[cat] = {"count": 0, "label": p["category_label"], "color": p["color"]}
        cat_summary[cat]["count"] += 1

    return {
        "points":      all_points[:20],
        "center":      {"lat": lat, "lon": lon},
        "city":        city,
        "total_found": len(all_points),
        "categories":  cat_summary,
    }


# ── CIRCLES ───────────────────────────────────────────────────────────────────

@app.get("/api/circles/{user_id}")
def get_user_circles(user_id: int):
    conn = get_conn()
    circles = conn.execute(
        """SELECT c.id, c.name, c.code
           FROM circles c
           JOIN circle_members cm ON c.id = cm.circle_id
           WHERE cm.user_id = ?""",
        (user_id,)
    ).fetchall()

    result = []
    for circle in circles:
        members = conn.execute(
            """SELECT u.id, u.name, u.email, ls.score, ls.personality, ls.total_co2
               FROM circle_members cm
               JOIN users u ON cm.user_id = u.id
               LEFT JOIN loop_scores ls ON u.id = ls.user_id
               WHERE cm.circle_id = ?
               ORDER BY ls.score DESC""",
            (circle["id"],)
        ).fetchall()

        # Get streak data for this circle
        streaks = get_circle_streaks(circle["id"])

        total_co2 = sum(m["total_co2"] or 0 for m in members)
        result.append({
            "id":   circle["id"],
            "name": circle["name"],
            "code": circle["code"],
            "member_count":      len(members),
            "total_co2_avoided": round(max(0, 58.0 * len(members) - total_co2), 1),
            "members": [
                {
                    "user_id":     m["id"],
                    "name":        m["name"],
                    "email":       m["email"] or "",
                    "score":       m["score"] or 0,
                    "personality": m["personality"] or "Explorer",
                    "total_co2":   round(m["total_co2"] or 0, 1),
                    "streak_days":    streaks.get(m["id"], {}).get("streak_days", 0),
                    "reward_earned":  bool(streaks.get(m["id"], {}).get("reward_earned", 0)),
                    "reward_date":    streaks.get(m["id"], {}).get("reward_date"),
                }
                for m in members
            ],
        })

    conn.close()
    return {"circles": result}


@app.post("/api/circles/join")
def join_circle(payload: CircleJoin):
    conn = get_conn()
    circle = conn.execute(
        "SELECT * FROM circles WHERE code = ?", (payload.code,)
    ).fetchone()
    if not circle:
        raise HTTPException(status_code=404, detail="Circle not found. Check the code.")
    conn.execute(
        "INSERT OR IGNORE INTO circle_members (circle_id, user_id) VALUES (?, ?)",
        (circle["id"], payload.user_id)
    )
    conn.commit()
    conn.close()
    return {"message": "Joined circle", "circle_name": circle["name"]}


@app.post("/api/circles/create")
def create_circle(payload: CircleCreate):
    code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    conn = get_conn()
    conn.execute(
        "INSERT INTO circles (name, code) VALUES (?, ?)", (payload.name, code)
    )
    circle_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.execute(
        "INSERT OR IGNORE INTO circle_members (circle_id, user_id) VALUES (?, ?)",
        (circle_id, payload.user_id)
    )
    conn.commit()
    conn.close()
    return {"code": code, "circle_name": payload.name}


# ── HEALTH ────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "LOOP API"}
