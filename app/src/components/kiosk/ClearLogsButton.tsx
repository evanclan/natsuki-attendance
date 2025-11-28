'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { clearDailyLogs } from '@/app/actions/kiosk'
import { Trash2, Loader2 } from 'lucide-react'

export function ClearLogsButton() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const handleClear = async () => {
        if (!confirm('Clear ALL attendance data for TODAY only? This cannot be undone.')) {
            return
        }

        setLoading(true)
        try {
            const result = await clearDailyLogs()
            if (!result.success) {
                alert('Failed to clear logs: ' + result.error)
            } else {
                alert(result.message || 'Successfully cleared today\'s logs')
                // Force full page reload to update UI
                window.location.reload()
            }
        } catch (error) {
            console.error(error)
            alert('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            variant="destructive"
            size="sm"
            onClick={handleClear}
            disabled={loading}
            className="ml-auto"
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
            Clear Today's Logs
        </Button>
    )
}
