'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface NavItem {
    name: string
    href: string
    icon: LucideIcon
    badge?: string | number
}

interface User {
    name?: string
    email?: string
}

interface SidebarProps {
    navigation: NavItem[]
    onLogout: () => void
    onClose?: () => void
    user?: User
}

export default function Sidebar({ navigation, onLogout, onClose, user }: SidebarProps) {
    const pathname = usePathname()

    return (
        <div className="flex h-full flex-col">
            {/* Logo Section */}
            <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200 dark:border-gray-700/50">
                <div className="flex items-center gap-3">
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
                        <span className="text-xl font-bold text-white">F+</span>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                            FinanPlus
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Controle Financeiro</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
                {navigation.map((item, index) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onClose}
                            className={cn(
                                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30"
                                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/50"
                            )}
                            style={{
                                animationDelay: `${index * 30}ms`
                            }}
                        >
                            {/* Active Indicator */}
                            {isActive && (
                                <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-white" />
                            )}

                            {/* Icon */}
                            <div className={cn(
                                "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                                isActive
                                    ? "bg-white/20"
                                    : "bg-gray-100 text-gray-600 group-hover:bg-blue-50 group-hover:text-blue-600 dark:bg-gray-800 dark:text-gray-400 dark:group-hover:bg-gray-700"
                            )}>
                                <Icon className="h-5 w-5" />
                            </div>

                            {/* Label */}
                            <span className="flex-1">{item.name}</span>

                            {/* Badge */}
                            {item.badge && (
                                <span className={cn(
                                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                                    isActive
                                        ? "bg-white/20 text-white"
                                        : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                )}>
                                    {item.badge}
                                </span>
                            )}

                            {/* Hover Effect */}
                            {!isActive && (
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 to-blue-600/0 opacity-0 transition-opacity group-hover:from-blue-500/5 group-hover:to-blue-600/5 group-hover:opacity-100" />
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* User Section */}
            <div className="border-t border-gray-200 dark:border-gray-700/50 p-4">
                <div className="mb-3 flex items-center gap-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-3 dark:from-gray-800 dark:to-gray-800/50">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30">
                        <span className="text-sm font-semibold">
                            {user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                            {user?.name || 'Usuário'}
                        </p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                            {user?.email || 'usuario@email.com'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={onLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-all hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </div>
                    <span>Sair</span>
                </button>
            </div>
        </div>
    )
}
