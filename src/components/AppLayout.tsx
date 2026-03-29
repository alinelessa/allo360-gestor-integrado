import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AIAssistantWidget } from "@/components/ai/AIAssistantWidget";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="app-shell flex min-h-screen w-full">
        <AppSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="app-floating sticky top-0 z-20 mx-4 mt-4 flex h-16 items-center justify-between rounded-2xl px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="app-ghost-btn h-10 w-10 rounded-full p-0" />
              <div className="hidden sm:block">
                <p className="text-sm font-semibold tracking-[-0.01em] text-foreground">
                  Allo360
                </p>
                <p className="app-soft text-xs">Gestão integrada</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 px-4 pb-6 pt-4 md:px-6 md:pb-8 md:pt-5">
            <div className="app-surface min-h-full rounded-[1.5rem] p-4 md:p-6">
              {children}
            </div>
          </main>
        </div>

        <AIAssistantWidget />
      </div>
    </SidebarProvider>
  );
}