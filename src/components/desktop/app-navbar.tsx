"use client";

interface AppNavbarProps {
  icon: React.ReactNode;
  title: string;
  iconBg: string;
  tabs?: { label: string; active: boolean; onClick: () => void }[];
}

export function AppNavbar({ icon, title, iconBg, tabs }: AppNavbarProps) {
  return (
    <div className="glass-thin mx-auto mb-6 flex max-w-6xl items-center justify-between rounded-2xl border border-white/[0.06] px-5 py-3">
      <div className="flex items-center gap-2.5">
        <div className={`flex h-7 w-7 items-center justify-center rounded-[7px] ${iconBg}`}>
          {icon}
        </div>
        <span className="theme-text-primary text-[13px] font-bold tracking-tight">{title}</span>
      </div>
      {tabs && tabs.length > 0 && (
        <div className="flex gap-0.5 rounded-lg bg-white/[0.035] p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              onClick={tab.onClick}
              className={`rounded-md px-3.5 py-[5px] text-[11px] font-medium transition-all duration-200 [transition-timing-function:cubic-bezier(0.25,1,0.5,1)] ${
                tab.active
                  ? "bg-white/[0.08] text-white/90 shadow-[0_1px_3px_rgba(0,0,0,0.2),inset_0_0.5px_0_rgba(255,255,255,0.04)]"
                  : "text-white/35 hover:text-white/55"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
