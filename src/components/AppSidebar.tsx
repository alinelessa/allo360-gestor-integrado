import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  DollarSign,
  LogOut,
  ShoppingCart,
  PackagePlus,
  BarChart3,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

type AppRole = "admin" | "financeiro" | "estoque" | "usuario";

interface NavItem {
  title: string;
  url: string;
  icon: any;
  roles?: AppRole[];
}

const navItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Pedidos Venda", url: "/pedidos-venda", icon: ShoppingCart },
  { title: "Pedidos Compra", url: "/pedidos-compra", icon: PackagePlus, roles: ["admin", "estoque"] },
  { title: "Estoque", url: "/estoque", icon: Package, roles: ["admin", "estoque"] },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Fornecedores", url: "/fornecedores", icon: Truck, roles: ["admin", "estoque"] },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign, roles: ["admin", "financeiro"] },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3, roles: ["admin", "financeiro"] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, profile, roles, hasRole } = useAuth();

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    if (roles.length === 0) return true;
    return item.roles.some((r) => hasRole(r));
  });

  return (
    <Sidebar
      collapsible="icon"
      className="app-sidebar border-r-0"
    >
      <div className="flex h-full flex-col">
        <div className="px-4 pb-4 pt-5">
          <div className="app-card-soft flex min-h-[84px] items-center justify-center rounded-2xl px-3">
            {collapsed ? (
              <svg width={28} height={28} viewBox="0 0 60 60" fill="none">
                <circle cx="22" cy="25" r="12" stroke="hsl(var(--primary))" strokeWidth="3" fill="none" />
                <circle cx="38" cy="25" r="12" stroke="hsl(var(--primary))" strokeWidth="3" fill="none" />
                <circle cx="30" cy="38" r="12" stroke="hsl(var(--primary))" strokeWidth="3" fill="none" />
              </svg>
            ) : (
              <Logo size="md" />
            )}
          </div>
        </div>

        <SidebarContent className="px-3">
          <SidebarGroup>
            <div className="mb-3 px-2">
              {!collapsed && (
                <p className="app-faint text-[11px] font-semibold uppercase tracking-[0.12em]">
                  Navegação
                </p>
              )}
            </div>

            <SidebarGroupContent>
              <SidebarMenu className="space-y-2">
                {visibleItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="app-sidebar-item flex items-center gap-3 px-4 py-3 text-sm font-medium"
                        activeClassName="app-sidebar-item-active flex items-center gap-3 px-4 py-3 text-sm font-semibold"
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="mt-auto px-4 pb-5 pt-4">
          <div className="app-card-soft rounded-2xl p-3">
            {!collapsed && profile && (
              <div className="mb-3">
                <p className="truncate text-sm font-semibold text-foreground">
                  {profile.nome}
                </p>
                <p className="app-soft truncate text-xs">{profile.email}</p>
              </div>
            )}

            <button
              onClick={signOut}
              className="app-ghost-btn flex w-full items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium"
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sair</span>}
            </button>
          </div>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}