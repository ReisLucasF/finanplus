'use client'

import { useEffect } from 'react'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const applyTheme = async () => {
            try {
                const res = await fetch('/api/settings')

                // Se não estiver autenticado, usar localStorage ou padrão
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

                    // Salvar no localStorage
                    localStorage.setItem('theme', theme)

                    // Aplicar tema
                    if (theme === 'DARK') {
                        document.documentElement.classList.add('dark')
                    } else {
                        document.documentElement.classList.remove('dark')
                    }
                }
            } catch (error) {
                // Em caso de erro, usar localStorage
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
