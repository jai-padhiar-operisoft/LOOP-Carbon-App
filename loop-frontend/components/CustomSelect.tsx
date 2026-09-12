"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface Props {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  label?: string;
}

export default function CustomSelect({ value, onChange, options, label }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      {label && <label className="label">{label}</label>}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%",
          background: "var(--dark3)",
          border: `1px solid ${open ? "rgba(74,222,128,0.4)" : "var(--border2)"}`,
          borderRadius: "12px",
          padding: "13px 16px",
          color: "var(--text1)",
          fontSize: "15px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          transition: "all 0.15s",
          boxShadow: open ? "0 0 0 3px rgba(74,222,128,0.08)" : "none",
          textAlign: "left",
        }}
      >
        <span>{value}</span>
        <ChevronDown
          size={16}
          color="var(--text3)"
          style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "var(--dark3)",
            border: "1px solid var(--border2)",
            borderRadius: "12px",
            overflow: "hidden",
            zIndex: 200,
            boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
            animation: "fadeUp 0.15s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{
                width: "100%",
                padding: "11px 16px",
                background: opt === value ? "rgba(74,222,128,0.08)" : "transparent",
                color: opt === value ? "var(--g400)" : "var(--text2)",
                fontSize: "14px",
                fontWeight: opt === value ? 600 : 400,
                cursor: "pointer",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "background 0.1s, color 0.1s",
                textAlign: "left",
              }}
              onMouseEnter={e => {
                if (opt !== value) {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text1)";
                }
              }}
              onMouseLeave={e => {
                if (opt !== value) {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text2)";
                }
              }}
            >
              <span>{opt}</span>
              {opt === value && <Check size={14} color="var(--g400)" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
