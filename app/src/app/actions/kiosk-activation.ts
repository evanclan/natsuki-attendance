'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const KIOSK_ACTIVATION_PASSWORD = process.env.KIOSK_ACTIVATION_PASSWORD || 'natsuki-kiosk-secure'
const COOKIE_NAME = 'kiosk_device_activated'

export async function activateKiosk(formData: FormData) {
    const password = formData.get('password') as string

    if (password === KIOSK_ACTIVATION_PASSWORD) {
        (await cookies()).set(COOKIE_NAME, 'true', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 365 * 10, // 10 years
            path: '/',
        })
        return { success: true }
    } else {
        return { success: false, message: 'Invalid activation password' }
    }
}
