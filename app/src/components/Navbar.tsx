import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/server'
import { logout } from '@/app/login/actions'

export async function Navbar() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    return (
        <nav className="border-b bg-white">
            <div className="flex h-16 items-center px-4 container mx-auto">
                <div className="mr-4 hidden md:flex">
                    <Link href="/" className="mr-6 flex items-center space-x-2">
                        <Image
                            src="/logo.png"
                            alt="Natsuki Attendance"
                            width={180}
                            height={50}
                            className="hidden sm:inline-block object-contain h-10 w-auto"
                            priority
                        />
                    </Link>
                    <nav className="flex items-center space-x-6 text-sm font-medium">
                        <Link
                            href="/kiosk"
                            className="transition-colors hover:text-foreground/80 text-foreground/60"
                        >
                            Kiosk
                        </Link>
                        {user && (
                            <Link
                                href="/admin"
                                className="transition-colors hover:text-foreground/80 text-foreground/60"
                            >
                                Admin
                            </Link>
                        )}
                    </nav>
                </div>
                <div className="ml-auto flex items-center space-x-4">
                    {user ? (
                        <>
                            <span className="text-sm text-muted-foreground">
                                {user.email}
                            </span>
                            <form action={logout}>
                                <Button variant="outline" type="submit">
                                    Logout
                                </Button>
                            </form>
                        </>
                    ) : (
                        <Button variant="ghost" asChild>
                            <Link href="/login">Login</Link>
                        </Button>
                    )}
                </div>
            </div>
        </nav >
    )
}

