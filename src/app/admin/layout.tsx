import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] flex min-h-screen w-screen bg-[#f7f8fa]">
      {/* Admin Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-[#edf2f5] p-5 text-slate-700 flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-[#2c7f9e]">Admin</h2>

        <nav className="space-y-0 flex-1">
          <a
            href="/admin"
            className="block rounded-lg px-3 py-[5px] font-medium text-slate-700 transition hover:bg-white hover:text-[#A51E30]"
          >
            Dashboard
          </a>
          <a
            href="/admin/articles"
            className="block rounded-lg px-3 py-[5px] font-medium text-slate-700 transition hover:bg-white hover:text-[#A51E30]"
          >
            Articles
          </a>
          <a
            href="/admin/categories"
            className="block rounded-lg px-3 py-[5px] font-medium text-slate-700 transition hover:bg-white hover:text-[#A51E30]"
          >
            Navigation
          </a>
          <a
            href="/admin/homepage"
            className="block rounded-lg px-3 py-[5px] font-medium text-slate-700 transition hover:bg-white hover:text-[#A51E30]"
          >
            Homepage Curation
          </a>
          <a
            href="/admin/content"
            className="block rounded-lg px-3 py-[5px] font-medium text-slate-700 transition hover:bg-white hover:text-[#A51E30]"
          >
            Content Approvals
          </a>
          {isSuperAdmin ? (
            <a
              href="/admin/roadmap"
              className="block rounded-lg px-3 py-[5px] font-medium text-slate-700 transition hover:bg-white hover:text-[#A51E30]"
            >
              Roadmap Moderation
            </a>
          ) : null}
          <a
            href="/admin/stores"
            className="block rounded-lg px-3 py-[5px] font-medium text-slate-700 transition hover:bg-white hover:text-[#A51E30]"
          >
            Store Moderation
          </a>
          <a
            href="/admin/trust"
            className="block rounded-lg px-3 py-[5px] font-medium text-slate-700 transition hover:bg-white hover:text-[#A51E30]"
          >
            Trust Management
          </a>
          <a
            href="/admin/bans"
            className="block rounded-lg px-3 py-[5px] font-medium text-slate-700 transition hover:bg-white hover:text-[#A51E30]"
          >
            Bans
          </a>
          <a
            href="/admin/content-architecture"
            className="block rounded-lg px-3 py-[5px] font-medium text-slate-700 transition hover:bg-white hover:text-[#A51E30]"
          >
            Content Architecture
          </a>
          <a
            href="/admin/users"
            className="block rounded-lg px-3 py-[5px] font-medium text-slate-700 transition hover:bg-white hover:text-[#A51E30]"
          >
            Users
          </a>
          <a
            href="/admin/sites"
            className="block rounded-lg px-3 py-[5px] font-medium text-slate-700 transition hover:bg-white hover:text-[#A51E30]"
          >
            Sites
          </a>
          <a
            href="/admin/audit"
            className="block rounded-lg px-3 py-[5px] font-medium text-slate-700 transition hover:bg-white hover:text-[#A51E30]"
          >
            Audit Log
          </a>
          <a
            href="/admin/settings"
            className="block rounded-lg px-3 py-[5px] font-medium text-slate-700 transition hover:bg-white hover:text-[#A51E30]"
          >
            Settings
          </a>
        </nav>

        <div className="border-t border-slate-300 pt-4">
          <a
            href="/"
            className="block rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-white hover:text-[#A51E30]"
          >
            Back to Site
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1 p-[5px]">{children}</main>
    </div>
  );
}
