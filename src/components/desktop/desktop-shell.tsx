"use client";

import { MenuBar } from "./menu-bar";
import { Dock } from "./dock";

interface DesktopShellProps {
  children: React.ReactNode;
}

export function DesktopShell({ children }: DesktopShellProps) {
  return (
    <>
      <div className="wallpaper" />
      <MenuBar />
      {children}
      <Dock />
    </>
  );
}
