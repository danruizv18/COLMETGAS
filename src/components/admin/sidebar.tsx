'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Package,
  ClipboardList,
  Wrench,
  HardHat,
  Layers,
  GitBranch,
  ChevronRight,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/actions/auth'
import type { UserRole } from '@/lib/database.types'

// NOTE: Hiding nav items based on role is UX convenience only.
// The actual access control is enforced by RLS policies in Postgres.
// A user who crafts a direct URL to a hidden route will be blocked by the
// database — not by the absence of a link in the sidebar.

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  exact?: boolean
  // Roles that can see this item. Omit to show for all roles.
  visibleTo?: UserRole[]
}

const navItems: NavItem[] = [
  { href: '/admin',            label: 'Dashboard',          icon: LayoutDashboard, exact: true },
  { href: '/admin/customers',  label: 'Clientes',            icon: Users },
  { href: '/admin/assets',     label: 'Activos',             icon: Package },
  { href: '/admin/work-orders',label: 'Órdenes de Trabajo',  icon: ClipboardList },
  { href: '/admin/wo-materials', label: 'OT y Materiales',    icon: ClipboardList, visibleTo: ['admin', 'engineer', 'technician'] },
  { href: '/admin/wo-details',   label: 'Detalles de OT',     icon: GitBranch,    visibleTo: ['admin', 'engineer', 'technician'] },
  { href: '/admin/client-access', label: 'Acceso Clientes',   icon: Users,        visibleTo: ['admin', 'engineer'] },
  { href: '/admin/materials',  label: 'Materiales',          icon: Layers,       visibleTo: ['admin', 'engineer', 'technician'] },
  { href: '/admin/traceability',label: 'Trazabilidad',       icon: GitBranch,    visibleTo: ['admin', 'engineer', 'technician'] },
  { href: '/admin/personnel',  label: 'Personal',            icon: HardHat,      visibleTo: ['admin', 'engineer', 'technician'] },
  { href: '/admin/equipment',  label: 'Equipos',             icon: Wrench,       visibleTo: ['admin', 'engineer', 'technician'] },
  { href: '/admin/users',      label: 'Usuarios',            icon: ShieldCheck,  visibleTo: ['admin'] },
]

const roleLabel: Record<UserRole, string> = {
  admin:      'Administrador',
  engineer:   'Ingeniero',
  technician: 'Técnico',
  client:     'Cliente',
}

interface AdminSidebarProps {
  role: UserRole
  displayName?: string
}

export function AdminSidebar({ role, displayName }: AdminSidebarProps) {
  const pathname = usePathname()

  const visibleItems = navItems.filter(
    ({ visibleTo }) => !visibleTo || visibleTo.includes(role)
  )

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <span className="text-sm font-semibold leading-tight text-foreground">
          COLMETGAS<br />
          <span className="font-normal text-muted-foreground text-xs">INGENIERIA SAS</span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-0.5">
          {visibleItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {active && <ChevronRight className="h-3 w-3" />}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t p-3 space-y-1">
        {displayName && (
          <div className="px-3 py-1.5">
            <p className="text-xs font-medium text-foreground truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground">{roleLabel[role]}</p>
          </div>
        )}
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Cerrar sesión
          </button>
        </form>
        <p className="px-3 text-xs text-muted-foreground">v1.0.0 · 2026</p>
      </div>
    </aside>
  )
}
