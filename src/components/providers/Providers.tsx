'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode, useState, useEffect } from 'react'
import { PermissionsProvider } from '@/hooks/usePermissions'

interface ProvidersProps {
    children: ReactNode
}

function WorkspacePermissionsProvider({ children }: { children: ReactNode }) {
    const [workspaceId, setWorkspaceId] = useState<string | null>(null)

    useEffect(() => {
        // Read from localStorage
        const stored = localStorage.getItem('activeWorkspaceId')
        if (stored) setWorkspaceId(stored)

        // Listen for workspace changes (from Sidebar)
        const handler = () => {
            const updated = localStorage.getItem('activeWorkspaceId')
            setWorkspaceId(updated)
        }
        window.addEventListener('storage', handler)
        // Also listen for custom event so same-tab changes are detected
        window.addEventListener('workspaceChanged', handler)
        return () => {
            window.removeEventListener('storage', handler)
            window.removeEventListener('workspaceChanged', handler)
        }
    }, [])

    return (
        <PermissionsProvider workspaceId={workspaceId}>
            {children}
        </PermissionsProvider>
    )
}

export default function Providers({ children }: ProvidersProps) {
    return (
        <SessionProvider>
            <WorkspacePermissionsProvider>
                {children}
            </WorkspacePermissionsProvider>
        </SessionProvider>
    )
}
