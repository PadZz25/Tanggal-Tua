interface ProgressBarProps {
  usedRatio: number;
}

export function ProgressBar({ usedRatio }: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, usedRatio));
  const percentage = Math.round(clamped * 100);

  return (
    <div
      role="img"
      aria-label={`Terpakai ${percentage} persen dari jatah harian`}
      className="h-[10px] w-full overflow-hidden rounded-[5px]"
      style={{ backgroundColor: 'var(--hero-track)' }}
    >
      <div
        className="h-full rounded-[5px] transition-[width] duration-300 ease-out"
        style={{
          width: `${percentage}%`,
          backgroundColor: 'var(--coin)',
        }}
      />
    </div>
  );
}
