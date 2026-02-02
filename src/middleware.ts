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
    ],
}
