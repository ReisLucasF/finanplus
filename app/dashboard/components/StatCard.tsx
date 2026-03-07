'use client'

import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
    title: string
    value: string
    icon: LucideIcon
    trend?: {
        value: string
        isPositive: boolean
    }
    gradient?: string
    iconColor?: string
}

export default function StatCard({ title, value, icon: Icon, trend, gradient, iconColor }: StatCardProps) {
    return (
        <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm transition-all hover:shadow-xl dark:bg-gray-800">
            
            <div className={cn(
                "absolute right-0 top-0 h-32 w-32 rounded-full opacity-10 blur-3xl transition-opacity group-hover:opacity-20",
                gradient || "bg-blue-500"
            )} />

            <div className="relative">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {title}
                        </p>
                        <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                            {value}
                        </p>

                        {trend && (
                            <div className="mt-3 flex items-center gap-1">
                                <span className={cn(
                                    "text-xs font-semibold",
                                    trend.isPositive
                                        ? "text-green-600 dark:text-green-400"
                                        : "text-red-600 dark:text-red-400"
                                )}>
                                    {trend.isPositive ? '↑' : '↓'} {trend.value}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    vs mês anterior
                                </span>
                            </div>
                        )}
                    </div>

                    <div className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-xl shadow-lg transition-transform group-hover:scale-110",
                        iconColor || "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-500/30"
                    )}>
                        <Icon className="h-6 w-6" />
                    </div>
                </div>
            </div>
        </div>
    )
}
