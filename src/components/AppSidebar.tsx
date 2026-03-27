import {
  LayoutDashboard, ShoppingCart, Receipt, Wrench, Package, ShoppingBag, LogOut, Settings, Wallet, FileBarChart, Shield
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';

const allItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard, adminOnly: true, superOnly: false },
  { title: 'Vendas', url: '/vendas', icon: ShoppingCart, adminOnly: false, superOnly: false },
  { title: 'Despesas', url: '/despesas', icon: Receipt, adminOnly: true, superOnly: false },
  { title: 'Assistência', url: '/assistencia', icon: Wrench, adminOnly: false, superOnly: false },
  { title: 'Caixa', url: '/caixa', icon: Wallet, adminOnly: true, superOnly: false },
  { title: 'Estoque', url: '/estoque', icon: Package, adminOnly: false, superOnly: false },
  { title: 'Compras', url: '/compras', icon: ShoppingBag, adminOnly: false, superOnly: false },
  { title: 'Relatórios', url: '/relatorios', icon: FileBarChart, adminOnly: true, superOnly: false },
  { title: 'Configurações', url: '/configuracoes', icon: Settings, adminOnly: true, superOnly: false },
  { title: 'Admin Master', url: '/admin-master', icon: Shield, adminOnly: false, superOnly: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut, user } = useAuth();
  const { isAdmin, isSuperAdmin, role } = useRole();

  const items = allItems.filter(item => {
    if (item.superOnly) return isSuperAdmin;
    if (item.adminOnly) return isAdmin;
    return true;
  });

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="p-4 flex items-center gap-2">
        {!collapsed && (
          <div>
            <h2 className="text-lg font-bold text-sidebar-foreground">
              Treze7 <span className="text-sidebar-primary">Pro</span>
            </h2>
            {role && (
              <Badge variant="outline" className="text-[10px] mt-1 border-sidebar-border text-sidebar-foreground/60">
                {isSuperAdmin ? '🛡️ Super Admin' : isAdmin ? '👑 Admin' : '👨‍💼 Vendedor'}
              </Badge>
            )}
          </div>
        )}
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="hover:bg-sidebar-accent/50 transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        {!collapsed && user && (
          <p className="text-xs text-sidebar-foreground/60 truncate mb-2 px-2">{user.email}</p>
        )}
        <SidebarMenuButton onClick={signOut} className="hover:bg-sidebar-accent/50 text-sidebar-foreground/80">
          <LogOut className="mr-2 h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
