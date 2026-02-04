"use client";

import type { ReactNode } from "react";
import { LanguageProvider } from "./components/LanguageProvider";
import { AuthProvider } from "./context/AuthContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <LanguageProvider>{children}</LanguageProvider>
    </AuthProvider>
  );
}

