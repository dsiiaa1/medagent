/**
 * Navbar — top navigation bar for MedAgent-Alpha.
 */

import Link from 'next/link';

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white text-sm font-bold select-none">
              M
            </span>
            <span className="font-bold text-gray-900 text-sm tracking-tight">
              MedAgent
              <span className="text-red-600">-Alpha</span>
            </span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              Dashboard
            </Link>
            <Link
              href="/input"
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              + Pasien Baru
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
