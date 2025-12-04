"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export function AutoRedirectController() {
    const [isEnabled, setIsEnabled] = useState(false)
    const [timeLeft, setTimeLeft] = useState(5)
    const router = useRouter()

    useEffect(() => {
        const stored = localStorage.getItem("kiosk-auto-redirect")
        if (stored === "true") {
            setIsEnabled(true)
        }
    }, [])

    const handleToggle = (checked: boolean) => {
        setIsEnabled(checked)
        localStorage.setItem("kiosk-auto-redirect", String(checked))
    }

    const resetTimer = useCallback(() => {
        setTimeLeft(5)
    }, [])

    useEffect(() => {
        if (!isEnabled) return

        const events = ["mousedown", "mousemove", "keydown", "touchstart", "scroll", "click"]

        // Add event listeners
        events.forEach(event => {
            window.addEventListener(event, resetTimer)
        })

        // Timer interval
        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval)
                    router.push("/kiosk")
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, resetTimer)
            })
            clearInterval(interval)
        }
    }, [isEnabled, resetTimer, router])

    return (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-white/90 backdrop-blur p-3 rounded-lg shadow-lg border animate-in fade-in slide-in-from-bottom-4">
            <Switch
                id="auto-redirect-mode"
                checked={isEnabled}
                onCheckedChange={handleToggle}
            />
            <Label htmlFor="auto-redirect-mode" className="font-medium cursor-pointer text-slate-700">
                Auto {isEnabled && <span className="text-xs text-slate-500 font-normal ml-1">({timeLeft}s)</span>}
            </Label>
        </div>
    )
}
