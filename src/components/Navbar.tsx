'use client';

/**
 * Navbar — top navigation bar for MedAgent-Alpha.
 * Features: glassmorphism, dark/light toggle, live badge, premium brand mark.
 */

import Link from 'next/link';
import { Siren, LayoutDashboard } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export function Navbar() {
  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-md"
      style={{
        background: 'var(--navbar-bg)',
        borderBottom: '1px solid var(--navbar-border)',
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-4">

          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0" aria-label="MedAgent Home">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-sm font-black select-none transition-all duration-200 group-hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)',
                boxShadow: '0 2px 8px rgba(192,57,43,0.35)',
              }}
            >
              M
            </span>
            <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--fg-primary)' }}>
              MedAgent
              <span style={{ color: 'var(--brand-red)' }}>-Alpha</span>
            </span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1 flex-1 justify-center">
            <Link
              href="/dashboard"
              id="nav-dashboard"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150 hover:scale-[1.02]"
              style={{ color: 'var(--fg-secondary)' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)';
                (e.currentTarget as HTMLElement).style.color = 'var(--fg-primary)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'var(--fg-secondary)';
              }}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </Link>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Theme toggle */}
            <ThemeToggle />

            {/* CTA */}
            <Link
              href="/input"
              id="nav-pasien-baru"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-all duration-150 hover:scale-[1.02] active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)',
                boxShadow: '0 2px 8px rgba(192,57,43,0.3)',
              }}
            >
              <Siren className="w-4 h-4" />
              <span className="hidden sm:inline">Pasien Baru</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
