import os
import random
import string
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import jwt, JWTError

# ── CONFIG ────────────────────────────────────────────────────────────────────
SECRET_KEY      = os.environ.get("JWT_SECRET_KEY", "loop-super-secret-jwt-key-hackout26-change-in-prod")
ALGORITHM       = "HS256"
TOKEN_EXPIRE_H  = 72   # session lasts 72 hours
OTP_EXPIRE_MIN  = 10   # OTP valid for 10 minutes
RESEND_API_KEY  = os.environ.get("RESEND_API_KEY", "")
FROM_EMAIL      = "onboarding@resend.dev"

# ── PASSWORD RULES ────────────────────────────────────────────────────────────
import re

def validate_password(password: str) -> list[str]:
    """Returns list of unmet requirements. Empty list = password is valid."""
    errors = []
    if len(password) < 12:
        errors.append("At least 12 characters")
    if not re.search(r"[A-Z]", password):
        errors.append("At least one uppercase letter")
    if not re.search(r"[a-z]", password):
        errors.append("At least one lowercase letter")
    if not re.search(r"\d", password):
        errors.append("At least one number")
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]", password):
        errors.append("At least one special character (!@#$%^&* etc.)")
    return errors

def validate_username(username: str) -> list[str]:
    """Returns list of issues. Empty = valid."""
    errors = []
    if len(username) < 3:
        errors.append("At least 3 characters")
    if len(username) > 20:
        errors.append("At most 20 characters")
    if not re.match(r"^[a-zA-Z0-9]+$", username):
        errors.append("Only letters and digits allowed. No spaces or symbols.")
    return errors

# ── OTP ───────────────────────────────────────────────────────────────────────
def generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))

def otp_expiry() -> str:
    return (datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MIN)).isoformat()

def is_otp_expired(expiry_str: str) -> bool:
    expiry = datetime.fromisoformat(expiry_str)
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) > expiry

# ── PASSWORD HASHING ──────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode(), salt).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

# ── JWT TOKENS ────────────────────────────────────────────────────────────────
def create_token(user_id: int, email: str) -> str:
    payload = {
        "sub":     str(user_id),
        "email":   email,
        "exp":     datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_H),
        "iat":     datetime.now(timezone.utc),
        "jti":     secrets.token_hex(16),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None

# ── EMAIL ─────────────────────────────────────────────────────────────────────
def send_otp_email(to_email: str, otp: str, is_new_user: bool = True) -> bool:
    try:
        import resend
        resend.api_key = RESEND_API_KEY

        subject = "Your LOOP verification code"
        action  = "Welcome to LOOP! Complete your setup" if is_new_user else "Your login verification code"

        html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #080b0f; margin: 0; padding: 40px 20px; }}
    .card {{ background: #111827; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; max-width: 480px; margin: 0 auto; padding: 40px; }}
    .logo {{ font-size: 32px; font-weight: 900; letter-spacing: -2px; color: #f1f5f9; margin-bottom: 8px; }}
    .logo span {{ color: #4ade80; }}
    .subtitle {{ font-size: 14px; color: #64748b; margin-bottom: 32px; }}
    .action {{ font-size: 18px; font-weight: 600; color: #f1f5f9; margin-bottom: 24px; }}
    .otp-box {{ background: #1a2535; border: 1px solid rgba(74,222,128,0.3); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px; }}
    .otp {{ font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #4ade80; font-family: monospace; }}
    .otp-label {{ font-size: 12px; color: #64748b; margin-top: 8px; text-transform: uppercase; letter-spacing: 2px; }}
    .note {{ font-size: 13px; color: #475569; line-height: 1.6; }}
    .expire {{ color: #f97316; font-weight: 600; }}
    .footer {{ margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 12px; color: #334155; text-align: center; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">L<span>OO</span>P</div>
    <div class="subtitle">Not a carbon tracker. A carbon mirror that talks back.</div>
    <div class="action">{action}</div>
    <div class="otp-box">
      <div class="otp">{otp}</div>
      <div class="otp-label">Your verification code</div>
    </div>
    <div class="note">
      This code expires in <span class="expire">10 minutes</span>. Do not share it with anyone.<br/><br/>
      If you did not request this, you can safely ignore this email.
    </div>
    <div class="footer">LOOP &nbsp;·&nbsp; HackOut &apos;26 &nbsp;·&nbsp; Circular Carbon Ecosystem</div>
  </div>
</body>
</html>
"""
        resend.Emails.send({
            "from":    FROM_EMAIL,
            "to":      to_email,
            "subject": subject,
            "html":    html,
        })
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        return False
