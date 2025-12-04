import { getRecentLogs } from '@/app/actions/kiosk'
import { ClearLogsButton } from './ClearLogsButton'

export async function ActionLog({ role }: { role?: 'student' | 'employee' }) {
    const logs = await getRecentLogs(role)

    return (
        <div className="border-2 border-amber-100 rounded-3xl p-4 h-64 overflow-y-auto bg-amber-50/50 shadow-inner">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-amber-50/95 backdrop-blur-sm pb-2 border-b border-amber-200 z-10">
                <h3 className="font-bold text-lg text-amber-800 flex items-center gap-2">
                    <span className="text-xl">📝</span> Daily Diary
                </h3>
                <ClearLogsButton />
            </div>
            <div className="space-y-3">
                {logs.length === 0 ? (
                    <div className="text-center py-8 text-amber-800/50 italic">
                        No activity yet today...
                    </div>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} className="text-sm bg-white p-3 rounded-xl border border-amber-100 shadow-sm flex justify-between items-center transform transition-all hover:scale-[1.02]">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-amber-300" />
                                <span className="font-bold text-slate-700">
                                    {(() => {
                                        if (!log.people) return 'Unknown'
                                        if (Array.isArray(log.people)) return log.people[0]?.full_name || 'Unknown'
                                        return log.people.full_name
                                    })()}
                                </span>
                                <span className="text-slate-500 font-medium">
                                    {formatEvent(log.event_type)}
                                </span>
                            </div>
                            <span className="text-xs font-mono text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                                {new Date(log.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
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
