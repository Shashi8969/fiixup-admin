// app/(admin)/layout.tsx
// Wraps all admin pages with sidebar + toast provider

import AdminLayout from '@/components/ui/AdminLayout'
import { ToastProvider } from '@/components/ui/Toast'

export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminLayout>{children}</AdminLayout>
      <ToastProvider />
    </>
  )
}
