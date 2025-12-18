import { getTodaySchedule } from './actions'
import { getNews } from '@/app/actions/news'

export const dynamic = 'force-dynamic'

function formatTime(timeStr?: string) {
    if (!timeStr) return ''
    // Assuming timeStr is HH:mm:ss or HH:mm
    return timeStr.substring(0, 5)
}

function formatShiftType(type: string) {
    if (!type) return ''
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

export default async function TodaysSchedulePage() {
    const { data, success } = await getTodaySchedule()

    if (!success || !data) {
        return <div className="p-8 text-center text-red-500">Failed to load schedule.</div>
    }

    const { date, events, shifts, people } = data

    const announcements = await getNews('employee')
    const todayAnnouncement = announcements.length > 0 ? announcements[0] : null

    // Format date: e.g. "Monday, January 1, 2024"
    const dateObj = new Date(date)
    const formattedDate = dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    const eventName = events.length > 0 ? events[0].title : null

    return (
        <div className="min-h-screen bg-gray-50 p-6 flex flex-col gap-6">
            {/* Header Section */}
            <header className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6 justify-between items-start">
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Today's Schedule</h1>
                    <p className="text-xl text-gray-500 font-medium">{formattedDate}</p>
                </div>

                <div className="flex-1 w-full md:w-auto bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <h2 className="text-sm font-semibold text-blue-800 uppercase tracking-wider mb-1">
                        Today's Event
                    </h2>
                    <p className="text-lg text-blue-900 font-medium">
                        {eventName ? `The event today is ${eventName}` : 'There is no event today.'}
                    </p>
                </div>

                <div className="flex-1 w-full md:w-auto bg-amber-50 rounded-lg p-4 border border-amber-100">
                    <h2 className="text-sm font-semibold text-amber-800 uppercase tracking-wider mb-1">
                        Today's Announcement
                    </h2>
                    {todayAnnouncement ? (
                        <div>
                            <p className="text-lg text-amber-900 font-medium mb-1">{todayAnnouncement.title}</p>
                            <p className="text-sm text-amber-800">{todayAnnouncement.description}</p>
                        </div>
                    ) : (
                        <p className="text-lg text-amber-900 font-medium">
                            No announcements for today.
                        </p>
                    )}
                </div>
            </header>

            {/* Schedule Table Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                <th className="p-5 font-semibold text-sm uppercase tracking-wider w-1/4">Employee Name</th>
                                <th className="p-5 font-semibold text-sm uppercase tracking-wider w-1/4">Shift Time</th>
                                <th className="p-5 font-semibold text-sm uppercase tracking-wider w-1/4">Location</th>
                                <th className="p-5 font-semibold text-sm uppercase tracking-wider w-1/4">Memo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {people.map((person) => {
                                const shift = shifts[person.id]

                                let shiftDisplay = '-'
                                let locationDisplay = ''
                                let memoDisplay = ''
                                let rowClass = 'hover:bg-gray-50'

                                if (shift) {
                                    const { shift_type, start_time, end_time, location, memo } = shift

                                    // Only show time for 'work' status, otherwise show the status text
                                    if (shift_type === 'work' && start_time && end_time) {
                                        shiftDisplay = `${formatTime(start_time)} - ${formatTime(end_time)}`
                                        locationDisplay = location || ''
                                    } else {
                                        shiftDisplay = formatShiftType(shift_type)
                                        // Location only relevant for work shifts
                                        if (shift_type === 'work') locationDisplay = location || ''
                                    }

                                    memoDisplay = memo || ''
                                }

                                return (
                                    <tr key={person.id} className={rowClass}>
                                        <td className="p-5 text-gray-900 font-medium">
                                            {person.full_name}
                                        </td>
                                        <td className="p-5 text-gray-700">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium
                                                ${shift?.shift_type === 'work' ? 'bg-green-100 text-green-800' :
                                                    shift?.shift_type === 'rest' ? 'bg-gray-100 text-gray-800' :
                                                        shift?.shift_type === 'absent' ? 'bg-red-100 text-red-800' :
                                                            'bg-blue-100 text-blue-800'}`}>
                                                {shiftDisplay}
                                            </span>
                                        </td>
                                        <td className="p-5 text-gray-600">
                                            {locationDisplay && (
                                                <div className="flex items-center gap-1.5">
                                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    {locationDisplay}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-5 text-gray-500 italic">
                                            {memoDisplay}
                                        </td>
                                    </tr>
                                )
                            })}

                            {people.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-10 text-center text-gray-500">
                                        No active employees found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
