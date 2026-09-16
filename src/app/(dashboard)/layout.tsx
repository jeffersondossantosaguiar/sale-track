import Link from "next/link";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-sm font-semibold">
            sale-track <span className="font-normal text-muted-foreground">· MEI</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/sales" className="hover:text-foreground">
              Importar XML
            </Link>
            <Link href="/products" className="hover:text-foreground">
              Produtos
            </Link>
            <Link href="/cash" className="hover:text-foreground">
              Caixa
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
