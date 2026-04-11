"use client";

import { MenuBar } from "./menu-bar";

interface DesktopShellProps {
  children: React.ReactNode;
}

export function DesktopShell({ children }: DesktopShellProps) {
  return (
    <>
      <div className="wallpaper" />
      <MenuBar />
      <main className="relative z-[1] pb-20 pt-24">{children}</main>
    </>
  );
}
