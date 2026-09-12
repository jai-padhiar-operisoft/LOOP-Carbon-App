"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Upload, Eye, Target, Award, TrendingUp, Zap, Globe, Crown, Star, X, Sparkles, Trophy,
} from "lucide-react";
import { markMilestonesNotified } from "@/lib/api";

// Icon mapping for milestone icons
const ICONS: Record<string, any> = {
  "upload": Upload,
  "eye": Eye,
  "target": Target,
  "award": Award,
  "trending-up": TrendingUp,
  "zap": Zap,
  "globe": Globe,
  "crown": Crown,
  "star": Star,
};

interface Milestone {
  id: string;
  name: string;
  description: string;
  threshold: number;
  icon: string;
  color: string;
  unlocked?: boolean;
  progress?: number;
}

interface MilestoneCelebrationProps {
  milestones: Milestone[];
  userId: number;
  onClose: () => void;
}

export default function MilestoneCelebration({ milestones, userId, onClose }: MilestoneCelebrationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animating, setAnimating] = useState(true);
  const [confettiPieces, setConfettiPieces] = useState<Array<{ id: number; left: number; delay: number; color: string }>>([]);

  const current = milestones[currentIndex];
  const Icon = ICONS[current?.icon] || Award;
  const isLast = currentIndex >= milestones.length - 1;

  // Generate confetti on mount
  useEffect(() => {
    const pieces = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      color: ["#22c55e", "#4ade80", "#fbbf24", "#f97316", "#8b5cf6", "#ec4899"][Math.floor(Math.random() * 6)],
    }));
    setConfettiPieces(pieces);
  }, [currentIndex]);

  // Initial animation
  useEffect(() => {
    setAnimating(true);
    const timer = setTimeout(() => setAnimating(false), 600);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (isLast) {
      // Mark all as notified and close
      markMilestonesNotified(userId, milestones.map(m => m.id)).catch(() => {});
      onClose();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [isLast, userId, milestones, onClose]);

  const handleSkipAll = useCallback(() => {
    markMilestonesNotified(userId, milestones.map(m => m.id)).catch(() => {});
    onClose();
  }, [userId, milestones, onClose]);

  if (!current) return null;

  return (
    <div className="milestone-overlay">
      {/* Confetti */}
      <div className="confetti-container">
        {confettiPieces.map(piece => (
          <div
            key={piece.id}
            className="confetti-piece"
            style={{
              left: `${piece.left}%`,
              animationDelay: `${piece.delay}s`,
              backgroundColor: piece.color,
            }}
          />
        ))}
      </div>

      {/* Modal */}
      <div className={`milestone-modal ${animating ? "milestone-enter" : ""}`}>
        {/* Close button */}
        <button className="milestone-close" onClick={handleSkipAll} title="Skip all">
          <X size={20} />
        </button>

        {/* Sparkle decoration */}
        <div className="milestone-sparkles">
          <Sparkles size={24} style={{ color: current.color, opacity: 0.6 }} />
        </div>

        {/* Icon with glow */}
        <div
          className="milestone-icon-container"
          style={{
            background: `${current.color}18`,
            borderColor: `${current.color}40`,
            boxShadow: `0 0 60px ${current.color}30, 0 0 100px ${current.color}15`,
          }}
        >
          <Icon size={48} style={{ color: current.color }} />
        </div>

        {/* Badge label */}
        <div className="milestone-badge" style={{ background: `${current.color}20`, color: current.color }}>
          <Trophy size={12} />
          Milestone Unlocked!
        </div>

        {/* Title */}
        <h2 className="milestone-title">{current.name}</h2>

        {/* Description */}
        <p className="milestone-description">{current.description}</p>

        {/* Threshold info */}
        <p className="milestone-threshold">
          {current.threshold > 0 ? (
            <>You've tracked <strong>{current.threshold.toLocaleString()} kg</strong> of CO₂ emissions!</>
          ) : (
            <>Welcome to your carbon tracking journey!</>
          )}
        </p>

        {/* Progress dots */}
        {milestones.length > 1 && (
          <div className="milestone-dots">
            {milestones.map((_, i) => (
              <div
                key={i}
                className={`milestone-dot ${i === currentIndex ? "active" : ""} ${i < currentIndex ? "completed" : ""}`}
                style={i === currentIndex ? { background: current.color } : {}}
              />
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="milestone-actions">
          <button
            className="btn-primary milestone-btn"
            onClick={handleNext}
            style={{ background: current.color }}
          >
            {isLast ? "Awesome!" : "Next →"}
          </button>
          {!isLast && milestones.length > 1 && (
            <button className="btn-ghost milestone-skip" onClick={handleSkipAll}>
              Skip all
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .milestone-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .confetti-container {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          top: -20px;
          border-radius: 2px;
          animation: confettiFall 3s ease-in-out infinite;
        }

        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        .milestone-modal {
          position: relative;
          background: linear-gradient(145deg, var(--dark2), var(--dark));
          border: 1px solid var(--border2);
          border-radius: 24px;
          padding: 48px 40px 40px;
          max-width: 420px;
          width: 90%;
          text-align: center;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
        }

        .milestone-enter {
          animation: modalPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        @keyframes modalPop {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .milestone-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: transparent;
          border: none;
          color: var(--text3);
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .milestone-close:hover {
          background: var(--dark3);
          color: var(--text1);
        }

        .milestone-sparkles {
          position: absolute;
          top: 20px;
          left: 20px;
          animation: sparkle 2s ease-in-out infinite;
        }

        @keyframes sparkle {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.6; }
          50% { transform: scale(1.2) rotate(15deg); opacity: 1; }
        }

        .milestone-icon-container {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 2px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          animation: iconPulse 2s ease-in-out infinite;
        }

        @keyframes iconPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .milestone-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 16px;
        }

        .milestone-title {
          font-size: 28px;
          font-weight: 900;
          color: var(--text1);
          margin-bottom: 12px;
          letter-spacing: -0.5px;
        }

        .milestone-description {
          font-size: 15px;
          color: var(--text2);
          line-height: 1.6;
          margin-bottom: 16px;
        }

        .milestone-threshold {
          font-size: 14px;
          color: var(--text3);
          margin-bottom: 24px;
        }

        .milestone-threshold strong {
          color: var(--g400);
          font-weight: 700;
        }

        .milestone-dots {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 24px;
        }

        .milestone-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--dark3);
          transition: all 0.3s;
        }

        .milestone-dot.active {
          width: 24px;
          border-radius: 4px;
        }

        .milestone-dot.completed {
          background: var(--g400);
        }

        .milestone-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .milestone-btn {
          width: 100%;
          padding: 14px 24px;
          font-size: 16px;
          font-weight: 700;
          border-radius: 12px;
          border: none;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .milestone-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
        }

        .milestone-skip {
          padding: 10px;
          font-size: 13px;
          color: var(--text3);
        }

        .milestone-skip:hover {
          color: var(--text2);
        }
      `}</style>
    </div>
  );
}
