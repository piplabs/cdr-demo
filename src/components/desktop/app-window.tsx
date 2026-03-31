"use client";

import { useRouter } from "next/navigation";

interface AppWindowProps {
  children: React.ReactNode;
}

export function AppWindow({ children }: AppWindowProps) {
  const router = useRouter();

  return (
    <div
      className="fixed inset-x-4 bottom-[76px] top-12 z-50 flex flex-col overflow-hidden rounded-[20px] shadow-[0_24px_80px_rgba(0,0,0,0.5),0_0_0_0.5px_rgba(255,255,255,0.06)] [animation:window-in_0.35s_cubic-bezier(0.16,1,0.3,1)]"
    >
      <div className="flex h-10 flex-shrink-0 items-center border-b-[0.5px] border-white/[0.05] bg-[rgba(15,15,25,0.65)] px-4 shadow-[inset_0_0.5px_0_rgba(255,255,255,0.04)] backdrop-blur-[48px] [backdrop-filter:blur(48px)_saturate(1.6)] [-webkit-backdrop-filter:blur(48px)_saturate(1.6)]">
        <div className="flex gap-[7px]">
          <button
            onClick={() => router.push("/desktop")}
            className="h-[13px] w-[13px] rounded-full bg-[#ff5f57] transition-[filter,transform] hover:scale-[1.08] hover:brightness-[1.15]"
          />
          <div className="h-[13px] w-[13px] rounded-full bg-[#febc2e]" />
          <div className="h-[13px] w-[13px] rounded-full bg-[#28c840]" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[rgba(8,8,16,0.92)]">
        {children}
      </div>
    </div>
  );
}
