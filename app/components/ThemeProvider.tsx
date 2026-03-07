'use client'

import { useEffect } from 'react'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const applyTheme = async () => {
            try {
                const res = await fetch('/api/settings')

                
                if (res.status === 401) {
                    const savedTheme = localStorage.getItem('theme')
                    if (savedTheme === 'DARK') {
                        document.documentElement.classList.add('dark')
                    } else {
                        document.documentElement.classList.remove('dark')
                    }
                    return
                }

                if (res.ok) {
                    const data = await res.json()
                    const theme = data.theme

                    
                    localStorage.setItem('theme', theme)

                    
                    if (theme === 'DARK') {
                        document.documentElement.classList.add('dark')
                    } else {
                        document.documentElement.classList.remove('dark')
                    }
                }
            } catch (error) {
                
                const savedTheme = localStorage.getItem('theme')
                if (savedTheme === 'DARK') {
                    document.documentElement.classList.add('dark')
                } else {
                    document.documentElement.classList.remove('dark')
                }
            }
        }

        applyTheme()
    }, [])

    return <>{children}</>
}
