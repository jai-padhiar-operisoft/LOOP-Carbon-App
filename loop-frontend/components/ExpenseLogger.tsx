"use client";

import { useState, useEffect } from "react";
import {
  X, Plus, Zap, Car, Fuel, Plane, Lightbulb, ShoppingBag,
  Smartphone, ShoppingCart, UtensilsCrossed, Building2, Tv,
  Dumbbell, Train, HelpCircle, Check, Loader2, Leaf,
  Coffee, Pizza, Bus,
} from "lucide-react";

// Category icons mapping
const CATEGORY_ICONS: Record<string, any> = {
  food_delivery: Pizza,
  ride_hailing: Car,
  fuel: Fuel,
  flights: Plane,
  electricity: Lightbulb,
  shopping_fashion: ShoppingBag,
  electronics: Smartphone,
  grocery: ShoppingCart,
  restaurant: UtensilsCrossed,
  hotel: Building2,
  streaming: Tv,
  gym_wellness: Dumbbell,
  public_transport: Train,
  other: HelpCircle,
};

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  food_delivery: "#f97316",
  ride_hailing: "#eab308",
  fuel: "#ef4444",
  flights: "#8b5cf6",
  electricity: "#3b82f6",
  shopping_fashion: "#ec4899",
  electronics: "#6366f1",
  grocery: "#22c55e",
  restaurant: "#f59e0b",
  hotel: "#14b8a6",
  streaming: "#e11d48",
  gym_wellness: "#10b981",
  public_transport: "#06b6d4",
  other: "#6b7280",
};

// Quick add presets - common expenses with default amounts
const QUICK_ADD_PRESETS = [
  { id: "swiggy", label: "Food Delivery", icon: Pizza, category: "food_delivery", amount: 300, merchant: "Swiggy/Zomato", color: "#f97316" },
  { id: "uber", label: "Cab Ride", icon: Car, category: "ride_hailing", amount: 200, merchant: "Uber/Ola", color: "#eab308" },
  { id: "petrol", label: "Petrol", icon: Fuel, category: "fuel", amount: 500, merchant: "Petrol Pump", color: "#ef4444" },
  { id: "chai", label: "Chai/Coffee", icon: Coffee, category: "restaurant", amount: 50, merchant: "Cafe", color: "#f59e0b" },
  { id: "metro", label: "Metro/Bus", icon: Bus, category: "public_transport", amount: 40, merchant: "Metro", color: "#06b6d4" },
  { id: "grocery", label: "Grocery", icon: ShoppingCart, category: "grocery", amount: 500, merchant: "Grocery Store", color: "#22c55e" },
  { id: "electricity", label: "Electricity", icon: Lightbulb, category: "electricity", amount: 1500, merchant: "Electricity Bill", color: "#3b82f6" },
  { id: "shopping", label: "Shopping", icon: ShoppingBag, category: "shopping_fashion", amount: 1000, merchant: "Shopping", color: "#ec4899" },
];

interface Category {
  id: string;
  label: string;
  factor: number;
  co2_per_100: number;
}

interface ExpenseLoggerProps {
  userId: number;
  onClose: () => void;
  onSuccess: (data: any) => void;
}

export default function ExpenseLogger({ userId, onClose, onSuccess }: ExpenseLoggerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Preview CO2
  const [previewCo2, setPreviewCo2] = useState(0);

  // Fetch categories on mount
  useEffect(() => {
    fetch("/api/categories")
      .then(r => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  // Update CO2 preview when category or amount changes
  useEffect(() => {
    const cat = categories.find(c => c.id === category);
    if (cat && amount) {
      setPreviewCo2(parseFloat(amount) * cat.factor);
    } else {
      setPreviewCo2(0);
    }
  }, [category, amount, categories]);

  // Handle quick add click
  async function handleQuickAdd(preset: typeof QUICK_ADD_PRESETS[0]) {
    setSubmitting(true);
    setError("");
    
    try {
      const res = await fetch("/api/transactions/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          category: preset.category,
          amount: preset.amount,
          merchant: preset.merchant,
          date: new Date().toISOString().split("T")[0],
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to add expense");
      
      setSuccess(true);
      setTimeout(() => {
        onSuccess(data);
      }, 800);
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  // Handle form submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category || !amount) {
      setError("Please select a category and enter an amount");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/transactions/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          category,
          amount: parseFloat(amount),
          merchant: merchant || undefined,
          date: date || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to add expense");

      setSuccess(true);
      setTimeout(() => {
        onSuccess(data);
      }, 800);
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  const selectedCat = categories.find(c => c.id === category);
  const SelectedIcon = category ? CATEGORY_ICONS[category] || HelpCircle : null;

  return (
    <div className="expense-overlay" onClick={onClose}>
      <div className="expense-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="expense-header">
          <div>
            <h2>Log Expense</h2>
            <p>Track your spending and carbon footprint</p>
          </div>
          <button className="expense-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="expense-success">
            <div className="success-icon">
              <Check size={32} />
            </div>
            <h3>Expense Logged!</h3>
            <p>Your carbon footprint has been updated</p>
          </div>
        ) : (
          <>
            {/* Quick Add Section */}
            <div className="quick-add-section">
              <p className="section-label">Quick Add</p>
              <div className="quick-add-grid">
                {QUICK_ADD_PRESETS.map(preset => {
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.id}
                      className="quick-add-btn"
                      onClick={() => handleQuickAdd(preset)}
                      disabled={submitting}
                      style={{ "--accent": preset.color } as React.CSSProperties}
                    >
                      <div className="quick-icon">
                        <Icon size={18} />
                      </div>
                      <span className="quick-label">{preset.label}</span>
                      <span className="quick-amount">₹{preset.amount}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="expense-divider">
              <span>or log custom expense</span>
            </div>

            {/* Custom Form */}
            <form onSubmit={handleSubmit} className="expense-form">
              {/* Category Select */}
              <div className="form-group">
                <label>Category</label>
                <div className="category-grid">
                  {categories.map(cat => {
                    const Icon = CATEGORY_ICONS[cat.id] || HelpCircle;
                    const color = CATEGORY_COLORS[cat.id] || "#6b7280";
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        className={`category-btn ${isSelected ? "selected" : ""}`}
                        onClick={() => setCategory(cat.id)}
                        style={{ "--cat-color": color } as React.CSSProperties}
                      >
                        <Icon size={16} />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount Input */}
              <div className="form-group">
                <label>Amount (₹)</label>
                <div className="amount-input-wrap">
                  <span className="currency">₹</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0"
                    min="1"
                    step="1"
                    className="amount-input"
                  />
                  {previewCo2 > 0 && (
                    <div className="co2-preview">
                      <Leaf size={12} />
                      {previewCo2.toFixed(2)} kg CO₂
                    </div>
                  )}
                </div>
              </div>

              {/* Merchant & Date Row */}
              <div className="form-row">
                <div className="form-group">
                  <label>Merchant (optional)</label>
                  <input
                    type="text"
                    value={merchant}
                    onChange={e => setMerchant(e.target.value)}
                    placeholder={selectedCat?.label || "e.g., Swiggy"}
                    className="text-input"
                  />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="text-input"
                  />
                </div>
              </div>

              {/* Error */}
              {error && <div className="expense-error">{error}</div>}

              {/* Submit */}
              <button
                type="submit"
                className="submit-btn"
                disabled={submitting || !category || !amount}
              >
                {submitting ? (
                  <><Loader2 size={18} className="spin" /> Adding...</>
                ) : (
                  <><Plus size={18} /> Add Expense</>
                )}
              </button>
            </form>
          </>
        )}

        <style jsx>{`
          .expense-overlay {
            position: fixed;
            inset: 0;
            z-index: 9999;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            animation: fadeIn 0.2s ease;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .expense-modal {
            background: var(--dark2);
            border: 1px solid var(--border2);
            border-radius: 20px;
            width: 100%;
            max-width: 520px;
            max-height: 90vh;
            overflow-y: auto;
            animation: slideUp 0.3s ease;
          }

          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }

          .expense-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            padding: 24px 24px 0;
          }

          .expense-header h2 {
            font-size: 20px;
            font-weight: 800;
            color: var(--text1);
            margin-bottom: 4px;
          }

          .expense-header p {
            font-size: 13px;
            color: var(--text3);
          }

          .expense-close {
            background: transparent;
            border: none;
            color: var(--text3);
            cursor: pointer;
            padding: 8px;
            border-radius: 8px;
            transition: all 0.15s;
          }

          .expense-close:hover {
            background: var(--dark3);
            color: var(--text1);
          }

          .quick-add-section {
            padding: 20px 24px;
          }

          .section-label {
            font-size: 11px;
            font-weight: 700;
            color: var(--text3);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 12px;
          }

          .quick-add-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
          }

          .quick-add-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            padding: 12px 8px;
            background: var(--dark3);
            border: 1px solid var(--border);
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.15s;
          }

          .quick-add-btn:hover:not(:disabled) {
            border-color: var(--accent);
            background: color-mix(in srgb, var(--accent) 10%, var(--dark3));
            transform: translateY(-2px);
          }

          .quick-add-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .quick-icon {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background: color-mix(in srgb, var(--accent) 15%, transparent);
            color: var(--accent);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .quick-label {
            font-size: 11px;
            font-weight: 600;
            color: var(--text2);
            text-align: center;
            line-height: 1.2;
          }

          .quick-amount {
            font-size: 12px;
            font-weight: 700;
            color: var(--text3);
          }

          .expense-divider {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 0 24px;
            margin: 8px 0;
          }

          .expense-divider::before,
          .expense-divider::after {
            content: "";
            flex: 1;
            height: 1px;
            background: var(--border);
          }

          .expense-divider span {
            font-size: 11px;
            color: var(--text3);
            text-transform: uppercase;
            letter-spacing: 0.03em;
          }

          .expense-form {
            padding: 16px 24px 24px;
          }

          .form-group {
            margin-bottom: 16px;
          }

          .form-group label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: var(--text2);
            margin-bottom: 8px;
          }

          .category-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
          }

          .category-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            padding: 10px 4px;
            background: var(--dark3);
            border: 1px solid var(--border);
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.15s;
            color: var(--text3);
          }

          .category-btn:hover {
            border-color: var(--cat-color);
            color: var(--cat-color);
          }

          .category-btn.selected {
            background: color-mix(in srgb, var(--cat-color) 15%, var(--dark3));
            border-color: var(--cat-color);
            color: var(--cat-color);
          }

          .category-btn span {
            font-size: 10px;
            font-weight: 500;
            text-align: center;
            line-height: 1.2;
          }

          .amount-input-wrap {
            position: relative;
            display: flex;
            align-items: center;
          }

          .currency {
            position: absolute;
            left: 14px;
            font-size: 18px;
            font-weight: 700;
            color: var(--text3);
          }

          .amount-input {
            width: 100%;
            padding: 14px 14px 14px 36px;
            background: var(--dark3);
            border: 1px solid var(--border2);
            border-radius: 12px;
            font-size: 20px;
            font-weight: 700;
            color: var(--text1);
            outline: none;
            transition: border-color 0.15s;
          }

          .amount-input:focus {
            border-color: var(--g400);
          }

          .amount-input::placeholder {
            color: var(--text3);
            font-weight: 400;
          }

          .co2-preview {
            position: absolute;
            right: 14px;
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            background: rgba(74, 222, 128, 0.1);
            border: 1px solid rgba(74, 222, 128, 0.2);
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            color: var(--g400);
          }

          .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }

          .text-input {
            width: 100%;
            padding: 10px 14px;
            background: var(--dark3);
            border: 1px solid var(--border2);
            border-radius: 10px;
            font-size: 14px;
            color: var(--text1);
            outline: none;
            transition: border-color 0.15s;
          }

          .text-input:focus {
            border-color: var(--g400);
          }

          .text-input::placeholder {
            color: var(--text3);
          }

          .expense-error {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.2);
            color: #fca5a5;
            padding: 10px 14px;
            border-radius: 10px;
            font-size: 13px;
            margin-bottom: 16px;
          }

          .submit-btn {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 14px;
            background: var(--g400);
            border: none;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 700;
            color: #000;
            cursor: pointer;
            transition: all 0.15s;
          }

          .submit-btn:hover:not(:disabled) {
            background: #4ade80;
            transform: translateY(-1px);
          }

          .submit-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .spin {
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .expense-success {
            padding: 60px 24px;
            text-align: center;
          }

          .success-icon {
            width: 72px;
            height: 72px;
            border-radius: 50%;
            background: rgba(74, 222, 128, 0.15);
            border: 2px solid var(--g400);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            color: var(--g400);
            animation: scaleIn 0.3s ease;
          }

          @keyframes scaleIn {
            from { transform: scale(0.5); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }

          .expense-success h3 {
            font-size: 20px;
            font-weight: 800;
            color: var(--text1);
            margin-bottom: 6px;
          }

          .expense-success p {
            font-size: 14px;
            color: var(--text3);
          }

          /* Scrollbar */
          .expense-modal::-webkit-scrollbar {
            width: 6px;
          }

          .expense-modal::-webkit-scrollbar-track {
            background: transparent;
          }

          .expense-modal::-webkit-scrollbar-thumb {
            background: var(--border2);
            border-radius: 3px;
          }

          @media (max-width: 540px) {
            .quick-add-grid {
              grid-template-columns: repeat(2, 1fr);
            }
            .category-grid {
              grid-template-columns: repeat(3, 1fr);
            }
            .form-row {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
