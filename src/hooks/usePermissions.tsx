'use client'

import { useState, useEffect, useCallback, createContext, useContext, useRef, type ReactNode } from 'react'
import type { Permission } from '@/lib/permissions'

interface PermissionsContextValue {
    role: string | null
    permissions: Permission[]
    loading: boolean
    can: (permission: Permission) => boolean
    canAny: (...permissions: Permission[]) => boolean
    canAll: (...permissions: Permission[]) => boolean
    refresh: () => void
}

const PermissionsContext = createContext<PermissionsContextValue>({
    role: null,
    permissions: [],
    loading: true,
    can: () => false,
    canAny: () => false,
    canAll: () => false,
    refresh: () => { },
})

export function PermissionsProvider({
    workspaceId,
    isAuthenticated,
    children,
}: {
    workspaceId: string | null
    isAuthenticated: boolean
    children: ReactNode
}) {
    const [role, setRole] = useState<string | null>(null)
    const [permissions, setPermissions] = useState<Permission[]>([])
    const [loading, setLoading] = useState(true)
    const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const fetchPermissions = useCallback(async (retry = true) => {
        if (!workspaceId || !isAuthenticated) {
            // If not authenticated yet, keep loading true so UI doesn't
            // prematurely hide permission-gated elements.
            // If authenticated but no workspace, loading can be false.
            if (!isAuthenticated) {
                setLoading(true)
                return
            }
            setRole(null)
            setPermissions([])
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            const res = await fetch(`/api/user/permissions?workspaceId=${workspaceId}`)
            if (res.ok) {
                const data = await res.json()
                setRole(data.role)
                setPermissions(data.permissions)
            } else if (res.status === 401 && retry) {
                // Session cookie may not be fully established yet after login.
                // Retry once after a short delay.
                retryRef.current = setTimeout(() => fetchPermissions(false), 500)
                return // Keep loading true while retrying
            } else {
                setRole(null)
                setPermissions([])
            }
        } catch {
            setRole(null)
            setPermissions([])
        } finally {
            setLoading(false)
        }
    }, [workspaceId, isAuthenticated])

    useEffect(() => {
        fetchPermissions()
        return () => {
            if (retryRef.current) clearTimeout(retryRef.current)
        }
    }, [fetchPermissions])

    const can = useCallback(
        (permission: Permission) => permissions.includes(permission),
        [permissions]
    )

    const canAny = useCallback(
        (...perms: Permission[]) => perms.some(p => permissions.includes(p)),
        [permissions]
    )

    const canAll = useCallback(
        (...perms: Permission[]) => perms.every(p => permissions.includes(p)),
        [permissions]
    )

    return (
        <PermissionsContext.Provider
            value={{ role, permissions, loading, can, canAny, canAll, refresh: fetchPermissions }}
        >
            {children}
        </PermissionsContext.Provider>
    )
}

/**
 * Hook to access RBAC permissions for the active workspace.
 *
 * Usage:
 * ```tsx
 * const { can, role } = usePermissions()
 * if (can('cases.create')) { ... }
 * ```
 */
export function usePermissions() {
    return useContext(PermissionsContext)
}
