import { LayoutDashboard, Package, Users, Truck, DollarSign, LogOut, ShoppingCart, PackagePlus, BarChart3 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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
  roles?: AppRole[]; // if undefined, visible to all
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

  const visibleItems = navItems.filter(item => {
    if (!item.roles) return true;
    if (roles.length === 0) return true; // no roles assigned = show all (fallback)
    return item.roles.some(r => hasRole(r));
  });

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="p-4 flex items-center justify-center border-b border-sidebar-border">
        {collapsed ? (
          <svg width={28} height={28} viewBox="0 0 60 60" fill="none">
            <circle cx="22" cy="25" r="12" stroke="hsl(42, 50%, 57%)" strokeWidth="3" fill="none" />
            <circle cx="38" cy="25" r="12" stroke="hsl(42, 50%, 57%)" strokeWidth="3" fill="none" />
            <circle cx="30" cy="38" r="12" stroke="hsl(42, 50%, 57%)" strokeWidth="3" fill="none" />
          </svg>
        ) : (
          <Logo size="md" />
        )}
      </div>

      <SidebarContent className="mt-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs tracking-widest">
            {!collapsed && "Menu"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                      activeClassName="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="font-medium">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {!collapsed && profile && (
          <div className="mb-3 text-xs text-sidebar-foreground/50">
            <p className="font-medium text-sidebar-foreground/80 truncate">{profile.nome}</p>
            <p className="truncate">{profile.email}</p>
          </div>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-sidebar-foreground/50 hover:text-destructive transition-colors w-full text-sm"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
