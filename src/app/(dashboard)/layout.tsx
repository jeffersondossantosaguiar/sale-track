import Link from "next/link";
import Sidebar from "./sidebar";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-6xl">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
