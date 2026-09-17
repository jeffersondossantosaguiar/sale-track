export type NavItem = {
  href: string;
  label: string;
};

export const TOP_NAV: NavItem[] = [
  { href: "/", label: "Dashboard" },
  { href: "/sales", label: "Vendas" },
  { href: "/products", label: "Produtos" },
  { href: "/cash", label: "Caixa" },
];

export const SETTINGS_NAV: NavItem[] = [
  { href: "/settings/pricing", label: "Precificação" },
  { href: "/settings/printers", label: "Impressoras" },
  { href: "/settings/sales-channels", label: "Taxas por canal" },
  { href: "/settings/mei", label: "Teto MEI" },
];
