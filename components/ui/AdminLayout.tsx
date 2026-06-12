'use client'
// components/ui/AdminLayout.tsx
// Sidebar + topbar shell — wraps all admin pages

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { getBrowserClient } from '@/lib/supabase'
import {
  Wrench, LayoutDashboard, MapPin, Settings,
  FileText, Package, Layers, LogOut,
  Menu, X, ChevronRight, Globe, Image,
  Route, Star, Activity, HelpCircle, Navigation, SlidersHorizontal, Link2,Home, Inbox, BarChart3,
} from 'lucide-react'
import { clsx } from 'clsx'

const NAV = [
  { href: '/',                    icon: LayoutDashboard, label: 'Dashboard'         },
    { href: '/homepage',            icon: Home,            label: 'Homepage'          },
  { href: '/cities',              icon: MapPin,          label: 'Cities'            },
  { href: '/location-services',   icon: Settings,        label: 'Location Services' },
  { href: '/city-service-pages',  icon: Layers,          label: 'Category Pages'    },
  { href: '/posts',               icon: FileText,        label: 'Blog Posts'        },
  { href: '/services',            icon: Package,         label: 'Services'          },
  { href: '/media',               icon: Image,           label: 'Media Library'     },
  { href: '/reviews',             icon: Star,            label: 'Review Library'    },
  { href: '/faq-library',         icon: HelpCircle,      label: 'FAQ Library'       },
  { href: '/navigation',          icon: Navigation,      label: 'Navigation'        },
  { href: '/internal-links',      icon: Link2,           label: 'Internal Links'     },
  { href: '/leads',               icon: Inbox,           label: 'Leads'              },
  { href: '/settings',            icon: SlidersHorizontal, label: 'Site Settings'     },
  { href: '/cms-health',          icon: Activity,        label: 'CMS Health'        },
  { href: '/project-audit',       icon: BarChart3,       label: 'Project Audit'      },
  { href: '/redirects',            icon: Route,           label: 'Redirects'         },

]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname    = usePathname()
  const router      = useRouter()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    const sb = getBrowserClient()
    await sb.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const NavItem = ({ href, icon: Icon, label }: typeof NAV[0]) => {
    const active = pathname === href || (href !== '/' && pathname.startsWith(href))
    return (
      <Link
        href={href}
        onClick={() => setOpen(false)}
        className={clsx(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
          active
            ? 'bg-blue-600/15 text-blue-400 border border-blue-600/20'
            : 'text-[#94a3b8] hover:text-white hover:bg-[#2a2d3e]'
        )}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        {label}
        {active && <ChevronRight className="w-3 h-3 ml-auto text-blue-400" />}
      </Link>
    )
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[#2a2d3e]">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Wrench className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-bold text-white text-sm leading-none">Fiixup</p>
          <p className="text-[#6b7280] text-xs mt-0.5">Admin Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map((item) => <NavItem key={item.href} {...item} />)}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-[#2a2d3e] space-y-1">
        <a
          href="https://fiixup.in"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#94a3b8] hover:text-white hover:bg-[#2a2d3e] transition-all"
        >
          <Globe className="w-4 h-4" />
          View Live Site
        </a>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#94a3b8] hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-[#0f1117] overflow-hidden">

      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-56 bg-[#1a1d27] border-r border-[#2a2d3e] flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Sidebar — mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="relative flex flex-col w-56 h-full bg-[#1a1d27] border-r border-[#2a2d3e]">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b border-[#2a2d3e] bg-[#1a1d27] flex items-center px-4 gap-4 flex-shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden text-[#94a3b8] hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-xs text-[#6b7280]">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            admin.fiixup.in
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}