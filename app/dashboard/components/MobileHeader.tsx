'use client'

import { Menu, Bell, Search } from 'lucide-react'

interface MobileHeaderProps {
    onMenuClick: () => void
}

export default function MobileHeader({ onMenuClick }: MobileHeaderProps) {
    return (
        <div className="sticky top-0 z-10 flex h-16 items-center justify-between bg-white/80 backdrop-blur-xl border-b border-gray-200 px-4 dark:bg-gray-900/80 dark:border-gray-700/50 lg:hidden">
            <button
                onClick={onMenuClick}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
                <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
                    <span className="text-lg font-bold text-white">F+</span>
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                    FinanPlus
                </span>
            </div>

            <div className="flex items-center gap-2">
                <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                    <Search className="h-5 w-5" />
                </button>
                <button className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                    <Bell className="h-5 w-5" />
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900"></span>
                </button>
            </div>
        </div>
    )
}
