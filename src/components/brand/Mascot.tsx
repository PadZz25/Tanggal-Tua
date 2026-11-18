import { useEffect, useState } from 'react';
import type { MascotMood } from '../../domain/types';
import { useUIStore } from '../../hooks/useUIStore';

interface MascotProps {
  mood?: MascotMood;
  size?: number;
  className?: string;
}

export function Mascot({ mood = 'smile', size = 40, className = '' }: MascotProps) {
  const reactionTick = useUIStore((s) => s.mascotReactionTick);
  const [isReacting, setIsReacting] = useState(false);

  useEffect(() => {
    if (reactionTick === 0) return;
    setIsReacting(true);
    const timer = window.setTimeout(() => setIsReacting(false), 320);
    return () => window.clearTimeout(timer);
  }, [reactionTick]);

  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden="true"
      className={`shrink-0 transition-transform duration-300 ${
        isReacting ? 'scale-110' : 'scale-100'
      } ${className}`}
    >
      <circle cx="24" cy="24" r="22" fill="var(--coin)" />
      <circle
        cx="24"
        cy="24"
        r="17"
        fill="none"
        stroke="var(--coin-edge)"
        strokeWidth="2"
      />

      {mood === 'sleepy' ? (
        <>
          <path
            d="M15.5 21.5c1.2 1.2 3.8 1.2 5 0"
            fill="none"
            stroke="#231C16"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M27.5 21.5c1.2 1.2 3.8 1.2 5 0"
            fill="none"
            stroke="#231C16"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <circle cx="18" cy="21" r="2.2" fill="#231C16" />
          <circle cx="30" cy="21" r="2.2" fill="#231C16" />
        </>
      )}

      {mood === 'smile' && (
        <path
          d="M17 28c2 3.2 12 3.2 14 0"
          fill="none"
          stroke="#231C16"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      )}

      {mood === 'flat' && (
        <path
          d="M18 29h12"
          fill="none"
          stroke="#231C16"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      )}

      {mood === 'oops' && (
        <circle
          cx="24"
          cy="29.5"
          r="2.8"
          fill="none"
          stroke="#231C16"
          strokeWidth="2.2"
        />
      )}

      {mood === 'sleepy' && (
        <path
          d="M20 29.5h8"
          fill="none"
          stroke="#231C16"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}

      <circle cx="14" cy="27" r="2.4" fill="#E8896B" opacity="0.7" />
      <circle cx="34" cy="27" r="2.4" fill="#E8896B" opacity="0.7" />
    </svg>
  );
}
