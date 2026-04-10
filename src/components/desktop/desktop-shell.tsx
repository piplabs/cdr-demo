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
      {children}
    </>
  );
}
