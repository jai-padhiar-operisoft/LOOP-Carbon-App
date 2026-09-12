"""
Rank streak tracking for LOOP Circles.
Called whenever a user's score updates (after CSV upload).
Tracks how many consecutive days a user holds #1 in each circle.
Awards a reward badge at 10 days.
"""

from datetime import date, timedelta
from database import get_conn

STREAK_REWARD_DAYS = 10  # days at #1 to earn the reward


def update_streaks_for_user(user_id: int) -> list[dict]:
    """
    Called after a user's score changes.
    Checks all circles the user belongs to.
    If they are currently #1, increments or starts their streak.
    If they lost #1, resets their streak to 0.
    Returns list of any newly earned rewards.
    """
    conn  = get_conn()
    cur   = conn.cursor()
    today = date.today().isoformat()
    newly_earned = []

    # Get all circles this user belongs to
    circles = cur.execute(
        "SELECT circle_id FROM circle_members WHERE user_id = ?", (user_id,)
    ).fetchall()

    for row in circles:
        circle_id = row["circle_id"]

        # Find current #1 in this circle
        top = cur.execute(
            """SELECT cm.user_id, ls.score
               FROM circle_members cm
               LEFT JOIN loop_scores ls ON cm.user_id = ls.user_id
               WHERE cm.circle_id = ?
               ORDER BY ls.score DESC NULLS LAST
               LIMIT 1""",
            (circle_id,)
        ).fetchone()

        is_top = top and top["user_id"] == user_id

        # Get existing streak record
        streak = cur.execute(
            "SELECT * FROM rank_streaks WHERE circle_id = ? AND user_id = ?",
            (circle_id, user_id)
        ).fetchone()

        if is_top:
            if streak is None:
                # First time at #1 in this circle
                cur.execute(
                    """INSERT INTO rank_streaks
                       (circle_id, user_id, streak_days, streak_start, last_checked, reward_earned)
                       VALUES (?, ?, 1, ?, ?, 0)""",
                    (circle_id, user_id, today, today)
                )
            else:
                last = streak["last_checked"]
                already_rewarded = streak["reward_earned"]

                if last == today:
                    # Already updated today — just ensure streak is correct
                    pass
                else:
                    last_date = date.fromisoformat(last)
                    gap = (date.today() - last_date).days

                    if gap <= 1:
                        # Consecutive day — increment
                        new_streak = streak["streak_days"] + 1
                        reward_date = streak["reward_date"]
                        earned = already_rewarded

                        if new_streak >= STREAK_REWARD_DAYS and not already_rewarded:
                            earned = 1
                            reward_date = today
                            newly_earned.append({
                                "circle_id": circle_id,
                                "user_id":   user_id,
                                "streak_days": new_streak,
                            })

                        cur.execute(
                            """UPDATE rank_streaks
                               SET streak_days=?, last_checked=?, reward_earned=?, reward_date=?
                               WHERE circle_id=? AND user_id=?""",
                            (new_streak, today, earned, reward_date, circle_id, user_id)
                        )
                    else:
                        # Gap > 1 day — streak broken, restart
                        cur.execute(
                            """UPDATE rank_streaks
                               SET streak_days=1, streak_start=?, last_checked=?, reward_earned=0, reward_date=NULL
                               WHERE circle_id=? AND user_id=?""",
                            (today, today, circle_id, user_id)
                        )
        else:
            # Not #1 — reset streak if exists
            if streak:
                cur.execute(
                    """UPDATE rank_streaks
                       SET streak_days=0, last_checked=?, reward_earned=0, reward_date=NULL
                       WHERE circle_id=? AND user_id=?""",
                    (today, circle_id, user_id)
                )

    conn.commit()
    conn.close()
    return newly_earned


def get_circle_streaks(circle_id: int) -> dict:
    """
    Returns streak data for all members of a circle.
    Key: user_id, Value: streak info dict.
    """
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM rank_streaks WHERE circle_id = ?", (circle_id,)
    ).fetchall()
    conn.close()
    return {r["user_id"]: dict(r) for r in rows}


def get_user_reward_status(user_id: int) -> list[dict]:
    """
    Returns all reward records for a user across all circles.
    """
    conn = get_conn()
    rows = conn.execute(
        """SELECT rs.*, c.name as circle_name, c.code as circle_code
           FROM rank_streaks rs
           JOIN circles c ON rs.circle_id = c.id
           WHERE rs.user_id = ? AND rs.streak_days > 0""",
        (user_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]
