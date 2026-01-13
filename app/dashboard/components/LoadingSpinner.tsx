'use client'

export default function LoadingSpinner() {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
                <div className="relative mx-auto h-20 w-20">
                    {/* Spinner externo */}
                    <div className="absolute h-20 w-20 animate-spin rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
                    {/* Spinner interno */}
                    <div className="absolute h-20 w-20 animate-spin rounded-full border-4 border-transparent border-t-blue-500"></div>
                    {/* Logo central */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
                            <span className="text-lg font-bold text-white">F+</span>
                        </div>
                    </div>
                </div>
                <p className="mt-6 text-lg font-medium text-gray-900 dark:text-white">
                    Carregando...
                </p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Por favor, aguarde
                </p>
            </div>
        </div>
    )
}
