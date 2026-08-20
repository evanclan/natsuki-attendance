'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronLeft, ChevronRight, ClipboardList, RefreshCw, Users } from 'lucide-react'
import {
    getPreferredRestApplicants,
    PreferredRestApplicant,
    PreferredRestNonApplicant,
} from '@/app/admin/settings/deadline/actions'

/**
 * Read-only list of everyone who submitted a preferred rest day for a month.
 * Employees submit for the *next* month, so that is the default view.
 */
export default function PreferredRestApplicants() {
    const today = new Date()
    const [currentDate, setCurrentDate] = useState(
        new Date(today.getFullYear(), today.getMonth() + 1, 1)
    )
    const [applicants, setApplicants] = useState<PreferredRestApplicant[]>([])
    const [notApplied, setNotApplied] = useState<PreferredRestNonApplicant[]>([])
    const [totalActive, setTotalActive] = useState(0)
    const [totalRequests, setTotalRequests] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showNotApplied, setShowNotApplied] = useState(false)
    const [reloadKey, setReloadKey] = useState(0)

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    useEffect(() => {
        // Guards against a stale response landing after a rapid month change
        let cancelled = false

        const run = async () => {
            const result = await getPreferredRestApplicants(year, month)
            if (cancelled) return

            if (result.success && result.data) {
                setApplicants(result.data.applicants)
                setNotApplied(result.data.notApplied)
                setTotalActive(result.data.totalActiveEmployees)
                setTotalRequests(result.data.totalRequests)
                setError(null)
            } else {
                setApplicants([])
                setNotApplied([])
                setTotalActive(0)
                setTotalRequests(0)
                setError(result.error || 'Failed to load applicants')
            }

            setLoading(false)
        }

        run()

        return () => {
            cancelled = true
        }
    }, [year, month, reloadKey])

    const goToMonth = (delta: number) => {
        setLoading(true)
        setCurrentDate(new Date(year, month + delta, 1))
    }

    const refresh = () => {
        setLoading(true)
        setReloadKey((key) => key + 1)
    }

    const monthLabel = currentDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
    })

    const formatDay = (dateStr: string) => {
        // dateStr is YYYY-MM-DD; parse manually to avoid UTC shifting the day
        const [y, m, d] = dateStr.split('-').map(Number)
        const date = new Date(y, m - 1, d)
        const weekday = date.toLocaleDateString('en-US', { weekday: 'short' })
        return `${d} (${weekday})`
    }

    const formatSubmittedAt = (value: string | null) => {
        if (!value) return '—'
        const date = new Date(value)
        if (isNaN(date.getTime())) return '—'
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Tokyo',
        })
    }

    return (
        <Card className="mt-6">
            <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <ClipboardList className="h-5 w-5" />
                            Preferred Rest Applications
                        </CardTitle>
                        <CardDescription>
                            Everyone who submitted a preferred rest day for the selected month.
                        </CardDescription>
                    </div>

                    <div className="flex items-center gap-1 self-start">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToMonth(-1)}
                            aria-label="Previous month"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="min-w-[9.5rem] text-center text-sm font-medium">
                            {monthLabel}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToMonth(1)}
                            aria-label="Next month"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={refresh}
                            disabled={loading}
                            aria-label="Refresh"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>
                        <span className="font-semibold text-foreground">{applicants.length}</span>
                        {totalActive > 0 && <> of {totalActive}</>} applied
                    </span>
                    <span className="text-muted-foreground/50">•</span>
                    <span>
                        <span className="font-semibold text-foreground">{totalRequests}</span>{' '}
                        {totalRequests === 1 ? 'day' : 'days'} requested in total
                    </span>
                </div>

                {error && (
                    <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {error}
                    </p>
                )}

                {loading ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
                ) : applicants.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        No one has applied for a preferred rest day in {monthLabel}.
                    </p>
                ) : (
                    <div className="overflow-x-auto rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead className="w-[70px] text-center">Days</TableHead>
                                    <TableHead>Requested Dates</TableHead>
                                    <TableHead className="w-[130px]">Last Submitted</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {applicants.map((applicant) => (
                                    <TableRow key={applicant.personId}>
                                        <TableCell className="align-top">
                                            <div className="font-medium">{applicant.fullName}</div>
                                            {applicant.japaneseName && (
                                                <div className="text-xs text-muted-foreground">
                                                    {applicant.japaneseName}
                                                </div>
                                            )}
                                            <div className="text-xs text-muted-foreground">
                                                {applicant.code || '—'}
                                                {!applicant.isActiveEmployee && (
                                                    <span className="ml-1 text-amber-600">(inactive)</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center align-top font-semibold">
                                            {applicant.days.length}
                                        </TableCell>
                                        <TableCell className="align-top">
                                            <div className="flex flex-wrap gap-1.5">
                                                {applicant.days.map((day) => (
                                                    <Badge
                                                        key={day.date}
                                                        variant="secondary"
                                                        className="font-normal"
                                                        title={day.memo || undefined}
                                                    >
                                                        {formatDay(day.date)}
                                                        {day.memo && (
                                                            <span className="ml-1 text-muted-foreground">
                                                                · {day.memo}
                                                            </span>
                                                        )}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="align-top text-xs text-muted-foreground">
                                            {formatSubmittedAt(applicant.lastSubmittedAt)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {!loading && notApplied.length > 0 && (
                    <div className="rounded-md border border-dashed p-3">
                        <button
                            type="button"
                            onClick={() => setShowNotApplied((v) => !v)}
                            className="text-sm font-medium text-muted-foreground hover:text-foreground"
                        >
                            {showNotApplied ? '▾' : '▸'} Not yet submitted ({notApplied.length})
                        </button>
                        {showNotApplied && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {notApplied.map((person) => (
                                    <Badge
                                        key={person.personId}
                                        variant="outline"
                                        className="font-normal"
                                    >
                                        {person.fullName}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
