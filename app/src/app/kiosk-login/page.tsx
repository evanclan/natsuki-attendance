'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Lock } from 'lucide-react'
import { activateKiosk } from '@/app/actions/kiosk-activation'
import { toast } from 'sonner'

export default function KioskLoginPage() {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const result = await activateKiosk(formData)

        if (result.success) {
            toast.success('Device activated for Kiosk Mode')
            router.push('/kiosk') // Refund to main kiosk
            router.refresh()
        } else {
            toast.error(result.message)
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mb-4">
                        <Lock className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Kiosk Device Activation</CardTitle>
                    <CardDescription>
                        Enter activation password to authorize this device as an official kiosk.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="password"
                                name="password"
                                placeholder="Activation Password"
                                required
                                className="text-center text-lg tracking-widest"
                                autoFocus
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full h-12 text-lg"
                            disabled={loading}
                        >
                            {loading ? 'Activating...' : 'Activate Device'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
