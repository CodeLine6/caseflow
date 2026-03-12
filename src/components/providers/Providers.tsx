'use client'

import { SessionProvider, useSession } from 'next-auth/react'
import { ReactNode, useState, useEffect, useRef } from 'react'
import { PermissionsProvider } from '@/hooks/usePermissions'

interface ProvidersProps {
    children: ReactNode
}

function WorkspacePermissionsProvider({ children }: { children: ReactNode }) {
    const { data: session, status } = useSession()
    const [workspaceId, setWorkspaceId] = useState<string | null>(null)
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
        // Read from localStorage
        const stored = localStorage.getItem('activeWorkspaceId')
        if (stored) {
            setWorkspaceId(stored)
        } else if (status === 'authenticated') {
            // Session is ready but no workspace in localStorage yet.
            // The Sidebar will fetch workspaces and set one shortly.
            // Poll localStorage briefly so we pick it up as soon as it's set.
            pollRef.current = setInterval(() => {
                const id = localStorage.getItem('activeWorkspaceId')
                if (id) {
                    setWorkspaceId(id)
                    if (pollRef.current) clearInterval(pollRef.current)
                }
            }, 100)
        }

        // Listen for workspace changes (from Sidebar)
        const handler = () => {
            const updated = localStorage.getItem('activeWorkspaceId')
            setWorkspaceId(updated)
            // Stop polling if still active
            if (pollRef.current) {
                clearInterval(pollRef.current)
                pollRef.current = null
            }
        }
        window.addEventListener('storage', handler)
        // Also listen for custom event so same-tab changes are detected
        window.addEventListener('workspaceChanged', handler)
        return () => {
            window.removeEventListener('storage', handler)
            window.removeEventListener('workspaceChanged', handler)
            if (pollRef.current) clearInterval(pollRef.current)
        }
    }, [status])

    return (
        <PermissionsProvider workspaceId={workspaceId} isAuthenticated={status === 'authenticated'}>
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
