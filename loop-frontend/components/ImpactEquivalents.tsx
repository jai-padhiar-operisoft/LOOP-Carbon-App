"use client";

import {
  TreePine, Car, Smartphone, Recycle, 
  Coffee, Wind, Train, Plane, 
  UtensilsCrossed, Tv, Lightbulb, Bike,
} from "lucide-react";

interface Equivalents {
  trees_month?: number;
  km_driven?: number;
  phone_charges?: number;
  plastic_bottles?: number;
  auto_rides?: number;
  chai_cups?: number;
  ac_hours?: number;
  metro_trips?: number;
  flight_minutes?: number;
  biryani_plates?: number;
  netflix_hours?: number;
  led_bulb_hours?: number;
}

interface ImpactEquivalentsProps {
  equivalents: Equivalents;
  totalCo2: number;
}

const EQUIVALENTS_CONFIG = [
  { key: "trees_month",     icon: TreePine,         label: "trees needed",        suffix: "/month to offset", color: "#22c55e" },
  { key: "km_driven",       icon: Car,              label: "km driven",           suffix: "by petrol car",    color: "#f97316" },
  { key: "ac_hours",        icon: Wind,             label: "AC hours",            suffix: "of 1.5 ton AC",    color: "#3b82f6" },
  { key: "flight_minutes",  icon: Plane,            label: "flight mins",         suffix: "domestic flight",  color: "#8b5cf6" },
  { key: "auto_rides",      icon: Bike,             label: "auto rides",          suffix: "avg 5km each",     color: "#eab308" },
  { key: "metro_trips",     icon: Train,            label: "metro trips",         suffix: "avg 10km each",    color: "#06b6d4" },
  { key: "chai_cups",       icon: Coffee,           label: "chai cups",           suffix: "cutting chai",     color: "#d97706" },
  { key: "biryani_plates",  icon: UtensilsCrossed,  label: "veg thali plates",    suffix: "full thali",       color: "#ef4444" },
  { key: "netflix_hours",   icon: Tv,               label: "streaming hrs",       suffix: "of Netflix",       color: "#e11d48" },
  { key: "phone_charges",   icon: Smartphone,       label: "phone charges",       suffix: "full charges",     color: "#6366f1" },
  { key: "led_bulb_hours",  icon: Lightbulb,        label: "LED hours",           suffix: "9W bulb",          color: "#fbbf24" },
  { key: "plastic_bottles", icon: Recycle,          label: "bottles",             suffix: "500ml PET",        color: "#14b8a6" },
];

export default function ImpactEquivalents({ equivalents, totalCo2 }: ImpactEquivalentsProps) {
  // Select 6 most impactful/interesting equivalents to display
  const displayEquivalents = EQUIVALENTS_CONFIG.filter(eq => {
    const val = equivalents[eq.key as keyof Equivalents];
    return val !== undefined && val > 0;
  }).slice(0, 6);

  return (
    <div className="impact-equivalents">
      <div className="impact-header">
        <p className="section-eyebrow" style={{ marginBottom: "4px" }}>Real-World Impact</p>
        <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text1)", letterSpacing: "-0.2px" }}>
          What {totalCo2} kg CO₂ looks like
        </h3>
        <p style={{ fontSize: "13px", color: "var(--text2)", marginTop: "4px" }}>
          Your footprint translated into everyday equivalents
        </p>
      </div>

      <div className="equivalents-grid">
        {displayEquivalents.map(({ key, icon: Icon, label, suffix, color }) => {
          const value = equivalents[key as keyof Equivalents];
          if (!value) return null;
          
          // Format large numbers
          const displayValue = value >= 10000 
            ? `${(value / 1000).toFixed(1)}k` 
            : value >= 1000 
              ? value.toLocaleString() 
              : String(value);

          return (
            <div key={key} className="equivalent-item">
              <div 
                className="equivalent-icon" 
                style={{ 
                  background: `${color}15`, 
                  borderColor: `${color}30`,
                  color 
                }}
              >
                <Icon size={18} />
              </div>
              <div className="equivalent-content">
                <p className="equivalent-value" style={{ color }}>
                  {displayValue}
                </p>
                <p className="equivalent-label">{label}</p>
                <p className="equivalent-suffix">{suffix}</p>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .impact-equivalents {
          padding: 0;
        }

        .impact-header {
          margin-bottom: 20px;
        }

        .equivalents-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .equivalent-item {
          background: var(--dark3);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          transition: all 0.2s ease;
        }

        .equivalent-item:hover {
          border-color: var(--border2);
          transform: translateY(-2px);
        }

        .equivalent-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .equivalent-content {
          flex: 1;
          min-width: 0;
        }

        .equivalent-value {
          font-size: 20px;
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 2px;
        }

        .equivalent-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text2);
          margin-bottom: 1px;
        }

        .equivalent-suffix {
          font-size: 11px;
          color: var(--text3);
        }

        @media (max-width: 768px) {
          .equivalents-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
