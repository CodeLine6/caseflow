import { withAuth } from 'next-auth/middleware'

export default withAuth({
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized: ({ token }) => !!token,
    },
})

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/cases/:path*',
        '/clients/:path*',
        '/tasks/:path*',
        '/documents/:path*',
        '/hearings/:path*',
        '/calendar/:path*',
        '/reports/:path*',
        '/settings/:path*',
        '/workspaces/:path*',
        '/cause-list/:path*',
        '/display-boards/:path*',
        // API routes (excluding auth callbacks and admin)
        '/api/cases/:path*',
        '/api/clients/:path*',
        '/api/hearings/:path*',
        '/api/documents/:path*',
        '/api/tasks/:path*',
        '/api/workspaces/:path*',
        '/api/notifications/:path*',
        '/api/cause-list/:path*',
        '/api/display-board/:path*',
        '/api/custom-case-values/:path*',
    ],
}
