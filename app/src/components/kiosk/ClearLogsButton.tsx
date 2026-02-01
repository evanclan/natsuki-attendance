'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { clearDailyLogs } from '@/app/actions/kiosk'
import { Trash2, Loader2 } from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

export function ClearLogsButton() {
    // TEMPORARY: Hide button during production to prevent accidental clicks
    // Remove this line to restore the button
    return null;

    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)

    const handleClear = async () => {
        setLoading(true)
        try {
            const result = await clearDailyLogs()
            if (!result.success) {
                toast.error('Failed to clear logs', {
                    description: result.error
                })
            } else {
                toast.success('Logs Cleared', {
                    description: result.message || "Today's logs have been successfully cleared."
                })
                setOpen(false)
                router.refresh()
            }
        } catch (error) {
            console.error(error)
            toast.error('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button
                    variant="destructive"
                    size="sm"
                    className="ml-auto"
                >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear Today's Logs
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-white">
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete ALL attendance data and checked-in status for TODAY.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault()
                            handleClear()
                        }}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Continue
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
