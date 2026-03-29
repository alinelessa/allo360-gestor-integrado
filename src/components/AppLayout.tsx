import { ReactNode, useMemo } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AIAssistantWidget } from "@/components/ai/AIAssistantWidget";
import { useAuth } from "@/contexts/AuthContext";

function getFirstName(fullName?: string | null) {
  if (!fullName) return "usuário";
  return fullName.trim().split(" ")[0] || "usuário";
}

function getWelcomeText(profile: any) {
  const firstName = getFirstName(profile?.nome);
  const genero =
    profile?.genero?.toLowerCase?.() ||
    profile?.sexo?.toLowerCase?.() ||
    profile?.pronome?.toLowerCase?.() ||
    "";

  if (genero.includes("fem")) {
    return `Olá, ${firstName}! Seja bem-vinda.`;
  }

  if (genero.includes("masc")) {
    return `Olá, ${firstName}! Seja bem-vindo.`;
  }

  return `Olá, ${firstName}! Boas-vindas.`;
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile } = useAuth();

  const welcomeMessage = useMemo(() => getWelcomeText(profile), [profile]);

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
              <div className="mb-5 rounded-[1.25rem] border border-border/15 bg-[hsl(var(--surface-high)/0.55)] px-4 py-3">
                <p className="text-base font-semibold tracking-[-0.02em] text-foreground">
                  {welcomeMessage}
                </p>
                <p className="app-soft mt-1 text-sm">
                  Que bom te ver por aqui.
                </p>
              </div>

              {children}
            </div>
          </main>
        </div>

        <AIAssistantWidget />
      </div>
    </SidebarProvider>
  );
}