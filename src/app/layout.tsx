import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "sale-track · Controle de Vendas MEI",
  description: "Controle de vendas para MEI de impressão 3D: importação de XML NFe, faturamento e caixa.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  );
}
