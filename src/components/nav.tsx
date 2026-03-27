"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "./connect-button";
import { DevToolsDropdown } from "./dev-tools-dropdown";

const links = [
  { href: "/secret", label: "Secret Share" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/agents", label: "Agent Exchange" },
  { href: "/ai", label: "Confidential AI" },
  { href: "/bounties", label: "Bounty Board" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-white/10 bg-black/40 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-lg font-bold text-white">
            CDR
          </Link>
          <div className="flex gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  pathname === link.href || pathname.startsWith(link.href + "/")
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <DevToolsDropdown />
          </div>
        </div>
        <ConnectButton />
      </div>
    </nav>
  );
}
