'use client'

import Link from 'next/link'
import { LucideIcon } from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SectionCardProps {
    title: string
    description?: string
    icon: LucideIcon
    href?: string
    gradient?: string
    children?: React.ReactNode
    actions?: React.ReactNode
}

export default function SectionCard({
    title,
    description,
    icon: Icon,
    href,
    gradient,
    children,
    actions
}: SectionCardProps) {
    const content = (
        <>
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl shadow-lg",
                        gradient || "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-500/30"
                    )}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {title}
                        </h3>
                        {description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {description}
                            </p>
                        )}
                    </div>
                </div>
                {href && (
                    <ArrowRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1" />
                )}
                {actions}
            </div>

            {/* Content */}
            {children && (
                <div className="space-y-4">
                    {children}
                </div>
            )}
        </>
    )

    if (href) {
        return (
            <Link
                href={href}
                className="group block rounded-2xl bg-white p-6 shadow-sm transition-all hover:shadow-xl dark:bg-gray-800"
            >
                {content}
            </Link>
        )
    }

    return (
        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800">
            {content}
        </div>
    )
}
