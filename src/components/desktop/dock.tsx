"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  CDRDiamondIcon, LockIcon, ShopIcon,
  DropletIcon, BoxIcon, AgentIcon, BrainIcon,
} from "./dock-icons";

interface DockApp {
  id: string;
  route: string;
  label: string;
  icon: React.ReactNode;
  tint: string;
  enabled: boolean;
}

const apps: DockApp[] = [
  { id: "home", route: "/", label: "CDR Home", icon: <CDRDiamondIcon size={18} className="text-[rgb(196,201,255)]" />, tint: "liquid-icon-indigo", enabled: true },
];

const mainApps: DockApp[] = [
  { id: "storage", route: "/storage", label: "Private Storage", icon: <LockIcon size={18} className="text-[rgb(196,201,255)]" />, tint: "liquid-icon-indigo", enabled: true },
  { id: "marketplace", route: "/marketplace", label: "Data Marketplace", icon: <ShopIcon size={18} className="text-[rgb(192,253,223)]" />, tint: "liquid-icon-emerald", enabled: true },
];

const utilApps: DockApp[] = [
  { id: "faucet", route: "/faucet", label: "Faucet", icon: <DropletIcon size={18} className="text-[rgb(186,230,253)]" />, tint: "liquid-icon-sky", enabled: true },
  { id: "vault", route: "/vault", label: "Vault Browser", icon: <BoxIcon size={18} className="text-[rgb(221,214,254)]" />, tint: "liquid-icon-violet", enabled: true },
];

const comingSoon: DockApp[] = [
  { id: "agents", route: "/agents", label: "Agents — Soon", icon: <AgentIcon size={18} className="text-white/40" />, tint: "", enabled: false },
  { id: "ai", route: "/ai", label: "Confidential AI — Soon", icon: <BrainIcon size={18} className="text-white/40" />, tint: "", enabled: false },
];

function DockSeparator() {
  return <div className="mx-[2px] h-7 w-px flex-shrink-0 bg-white/[0.07]" />;
}

function DockItem({ app, pathname, onNavigate }: { app: DockApp; pathname: string; onNavigate: (route: string) => void }) {
  const isActive = pathname === app.route || (app.route !== "/" && pathname.startsWith(app.route));
  const isHome = app.id === "home" && pathname === "/";

  return (
    <div
      className="group relative flex cursor-pointer flex-col items-center"
      onClick={() => app.enabled && onNavigate(app.route)}
    >
      <div
        className={`liquid-icon-tile relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-[14px] transition-transform duration-[250ms] [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] group-hover:-translate-y-2 group-hover:scale-[1.15] ${
          app.enabled ? app.tint : "bg-white/[0.04] border-[0.5px] border-white/[0.06] opacity-40 shadow-none"
        } relative overflow-hidden`}
      >
        {app.enabled && (
          <div className="pointer-events-none absolute inset-x-1 top-1 h-1/2 rounded-full bg-white/[0.12] blur-sm" />
        )}
        <span className="relative z-10">{app.icon}</span>
      </div>
      <div className={`mt-[3px] h-1 w-1 rounded-full bg-white/60 transition-opacity ${isActive || isHome ? "opacity-100" : "opacity-0"}`} />
      <div className="pointer-events-none absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-[0.5px] border-white/10 bg-black/60 px-3 py-[5px] text-[11px] font-medium text-white/90 opacity-0 backdrop-blur-xl transition-opacity group-hover:opacity-100">
        {app.label}
      </div>
    </div>
  );
}

export function Dock() {
  const pathname = usePathname();
  const router = useRouter();
  const navigate = (route: string) => router.push(route);

  return (
    <div className="glass-thick fixed bottom-3 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-[3px] rounded-[24px] px-[8px] py-[6px]">
      {apps.map((app) => <DockItem key={app.id} app={app} pathname={pathname} onNavigate={navigate} />)}
      <DockSeparator />
      {mainApps.map((app) => <DockItem key={app.id} app={app} pathname={pathname} onNavigate={navigate} />)}
      <DockSeparator />
      {utilApps.map((app) => <DockItem key={app.id} app={app} pathname={pathname} onNavigate={navigate} />)}
      <DockSeparator />
      {comingSoon.map((app) => <DockItem key={app.id} app={app} pathname={pathname} onNavigate={navigate} />)}
    </div>
  );
}
