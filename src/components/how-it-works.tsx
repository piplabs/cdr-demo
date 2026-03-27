"use client";

import { useState } from "react";

interface Layer {
  title: string;
  content: React.ReactNode;
}

interface HowItWorksProps {
  layers: Layer[];
}

export function HowItWorks({ layers }: HowItWorksProps) {
  const [open, setOpen] = useState(false);
  const [expandedLayers, setExpandedLayers] = useState<Set<number>>(new Set());

  function toggleLayer(index: number) {
    setExpandedLayers((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <div className="mt-8 border-t border-white/5 pt-6">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 text-left text-sm font-medium text-white/40 transition-colors hover:text-white/60"
      >
        <span className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}>
          ▶
        </span>
        How it works (for developers)
      </button>

      {open && (
        <div className="mt-4 flex flex-col gap-2">
          {layers.map((layer, i) => (
            <div key={i} className="rounded-lg border border-white/5 bg-white/[0.02]">
              <button
                onClick={() => toggleLayer(i)}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs font-medium text-white/50 transition-colors hover:text-white/70"
              >
                <span className={`inline-block transition-transform ${expandedLayers.has(i) ? "rotate-90" : ""}`}>
                  ▶
                </span>
                {layer.title}
              </button>
              {expandedLayers.has(i) && (
                <div className="border-t border-white/5 px-4 py-4 text-sm leading-relaxed text-white/50">
                  {layer.content}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
