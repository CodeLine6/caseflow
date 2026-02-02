'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'
import {
    LayoutDashboard,
    Briefcase,
    Calendar,
    Users,
    FileText,
    CheckSquare,
    Building2,
    BarChart3,
    Settings,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Settings2,
    Plus,
} from 'lucide-react'

interface SidebarProps {
    collapsed?: boolean
    onCollapse?: (collapsed: boolean) => void
}

interface NavItem {
    href: string
    label: string
    icon: React.ElementType
    permission?: string
}

const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/cases', label: 'Cases', icon: Briefcase },
    { href: '/hearings', label: 'Hearings', icon: Calendar },
    { href: '/clients', label: 'Clients', icon: Users },
    { href: '/tasks', label: 'Tasks', icon: CheckSquare },
    { href: '/documents', label: 'Documents', icon: FileText },
    { href: '/courts', label: 'Courts', icon: Building2 },
    { href: '/workspaces', label: 'Workspaces', icon: Settings2 },
    { href: '/reports', label: 'Reports', icon: BarChart3, permission: 'reports.view' },
    { href: '/settings', label: 'Settings', icon: Settings, permission: 'workspace.manage' },
]

export default function Sidebar({ collapsed = false, onCollapse }: SidebarProps) {
    const pathname = usePathname()
    const { data: session } = useSession()
    const { can, role, loading } = usePermissions()
    const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([])
    const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('activeWorkspaceId')
            if (stored) setActiveWorkspaceId(stored)
        }
    }, [])

    useEffect(() => {
        async function fetchWorkspaces() {
            if (session?.user?.id) {
                try {
                    const response = await fetch('/api/workspaces')
                    if (response.ok) {
                        const data = await response.json()
                        setWorkspaces(data.workspaces || [])
                        if (!activeWorkspaceId && data.workspaces?.length > 0) {
                            setActiveWorkspaceId(data.workspaces[0].id)
                            localStorage.setItem('activeWorkspaceId', data.workspaces[0].id)
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch workspaces:', error)
                }
            }
        }
        fetchWorkspaces()
    }, [session, activeWorkspaceId])

    const handleWorkspaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value
        if (id === 'new') {
            window.location.href = '/workspaces/new'
        } else {
            setActiveWorkspaceId(id)
            localStorage.setItem('activeWorkspaceId', id)
            window.location.reload()
        }
    }

    const filteredNavItems = navItems.filter((item) => {
        if (!item.permission) return true
        if (loading) return false
        return can(item.permission as any)
    })

    return (
        <aside
            className={cn(
                'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col',
                collapsed ? 'w-16' : 'w-64'
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
                {!collapsed && (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                            <Briefcase className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-lg gradient-text">CaseFlow</span>
                    </div>
                )}
                <button
                    onClick={() => onCollapse?.(!collapsed)}
                    className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-foreground"
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
            </div>

            {/* User Info */}
            {!collapsed && session?.user && (
                <div className="p-4 border-b border-sidebar-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center text-white font-medium">
                            {session.user.name?.charAt(0) || 'U'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="font-medium text-sm truncate">{session.user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                                {loading ? 'Loading...' : (role || 'Member')}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Workspace Selector */}
            {!collapsed && workspaces.length > 0 && (
                <div className="p-4 border-b border-sidebar-border">
                    <label className="text-xs text-muted-foreground block mb-1.5 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        Workspace
                    </label>
                    <div className="relative">
                        <select
                            value={activeWorkspaceId || ''}
                            onChange={handleWorkspaceChange}
                            className="w-full px-3 py-2 pr-8 text-sm rounded-lg bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
                        >
                            {workspaces.map((ws) => (
                                <option key={ws.id} value={ws.id}>{ws.name}</option>
                            ))}
                            <option value="new">+ New Workspace</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {filteredNavItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'sidebar-item',
                                isActive && 'active',
                                collapsed && 'justify-center px-0'
                            )}
                            title={collapsed ? item.label : undefined}
                        >
                            <Icon className="w-5 h-5 shrink-0" />
                            {!collapsed && <span>{item.label}</span>}
                        </Link>
                    )
                })}
            </nav>

            {/* Footer */}
            {!collapsed && (
                <div className="p-4 border-t border-sidebar-border">
                    <p className="text-xs text-muted-foreground text-center">
                        CaseFlow v2.0
                    </p>
                </div>
            )}
        </aside>
    )
}
