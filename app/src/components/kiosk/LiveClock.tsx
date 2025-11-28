'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock } from 'lucide-react'

export function LiveClock() {
    const [time, setTime] = useState(new Date())

    useEffect(() => {
        const interval = setInterval(() => {
            setTime(new Date())
        }, 1000)
        return () => clearInterval(interval)
    }, [])

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        })
    }

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    return (
        <div className="flex flex-col items-center justify-center px-6 py-2 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-lg border border-blue-200 shadow-sm">
            <div className="flex items-center gap-2 text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 tabular-nums">
                <Clock className="h-6 w-6 text-blue-500 animate-pulse" />
                {formatTime(time)}
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-gray-600 mt-1">
                <Calendar className="h-3 w-3" />
                {formatDate(time)}
            </div>
        </div>
    )
}
