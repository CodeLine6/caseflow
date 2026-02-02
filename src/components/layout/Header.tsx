'use client'

import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
    Bell,
    Search,
    LogOut,
    User,
    Settings,
    ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps {
    sidebarCollapsed?: boolean
}

export default function Header({ sidebarCollapsed }: HeaderProps) {
    const { data: session } = useSession()
    const [showUserMenu, setShowUserMenu] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)
    const notificationRef = useRef<HTMLDivElement>(null)
    const userMenuRef = useRef<HTMLDivElement>(null)

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
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-medium rounded-full flex items-center justify-center">
                                3
                            </span>
                        </Button>

                        {showNotifications && (
                            <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl p-4 animate-fade-in">
                                <h3 className="font-semibold mb-3">Notifications</h3>
                                <div className="space-y-3">
                                    <div className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                                        <p className="text-sm font-medium">New hearing scheduled</p>
                                        <p className="text-xs text-muted-foreground mt-1">Case #2024-0042 - Tomorrow at 10:00 AM</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                                        <p className="text-sm font-medium">Document uploaded</p>
                                        <p className="text-xs text-muted-foreground mt-1">Evidence file added to Case #2024-0038</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                                        <p className="text-sm font-medium">Task due today</p>
                                        <p className="text-xs text-muted-foreground mt-1">Prepare witness statement</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="w-full mt-3">
                                    View All Notifications
                                </Button>
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
