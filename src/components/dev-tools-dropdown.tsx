"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const devToolLinks = [
  { href: "/vault", label: "Vault Inspector" },
  { href: "/licenses", label: "Licenses" },
  { href: "/faucet", label: "Faucet" },
];

export function DevToolsDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isActive = devToolLinks.some((l) => pathname === l.href);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
          isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
        }`}
      >
        Dev Tools ▾
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-48 rounded-lg border border-white/10 bg-black/95 py-1 shadow-xl backdrop-blur-sm">
          {devToolLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`block px-4 py-2 text-sm transition-colors ${
                pathname === link.href
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
