import type { Metadata } from 'next'
import { ToastProvider } from '@/components/ui/Toast'
import './globals.css'


export const metadata: Metadata = {
  title:       'Fiixup Admin',
  description: 'Fiixup content management panel',
  robots:      { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body suppressHydrationWarning>
        <ToastProvider />
        {children}
      </body>
    </html>
  )
}
