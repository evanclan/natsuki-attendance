import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays, ArrowLeft, MapPin, Users, Palette } from 'lucide-react'

export default function SettingsPage() {
    return (
        <div className="container mx-auto py-8">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/admin">
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Dashboard
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">Settings</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Link href="/admin/settings/calendar">
                    <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarDays className="h-5 w-5" />
                                Set Calendar
                            </CardTitle>
                            <CardDescription>
                                Manage system holidays and company events
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Configure global holidays and events that will appear on all employee shift calendars.
                            </p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/admin/settings/locations">
                    <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="h-5 w-5" />
                                Manage Locations
                            </CardTitle>
                            <CardDescription>
                                Add and manage shift locations
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Configure available locations for work shifts and business trips.
                            </p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/admin/settings/categories">
                    <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Employee Categories
                            </CardTitle>
                            <CardDescription>
                                Manage employee categories
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Add and manage employee categories like Fulltime, Parttime, etc.
                            </p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/admin/settings/news">
                    <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <span className="text-xl">📰</span>
                                Announcements
                            </CardTitle>
                            <CardDescription>
                                Manage announcements for Kiosks
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Add and manage announcements for Student and Employee kiosks.
                            </p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/admin/settings/legends">
                    <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Palette className="h-5 w-5" />
                                Legend Creation
                            </CardTitle>
                            <CardDescription>
                                Manage shift color legends
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Create color legends for shift location changes (From X to Y).
                            </p>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    )
}
