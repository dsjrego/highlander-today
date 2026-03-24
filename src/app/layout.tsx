import type { Metadata } from "next";
import Link from "next/link";
import Providers from "@/components/Providers";
import BannerActions from "@/components/layout/BannerActions";
import NavigationBar from "@/components/layout/NavigationBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Highlander Today",
  description:
    "A community platform for news, events, market, and help wanted services.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <Providers>
          {/* Masthead */}
          <header className="bg-[#46A8CC] text-white pt-2" style={{ paddingBottom: '10px' }}>
            <div className="container mx-auto px-4 relative">
              <div className="absolute top-0 right-0">
                <BannerActions />
              </div>
              <h1 className="text-7xl font-bold text-white mb-0 leading-none" style={{ WebkitTextStroke: '1px black', textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}>Highlander Today</h1>
              <p className="text-xs italic text-black tracking-wide mb-0" style={{ marginTop: '5px' }}>Serving the Boroughs and Townships of Cambria Heights</p>
            </div>
          </header>

          {/* Navigation */}
          <NavigationBar />

          {/* Main Content */}
          <main className="container mx-auto mt-4 px-4 pt-6 pb-8">{children}</main>

          {/* Footer */}
          <footer className="text-red-100 py-8 mt-12" style={{ backgroundColor: '#7a1222' }}>
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-3 gap-8 mb-8">
                <div>
                  <h3 className="font-bold mb-2 text-white">About</h3>
                  <p className="text-sm text-red-200">
                    Highlander Today is a community platform for local news,
                    events, opportunity, and accountable local coordination.
                  </p>
                </div>
                <div>
                  <h3 className="font-bold mb-2 text-white">Quick Links</h3>
                  <ul className="text-sm text-red-200 space-y-1">
                    <li><Link href="/local-life" className="hover:text-white">Local Life</Link></li>
                    <li><Link href="/experiences" className="hover:text-white">Experiences</Link></li>
                    <li><Link href="/marketplace" className="hover:text-white">Market</Link></li>
                    <li><Link href="/help-wanted" className="hover:text-white">Help Wanted</Link></li>
                    <li><Link href="/about" className="hover:text-white">About</Link></li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold mb-2 text-white">Institutional</h3>
                  <ul className="text-sm text-red-200 space-y-1">
                    <li><Link href="/about/mission" className="hover:text-white">Mission</Link></li>
                    <li><Link href="/about/roadmap" className="hover:text-white">About Roadmap</Link></li>
                    <li><Link href="/about/journal" className="hover:text-white">Journal</Link></li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-red-800 pt-4 text-center text-sm text-red-200 space-y-2">
                <p>&copy; 2024 Highlander Today. All rights reserved.</p>
                <p className="mx-auto max-w-3xl text-xs leading-relaxed text-red-300">
                  Highlander Today is an independent community platform and is not affiliated with
                  the Cambria Heights School District.
                </p>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
