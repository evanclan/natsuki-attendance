'use client'

import { useEffect } from 'react'

export default function PrintTrigger() {
    useEffect(() => {
        // Short delay to ensure rendering is complete
        const timer = setTimeout(() => {
            window.print()
        }, 500)
        return () => clearTimeout(timer)
    }, [])

    return null
}
