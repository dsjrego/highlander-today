import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-6 min-h-screen">
      {/* Admin Sidebar */}
      <aside className="w-56 bg-gray-900 text-white p-6 flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-[#46A8CC]">Admin</h2>

        <nav className="space-y-2 flex-1">
          <a
            href="/admin"
            className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition"
          >
            Dashboard
          </a>
          <a
            href="/admin/users"
            className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition"
          >
            Users
          </a>
          <a
            href="/admin/trust"
            className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition"
          >
            Trust Management
          </a>
          <a
            href="/admin/bans"
            className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition"
          >
            Bans
          </a>
          <a
            href="/admin/audit"
            className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition"
          >
            Audit Log
          </a>
          <a
            href="/admin/content"
            className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition"
          >
            Content Approvals
          </a>
          <a
            href="/admin/roadmap"
            className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition"
          >
            Roadmap Moderation
          </a>
          <a
            href="/admin/stores"
            className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition"
          >
            Store Moderation
          </a>
          <a
            href="/admin/homepage"
            className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition"
          >
            Homepage Curation
          </a>
          <a
            href="/admin/categories"
            className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition"
          >
            Categories
          </a>
          <a
            href="/admin/settings"
            className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition"
          >
            Settings
          </a>
        </nav>

        <div className="border-t border-gray-700 pt-4">
          <a
            href="/"
            className="block px-4 py-2 text-sm text-gray-400 hover:text-white transition"
          >
            Back to Site
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
