'use client'

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react'
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
    refresh: () => {},
})

export function PermissionsProvider({
    workspaceId,
    children,
}: {
    workspaceId: string | null
    children: ReactNode
}) {
    const [role, setRole] = useState<string | null>(null)
    const [permissions, setPermissions] = useState<Permission[]>([])
    const [loading, setLoading] = useState(true)

    const fetchPermissions = useCallback(async () => {
        if (!workspaceId) {
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
    }, [workspaceId])

    useEffect(() => {
        fetchPermissions()
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
