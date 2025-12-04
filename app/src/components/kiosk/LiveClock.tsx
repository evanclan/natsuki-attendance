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
            hour12: false
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
        <div className="flex flex-col items-center justify-center px-6 py-2 bg-white rounded-2xl border-2 border-blue-100 shadow-[0_4px_0_0_rgba(219,234,254,1)] transform hover:-translate-y-0.5 transition-transform">
            <div className="flex items-center gap-2 text-2xl font-black text-blue-500 tabular-nums tracking-wider">
                <Clock className="h-5 w-5 text-blue-400 animate-bounce" />
                {formatTime(time)}
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-300 uppercase tracking-widest mt-0.5">
                <Calendar className="h-3 w-3" />
                {formatDate(time)}
            </div>
        </div>
    )
}
