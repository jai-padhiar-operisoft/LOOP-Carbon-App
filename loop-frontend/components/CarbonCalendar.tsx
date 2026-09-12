"use client";

interface CalendarDay {
  date: string;
  co2: number;
  spend: number;
  txns: number;
  intensity: number;
}

interface Props {
  calendar: CalendarDay[];
  maxCo2: number;
}

function getColor(intensity: number): string {
  if (intensity === 0) return "rgba(255,255,255,0.04)";
  if (intensity < 0.2) return "rgba(74,222,128,0.25)";
  if (intensity < 0.4) return "rgba(74,222,128,0.45)";
  if (intensity < 0.6) return "rgba(234,179,8,0.55)";
  if (intensity < 0.8) return "rgba(249,115,22,0.65)";
  return "rgba(239,68,68,0.75)";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", weekday: "short" });
}

export default function CarbonCalendar({ calendar, maxCo2 }: Props) {
  if (!calendar || calendar.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text3)", fontSize: "13px" }}>
        No transaction dates found. Make sure your CSV has a date column.
      </div>
    );
  }

  // Group by week rows (7 cols per row)
  const weeks: (CalendarDay | null)[][] = [];
  let week: (CalendarDay | null)[] = [];

  // Pad start so first day aligns to its weekday
  const firstDate = new Date(calendar[0].date);
  const startPad  = firstDate.getDay(); // 0=Sun
  for (let i = 0; i < startPad; i++) week.push(null);

  for (const day of calendar) {
    week.push(day);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div>
      {/* Day labels */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px", marginBottom: "4px" }}>
        {DAY_LABELS.map(d => (
          <div key={d} style={{ fontSize: "10px", color: "var(--text3)", textAlign: "center", fontWeight: 600 }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px" }}>
            {week.map((day, di) => (
              <div
                key={di}
                title={day ? `${formatDate(day.date)}\n${day.co2} kg CO₂ · ₹${day.spend} · ${day.txns} txns` : ""}
                style={{
                  height: "22px",
                  borderRadius: "4px",
                  background: day ? getColor(day.intensity) : "transparent",
                  border: day ? "1px solid rgba(255,255,255,0.06)" : "none",
                  cursor: day ? "help" : "default",
                  transition: "transform 0.1s",
                  position: "relative",
                }}
                onMouseEnter={e => { if (day) (e.currentTarget as HTMLDivElement).style.transform = "scale(1.3)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "10px", justifyContent: "flex-end" }}>
        <span style={{ fontSize: "10px", color: "var(--text3)" }}>Less</span>
        {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map(v => (
          <div key={v} style={{ width: "12px", height: "12px", borderRadius: "3px", background: getColor(v), border: "1px solid rgba(255,255,255,0.06)" }} />
        ))}
        <span style={{ fontSize: "10px", color: "var(--text3)" }}>More</span>
      </div>

      <p style={{ fontSize: "11px", color: "var(--text3)", marginTop: "6px", textAlign: "right" }}>
        Hover any day to see CO₂ and spend · Max: {maxCo2} kg in a day
      </p>
    </div>
  );
}
