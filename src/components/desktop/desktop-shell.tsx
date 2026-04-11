"use client";

import { MenuBar } from "./menu-bar";

interface DesktopShellProps {
  children: React.ReactNode;
}

export function DesktopShell({ children }: DesktopShellProps) {
  return (
    <>
      <MenuBar />
      <main className="pb-24 pt-12">{children}</main>
    </>
  );
}
