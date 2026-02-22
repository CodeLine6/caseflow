'use client'

import { usePermissions } from '@/hooks/usePermissions'
import type { Permission } from '@/lib/permissions'
import type { ReactNode } from 'react'

interface PermissionGateProps {
    /** Required permission to show children */
    permission?: Permission
    /** Any of these permissions grants access */
    anyOf?: Permission[]
    /** All of these permissions are required */
    allOf?: Permission[]
    /** Content to show if access is denied (defaults to nothing) */
    fallback?: ReactNode
    children: ReactNode
}

/**
 * Conditionally renders children based on RBAC permissions.
 *
 * Usage:
 * ```tsx
 * <PermissionGate permission="cases.create">
 *   <Button>New Case</Button>
 * </PermissionGate>
 *
 * <PermissionGate anyOf={['cases.update', 'cases.delete']}>
 *   <EditMenu />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
    permission,
    anyOf,
    allOf,
    fallback = null,
    children,
}: PermissionGateProps) {
    const { can, canAny, canAll, loading } = usePermissions()

    if (loading) return null

    let allowed = false

    if (permission) {
        allowed = can(permission)
    } else if (anyOf && anyOf.length > 0) {
        allowed = canAny(...anyOf)
    } else if (allOf && allOf.length > 0) {
        allowed = canAll(...allOf)
    } else {
        // No permission requirement specified — allow
        allowed = true
    }

    return allowed ? <>{children}</> : <>{fallback}</>
}
