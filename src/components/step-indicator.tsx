export type StepStatus = "pending" | "active" | "done" | "error";

export interface Step {
  label: string;
  description?: string;
  status: StepStatus;
  detail?: React.ReactNode;
}

export function StepIndicator({ steps }: { steps: Step[] }) {
  return (
    <div className="flex flex-col gap-0">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-3">
          {/* Vertical line + circle */}
          <div className="flex flex-col items-center">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                step.status === "done"
                  ? "bg-green-500/20 text-green-400"
                  : step.status === "active"
                    ? "bg-brand-500/20 text-brand-500 animate-pulse"
                    : step.status === "error"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-white/5 text-white/30"
              }`}
            >
              {step.status === "done" ? "\u2713" : step.status === "error" ? "!" : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-px flex-1 min-h-[16px] transition-colors ${
                  step.status === "done" ? "bg-green-500/20" : "bg-white/10"
                }`}
              />
            )}
          </div>

          {/* Content */}
          <div className={`pb-5 ${i === steps.length - 1 ? "pb-0" : ""}`}>
            <p
              className={`text-sm font-medium leading-8 ${
                step.status === "active"
                  ? "text-white"
                  : step.status === "done"
                    ? "text-white/70"
                    : step.status === "error"
                      ? "text-red-400"
                      : "text-white/30"
              }`}
            >
              {step.label}
            </p>
            {step.description && (
              <p
                className={`mt-0.5 text-xs leading-relaxed ${
                  step.status === "active"
                    ? "text-white/50"
                    : step.status === "done"
                      ? "text-white/30"
                      : "text-white/20"
                }`}
              >
                {step.description}
              </p>
            )}
            {step.detail && (
              <div className="mt-1.5">{step.detail}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
