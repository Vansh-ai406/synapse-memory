import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SynapseAgent | Persistent Agentic Memory with MongoDB Atlas',
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
      <body className="min-h-screen bg-[#00141e] text-slate-100 antialiased selection:bg-[#00ed64] selection:text-[#001e2b]">
        {children}
      </body>
    </html>
  );
}

