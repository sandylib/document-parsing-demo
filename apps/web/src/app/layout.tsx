import type { Metadata } from 'next';
import { QueryProvider } from '@/core/providers/query-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Evidence before answers',
  description: 'Local document parsing and grounded knowledge demo',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
