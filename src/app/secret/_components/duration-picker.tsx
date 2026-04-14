"use client";

import { useMemo } from "react";
import { secondsToBlocks, formatDuration } from "@/lib/block-time";

type Preset = { label: string; seconds: number };

const PRESETS: Preset[] = [
  { label: "1h", seconds: 3600 },
  { label: "6h", seconds: 6 * 3600 },
  { label: "1d", seconds: 86400 },
  { label: "1w", seconds: 7 * 86400 },
];

export function DurationPicker(props: {
  valueSeconds: number;
  onChange: (seconds: number) => void;
  disabled?: boolean;
}) {
  const { valueSeconds, onChange, disabled } = props;
  const blocks = useMemo(() => secondsToBlocks(valueSeconds), [valueSeconds]);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-white/50">
        Dead man's switch timer
      </label>
      <p className="text-[11px] text-white/30">
        If you stop extending before this expires, recipients can decrypt.
      </p>
      <div className="liquid-segmented flex gap-0.5 rounded-full p-0.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            disabled={disabled}
            onClick={() => onChange(p.seconds)}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
              valueSeconds === p.seconds
                ? "liquid-panel-soft text-white"
                : "text-white/40"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          disabled={disabled}
          value={Math.max(1, Math.round(valueSeconds / 60))}
          onChange={(e) => {
            const mins = Math.max(1, Number(e.target.value) || 1);
            onChange(mins * 60);
          }}
          className="liquid-input w-24 rounded-2xl px-3 py-1.5 text-sm text-white placeholder-white/30"
        />
        <span className="text-xs text-white/40">minutes</span>
      </div>
      <p className="text-[11px] text-white/40">
        = {formatDuration(valueSeconds)} ≈ {blocks.toLocaleString()} blocks (2s/block)
      </p>
    </div>
  );
}
