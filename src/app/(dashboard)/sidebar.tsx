import SidebarMobile from "./sidebar-mobile";
import SidebarNavigation from "./sidebar-navigation";

/**
 * FR-001 a FR-004 — Menu lateral substituindo a barra de navegação superior.
 * Accordion expansível em "Configurações", item ativo destacado via usePathname
 * e auto-abertura do accordion quando a rota é /settings/*. Em telas pequenas
 * vira um drawer (overlay) acionado por um botão hambúrguer.
 *
 * App Shell: o aside é fixo à lateral, ocupa a altura da viewport e é
 * estruturalmente persistente entre rotas do grupo (dashboard).
 */
export default function Sidebar() {
  return (
    <>
      {/* Sidebar fixa no desktop */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r bg-card/80 lg:block">
        <SidebarNavigation />
      </aside>

      {/* Drawer no mobile */}
      <SidebarMobile />
    </>
  );
}
