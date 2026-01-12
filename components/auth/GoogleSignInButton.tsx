'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useEffect } from 'react'

declare global {
    interface Window {
        google?: any
    }
}

interface GoogleSignInButtonProps {
    onSuccess?: (response: any) => void
    onError?: (error: any) => void
}

export default function GoogleSignInButton({ onSuccess, onError }: GoogleSignInButtonProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        // Carregar o script do Google
        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        document.body.appendChild(script)

        return () => {
            document.body.removeChild(script)
        }
    }, [])

    const handleGoogleResponse = async (response: any) => {
        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: response.credential }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Erro ao autenticar com Google')
                setLoading(false)
                if (onError) onError(data.error)
                return
            }

            if (onSuccess) onSuccess(data)

            // Redirecionar
            if (data.user.onboardingCompleted) {
                router.push('/dashboard')
            } else {
                router.push('/onboarding')
            }
        } catch (err) {
            const errorMsg = 'Erro ao conectar com o servidor'
            setError(errorMsg)
            setLoading(false)
            if (onError) onError(errorMsg)
        }
    }

    useEffect(() => {
        if (typeof window !== 'undefined' && window.google) {
            window.google.accounts.id.initialize({
                client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
                callback: handleGoogleResponse,
            })

            window.google.accounts.id.renderButton(
                document.getElementById('google-signin-button'),
                {
                    theme: 'outline',
                    size: 'large',
                    width: '100%',
                    text: 'continue_with',
                    locale: 'pt-BR',
                }
            )
        }
    }, [])

    return (
        <div>
            {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                    {error}
                </div>
            )}
            <div id="google-signin-button" className={loading ? 'opacity-50 pointer-events-none' : ''}></div>
            {loading && (
                <div className="text-center mt-2 text-sm text-gray-600">
                    Autenticando...
                </div>
            )}
        </div>
    )
}
