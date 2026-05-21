// app/dashboard/page.tsx
// Redirect target after login — immediately sends to admin panel
import { redirect } from 'next/navigation'

export default function DashboardPage() {
  redirect('/')
}
