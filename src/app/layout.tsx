import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SynapseMemory | Enterprise Agentic Memory Platform',
  description:
    'Autonomous Multi-Agent Memory Engine with MongoDB Vector Search, Change Streams, and TTL Indexes for SVNIT Hackathon.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#07090e] text-slate-100 antialiased selection:bg-[#00ed64]/20 selection:text-[#00ed64]">
        {children}
      </body>
    </html>
  );
}
