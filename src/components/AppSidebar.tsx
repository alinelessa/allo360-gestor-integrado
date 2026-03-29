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
  roles?: AppRole[];
}

const navItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Pedidos Venda", url: "/pedidos-venda", icon: ShoppingCart },
  {
    title: "Pedidos Compra",
    url: "/pedidos-compra",
    icon: PackagePlus,
    roles: ["admin", "estoque"],
  },
  {
    title: "Estoque",
    url: "/estoque",
    icon: Package,
    roles: ["admin", "estoque"],
  },
  { title: "Clientes", url: "/clientes", icon: Users },
  {
    title: "Fornecedores",
    url: "/fornecedores",
    icon: Truck,
    roles: ["admin", "estoque"],
  },
  {
    title: "Financeiro",
    url: "/financeiro",
    icon: DollarSign,
    roles: ["admin", "financeiro"],
  },
  {
    title: "Relatórios",
    url: "/relatorios",
    icon: BarChart3,
    roles: ["admin", "financeiro"],
  },
];

function CollapsedLogoMark() {
  return (
    <div className="relative flex h-16 w-16 items-center justify-center">
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.08) 38%, rgba(212,175,55,0.02) 60%, rgba(212,175,55,0) 74%)",
          filter: "blur(8px)",
        }}
      />
      <svg
        width={38}
        height={38}
        viewBox="0 0 60 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative"
      >
        <circle
          cx="22"
          cy="25"
          r="12"
          stroke="hsl(42 50% 57%)"
          strokeWidth="3"
          fill="none"
        />
        <circle
          cx="38"
          cy="25"
          r="12"
          stroke="hsl(42 50% 57%)"
          strokeWidth="3"
          fill="none"
        />
        <circle
          cx="30"
          cy="38"
          r="12"
          stroke="hsl(42 50% 57%)"
          strokeWidth="3"
          fill="none"
        />
      </svg>
    </div>
  );
}

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
    <Sidebar collapsible="icon" className="border-r-0">
      <div
        className={`border-b border-sidebar-border/15 ${
          collapsed
            ? "flex justify-center px-2 py-5"
            : "flex items-center justify-center px-4 py-5"
        }`}
      >
        {collapsed ? <CollapsedLogoMark /> : <Logo size="md" />}
      </div>

      <SidebarContent
        className={
          collapsed
            ? "mt-0 flex items-center justify-start"
            : "mt-2"
        }
      >
        <SidebarGroup
          className={
            collapsed
              ? "flex w-full flex-1 items-center justify-start px-0 pt-5"
              : ""
          }
        >
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[11px] tracking-[0.14em]">
            {!collapsed && "Menu"}
          </SidebarGroupLabel>

          <SidebarGroupContent
            className={collapsed ? "flex w-full justify-center" : ""}
          >
            <SidebarMenu
              className={
                collapsed
                  ? "flex w-full flex-col items-center gap-4"
                  : "gap-1.5"
              }
            >
              {visibleItems.map((item) => (
                <SidebarMenuItem
                  key={item.title}
                  className={collapsed ? "flex justify-center" : ""}
                >
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    className={collapsed ? "!h-12 !w-12 !rounded-2xl !p-0" : ""}
                  >
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={`flex items-center ${
                        collapsed
                          ? "justify-center rounded-2xl"
                          : "gap-3 px-3 py-2.5 rounded-2xl"
                      } text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors`}
                      activeClassName="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && (
                        <span className="font-medium">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter
        className={`border-t border-sidebar-border/15 ${
          collapsed ? "flex items-center justify-center p-3" : "p-4"
        }`}
      >
        {!collapsed && profile && (
          <div className="mb-3 text-xs text-sidebar-foreground/50">
            <p className="font-medium text-sidebar-foreground/80 truncate">
              {profile.nome}
            </p>
            <p className="truncate">{profile.email}</p>
          </div>
        )}

        <button
          onClick={signOut}
          className={`flex items-center text-sidebar-foreground/50 hover:text-destructive transition-colors ${
            collapsed
              ? "h-12 w-12 justify-center rounded-2xl hover:bg-sidebar-accent"
              : "w-full gap-2 text-sm"
          }`}
          title="Sair"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}