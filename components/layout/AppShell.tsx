"use client";

import { AppNav } from "@/components/layout/AppNav";
import { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050807] text-[#f4f7f5]">
      <AppNav />
      {children}
    </div>
  );
}