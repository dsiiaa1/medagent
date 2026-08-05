import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Navbar } from '@/components/Navbar';
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
    >
      <body className="min-h-full flex flex-col bg-gray-50 antialiased">
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-400">
          MedAgent-Alpha v0.1.0-alpha · BISA AI NAIC 2026 · Data sintetis — bukan untuk penggunaan klinis nyata
        </footer>
      </body>
    </html>
  );
}
