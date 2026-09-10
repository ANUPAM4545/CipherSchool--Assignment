import type { Metadata } from 'next';
import './globals.css';
import NavigationWrapper from '../components/NavigationWrapper';
import FooterWrapper from '../components/FooterWrapper';

export const metadata: Metadata = {
  title: 'LLD Practice — Enterprise Low-Level System Design Platform',
  description:
    'Master object-oriented architecture, class responsibilities, and design trade-offs through deliberate practice and evidence-grounded feedback.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <NavigationWrapper />
          <main style={{ flex: 1 }}>{children}</main>
          <FooterWrapper />
        </div>
      </body>
    </html>
  );
}
