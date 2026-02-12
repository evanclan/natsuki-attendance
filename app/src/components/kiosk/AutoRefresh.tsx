'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

interface AutoRefreshProps {
    intervalMinutes?: number
}

export function AutoRefresh({ intervalMinutes = 5 }: AutoRefreshProps) {
    const router = useRouter()
    const [timeLeft, setTimeLeft] = useState(intervalMinutes * 60)
    const [isRefreshing, setIsRefreshing] = useState(false)

    useEffect(() => {
        // Timer for countdown
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                // If it hits 1, we refresh, then reset to max time
                if (prev <= 1) {
                    setIsRefreshing(true)
                    router.refresh()

                    // Simple visual indicator logic
                    // In a real app we'd track "loading" state from router but 
                    // for this simple case, we just flash the spinner
                    setTimeout(() => setIsRefreshing(false), 1000)

                    return intervalMinutes * 60
                }
                return prev - 1
            })
        }, 1000)

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                setIsRefreshing(true)
                router.refresh()
                setTimeLeft(intervalMinutes * 60)
                setTimeout(() => setIsRefreshing(false), 1000)
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            clearInterval(timer)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [intervalMinutes, router])

    const handleRefresh = () => {
        setIsRefreshing(true)
        router.refresh()
        setTimeLeft(intervalMinutes * 60)
        setTimeout(() => setIsRefreshing(false), 1000)
    }

    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60

    return (
        <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-medium text-gray-500 bg-white/80 px-2 py-1 md:px-3 md:py-1.5 rounded-full border border-gray-200 shadow-sm transition-all hover:bg-white">
            <span className="tabular-nums hidden md:inline whitespace-nowrap">
                Syncing in {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
            <span className="tabular-nums md:hidden whitespace-nowrap">
                {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
            <Button
                variant="ghost"
                size="icon"
                className={`h-5 w-5 p-0 hover:bg-transparent text-gray-400 hover:text-orange-500 transition-all ${isRefreshing ? 'animate-spin text-orange-500' : ''}`}
                onClick={handleRefresh}
                title="Refresh Now"
                disabled={isRefreshing}
            >
                <RefreshCw className="h-3.5 w-3.5" />
            </Button>
        </div>
    )
}
