import { getRecentLogs } from '@/app/actions/kiosk'
import { ClearLogsButton } from './ClearLogsButton'

export async function ActionLog({ role }: { role?: 'student' | 'employee' }) {
    const logs = await getRecentLogs(role)

    return (
        <div className="border rounded-lg p-4 h-64 overflow-y-auto bg-slate-50 shadow-inner">
            <div className="flex justify-between items-center mb-2 sticky top-0 bg-slate-50 pb-2 border-b z-10">
                <h3 className="font-semibold text-lg">Recent Activity</h3>
                <ClearLogsButton />
            </div>
            <div className="space-y-2">
                {logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No recent activity.</p>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} className="text-sm border-b border-slate-200 pb-1 last:border-0 flex justify-between items-center">
                            <div>
                                <span className="font-medium text-slate-900">
                                    {(() => {
                                        if (!log.people) return 'Unknown'
                                        if (Array.isArray(log.people)) return log.people[0]?.full_name || 'Unknown'
                                        return log.people.full_name
                                    })()}
                                </span>
                                <span className="mx-2 text-slate-500">
                                    {formatEvent(log.event_type)}
                                </span>
                            </div>
                            <span className="text-xs text-slate-400">
                                {new Date(log.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

function formatEvent(type: string) {
    switch (type) {
        case 'check_in': return 'checked IN'
        case 'check_out': return 'checked OUT'
        case 'break_start': return 'started BREAK'
        case 'break_end': return 'ended BREAK'
        case 'mark_absent': return 'marked ABSENT'
        default: return type.replace('_', ' ')
    }
}
