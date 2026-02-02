'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import { cn } from '@/lib/utils'
import { Toaster } from 'react-hot-toast'

interface MainLayoutProps {
    children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

    return (
        <div className="min-h-screen bg-background">
            <Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
            <Header sidebarCollapsed={sidebarCollapsed} />

            <main
                className={cn(
                    'pt-16 min-h-screen transition-all duration-300',
                    sidebarCollapsed ? 'pl-16' : 'pl-64'
                )}
            >
                <div className="p-6">
                    {children}
                </div>
            </main>

            <Toaster
                position="top-right"
                toastOptions={{
                    className: 'glass-card !bg-card !text-foreground',
                    duration: 4000,
                    style: {
                        background: 'hsl(var(--card))',
                        color: 'hsl(var(--foreground))',
                        border: '1px solid hsl(var(--border))',
                    },
                }}
            />
        </div>
    )
}
