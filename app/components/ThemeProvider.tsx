'use client'

import { useEffect } from 'react'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme')
        if (savedTheme === 'DARK') {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }

        const hasAuth = document.cookie.includes('auth-token=')
        if (!hasAuth) return

        fetch('/api/settings')
            .then(async (res) => {
                if (!res.ok) return
                const data = await res.json()
                const theme = data.theme
                localStorage.setItem('theme', theme)
                if (theme === 'DARK') {
                    document.documentElement.classList.add('dark')
                } else {
                    document.documentElement.classList.remove('dark')
                }
            })
            .catch(() => {})
    }, [])

    return <>{children}</>
}
