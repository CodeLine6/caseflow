'use client'

import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
    Bell,
    Search,
    LogOut,
    User,
    Settings,
    ChevronDown,
    Calendar,
    FileText,
    CheckSquare,
    Briefcase,
    Users,
    Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface HeaderProps {
    sidebarCollapsed?: boolean
}

interface Notification {
    id: string
    type: string
    title: string
    message: string
    link: string | null
    read: boolean
    createdAt: string
}

const notificationIcons: Record<string, React.ElementType> = {
    INVITATION: Users,
    CASE_UPDATE: Briefcase,
    HEARING_REMINDER: Calendar,
    TASK_ASSIGNED: CheckSquare,
    TASK_DUE: CheckSquare,
    GENERAL: Bell,
    WORKSPACE_EVENT: Users,
}

export default function Header({ sidebarCollapsed }: HeaderProps) {
    const { data: session } = useSession()
    const [showUserMenu, setShowUserMenu] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(false)
    const notificationRef = useRef<HTMLDivElement>(null)
    const userMenuRef = useRef<HTMLDivElement>(null)

    const fetchNotifications = useCallback(async () => {
        if (!session?.user?.id) return

        try {
            setLoading(true)
            const response = await fetch('/api/notifications?limit=5')
            if (response.ok) {
                const data = await response.json()
                setNotifications(data.notifications || [])
                setUnreadCount(data.unreadCount || 0)
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error)
        } finally {
            setLoading(false)
        }
    }, [session?.user?.id])

    useEffect(() => {
        fetchNotifications()
        // Poll for new notifications every 30 seconds
        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }, [fetchNotifications])

    const handleMarkAllRead = async () => {
        try {
            const response = await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markAll: true }),
            })
            if (response.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, read: true })))
                setUnreadCount(0)
            }
        } catch (error) {
            console.error('Failed to mark notifications as read:', error)
        }
    }

    const handleLogout = () => {
        signOut({ callbackUrl: '/login' })
    }

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false)
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    const getNotificationIcon = (type: string) => {
        const Icon = notificationIcons[type] || Bell
        return <Icon className="w-4 h-4" />
    }

    return (
        <header
            className={cn(
                'fixed top-0 right-0 z-30 h-16 bg-background/80 backdrop-blur-md border-b border-border transition-all duration-300',
                sidebarCollapsed ? 'left-16' : 'left-64'
            )}
        >
            <div className="flex items-center justify-between h-full px-6">
                {/* Search */}
                <div className="flex-1 max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search cases, clients, documents..."
                            className="w-full h-10 pl-10 pr-4 rounded-lg bg-secondary/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all"
                        />
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                    {/* Notifications */}
                    <div className="relative" ref={notificationRef}>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                setShowNotifications(!showNotifications)
                                setShowUserMenu(false)
                            }}
                            className="relative"
                        >
                            <Bell className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-medium rounded-full flex items-center justify-center">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </Button>

                        {showNotifications && (
                            <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-fade-in">
                                <div className="flex items-center justify-between p-4 border-b border-border">
                                    <h3 className="font-semibold">Notifications</h3>
                                    {unreadCount > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs gap-1"
                                            onClick={handleMarkAllRead}
                                        >
                                            <Check className="w-3 h-3" />
                                            Mark all read
                                        </Button>
                                    )}
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {loading ? (
                                        <div className="p-8 text-center text-muted-foreground text-sm">
                                            Loading...
                                        </div>
                                    ) : notifications.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                            <p className="text-muted-foreground text-sm">No notifications</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-border">
                                            {notifications.map((notification) => (
                                                <div
                                                    key={notification.id}
                                                    className={cn(
                                                        'p-3 hover:bg-secondary/50 transition-colors cursor-pointer',
                                                        !notification.read && 'bg-primary/5'
                                                    )}
                                                >
                                                    <div className="flex gap-3">
                                                        <div className={cn(
                                                            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                                                            !notification.read ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                                                        )}>
                                                            {getNotificationIcon(notification.type)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={cn(
                                                                'text-sm',
                                                                !notification.read && 'font-medium'
                                                            )}>{notification.title}</p>
                                                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                                                {notification.message}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                                            </p>
                                                        </div>
                                                        {!notification.read && (
                                                            <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-2" />
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="p-2 border-t border-border">
                                    <Button variant="ghost" size="sm" className="w-full text-xs">
                                        View All Notifications
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User Menu */}
                    <div className="relative" ref={userMenuRef}>
                        <button
                            onClick={() => {
                                setShowUserMenu(!showUserMenu)
                                setShowNotifications(false)
                            }}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary transition-colors"
                        >
                            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white font-medium text-sm">
                                {session?.user?.name?.charAt(0) || 'U'}
                            </div>
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </button>

                        {showUserMenu && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-fade-in">
                                <div className="p-4 border-b border-border bg-secondary/50">
                                    <p className="font-medium text-sm">{session?.user?.name}</p>
                                    <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                                </div>
                                <div className="p-2 bg-card">
                                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-secondary transition-colors">
                                        <User className="w-4 h-4" />
                                        Profile
                                    </button>
                                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-secondary transition-colors">
                                        <Settings className="w-4 h-4" />
                                        Settings
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}

