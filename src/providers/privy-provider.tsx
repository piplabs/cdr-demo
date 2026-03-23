"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { cdrDevnet } from "@/config/chain";

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

export function CDRPrivyProvider({ children }: { children: React.ReactNode }) {
  // During build-time static generation Privy throws if the app ID is empty.
  // Render children without the provider so `next build` can finish.
  if (!appId) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#6366f1",
        },
        defaultChain: cdrDevnet,
        supportedChains: [cdrDevnet],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
