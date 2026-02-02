'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect, useCallback } from 'react'
import { WorkspaceRole } from '@/types'
import { hasPermission, hasAnyPermission, Permission } from '@/lib/permissions'

interface UsePermissionsReturn {
    role: WorkspaceRole | null
    loading: boolean
    can: (permission: Permission) => boolean
    canAny: (permissions: Permission[]) => boolean
    isAdmin: boolean
    isManager: boolean
    isMember: boolean
    isAssistant: boolean
    isIntern: boolean
}

export function usePermissions(workspaceId?: string): UsePermissionsReturn {
    const { data: session, status } = useSession()
    const [role, setRole] = useState<WorkspaceRole | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchRole() {
            if (status === 'loading') return

            if (!session?.user?.id) {
                setLoading(false)
                return
            }

            const wsId = workspaceId || session.user.defaultWorkspaceId

            if (!wsId) {
                setLoading(false)
                return
            }

            try {
                const response = await fetch(`/api/workspaces/${wsId}/members`)
                if (response.ok) {
                    const data = await response.json()
                    const userMember = data.members?.find(
                        (m: { userId: string }) => m.userId === session.user.id
                    )
                    if (userMember) {
                        setRole(userMember.role as WorkspaceRole)
                    }
                }
            } catch (error) {
                console.error('Failed to fetch user role:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchRole()
    }, [session, status, workspaceId])

    const can = useCallback(
        (permission: Permission) => {
            if (!role) return false
            return hasPermission(role, permission)
        },
        [role]
    )

    const canAny = useCallback(
        (permissions: Permission[]) => {
            if (!role) return false
            return hasAnyPermission(role, permissions)
        },
        [role]
    )

    return {
        role,
        loading,
        can,
        canAny,
        isAdmin: role === 'ADMIN',
        isManager: role === 'MANAGER',
        isMember: role === 'MEMBER',
        isAssistant: role === 'ASSISTANT',
        isIntern: role === 'INTERN',
    }
}
