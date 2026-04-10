"use client";

import { useRouter } from "next/navigation";

interface AppWindowProps {
  children: React.ReactNode;
}

export function AppWindow({ children }: AppWindowProps) {
  const router = useRouter();

  return (
    <div
      className="glass-thick fixed bottom-4 left-1/2 top-14 z-50 flex w-[calc(100%-2rem)] max-w-6xl -translate-x-1/2 flex-col overflow-hidden rounded-[24px] [animation:window-in_0.35s_cubic-bezier(0.16,1,0.3,1)]"
    >
      <div className="flex h-10 flex-shrink-0 items-center border-b border-white/[0.06] bg-white/[0.04] px-4">
        <div className="flex gap-[7px]">
          <button
            onClick={() => router.push("/desktop")}
            className="h-[13px] w-[13px] rounded-full bg-[#ff5f57] transition-[filter,transform] hover:scale-[1.08] hover:brightness-[1.15]"
          />
          <div className="h-[13px] w-[13px] rounded-full bg-[#febc2e]" />
          <div className="h-[13px] w-[13px] rounded-full bg-[#28c840]" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[color:var(--glass-bg-strong)]">
        {children}
      </div>
    </div>
  );
}
