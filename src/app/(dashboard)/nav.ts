import {
  Calculator,
  Gauge,
  LayoutDashboard,
  type LucideIcon,
  Package,
  Printer,
  Share2,
  ShoppingCart,
  Wallet,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const TOP_NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales", label: "Vendas", icon: ShoppingCart },
  { href: "/products", label: "Produtos", icon: Package },
  { href: "/cash", label: "Caixa", icon: Wallet },
];

export const SETTINGS_NAV: NavItem[] = [
  { href: "/settings/pricing", label: "Precificação", icon: Calculator },
  { href: "/settings/printers", label: "Impressoras", icon: Printer },
  { href: "/settings/channels", label: "Canais", icon: Share2 },
  { href: "/settings/mei", label: "Teto MEI", icon: Gauge },
];

export const NAV_GROUPS: NavGroup[] = [
  { label: "Principal", items: TOP_NAV },
  { label: "Configurações", items: SETTINGS_NAV },
];
