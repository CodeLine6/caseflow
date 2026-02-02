import 'next-auth'
import { DefaultSession, DefaultUser } from 'next-auth'
import { JWT } from 'next-auth/jwt'

declare module 'next-auth' {
    interface Session {
        user: {
            id: string
            defaultWorkspaceId: string | null
        } & DefaultSession['user']
    }

    interface User extends DefaultUser {
        id: string
        defaultWorkspaceId: string | null
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string
        defaultWorkspaceId: string | null
    }
}
