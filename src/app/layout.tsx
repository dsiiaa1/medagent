import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Navbar } from '@/components/Navbar';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'MedAgent-Alpha — Sistem Triase IGD Berbasis AI',
  description:
    'Sistem autonomous triage berbasis AI untuk IGD Puskesmas dan RS Daerah. ' +
    'Menghitung skor urgensi ESI, memeriksa interaksi obat, dan membuat ringkasan SOAP secara otomatis.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
      </head>
      <body className="min-h-full flex flex-col antialiased" style={{ background: 'var(--bg-page)', color: 'var(--fg-primary)' }}>
        <ThemeProvider>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <footer
            className="border-t py-4 text-center text-xs"
            style={{ borderColor: 'var(--border-default)', color: 'var(--fg-muted)', background: 'var(--bg-card)' }}
          >
            MedAgent-Alpha v0.1.0-alpha · BISA AI NAIC 2026 · Data sintetis — bukan untuk penggunaan klinis nyata
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
