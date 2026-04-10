"use client";

export interface ProgressBarProps {
  /** 0–100 */
  percent: number;
  /** Status text shown below the bar */
  label: string;
  /** Tailwind color class for the bar fill, e.g. "bg-demo-secret" */
  accentClass?: string;
  /** Override bar color on error */
  error?: boolean;
}

export function ProgressBar({
  percent,
  label,
  accentClass = "bg-brand-500",
  error = false,
}: ProgressBarProps) {
  const fillClass = error
    ? "bg-red-500/80"
    : percent >= 100
      ? "bg-green-500/60"
      : `${accentClass}/60`;

  return (
    <div className="flex flex-col gap-2">
      <div className="theme-track h-2 w-full overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${fillClass}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <p className={`text-xs ${error ? "text-red-400" : percent >= 100 ? "text-green-400" : "theme-text-secondary"}`}>
        {label}
      </p>
    </div>
  );
}
