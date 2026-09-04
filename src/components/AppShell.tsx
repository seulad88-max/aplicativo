import type { ReactNode } from "react";
import { Header } from "./Header";
import { CloseNav } from "./CloseNav";
import { BottomNav } from "./BottomNav";

export function AppShell({
  children,
  chrome = "full",
}: {
  children: ReactNode;
  chrome?: "full" | "close";
}) {
  return (
    <div className="safe-x flex min-h-screen flex-col">
      {chrome === "close" ? <CloseNav /> : <Header />}
      <main className={`page-transition flex-1 ${chrome === "full" ? "nav-space" : "pb-10"}`}>
        {children}
      </main>
      {chrome === "full" ? <BottomNav /> : null}
    </div>
  );
}
