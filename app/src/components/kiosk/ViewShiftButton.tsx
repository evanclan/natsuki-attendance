'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Calendar } from 'lucide-react'
import { getAllEmployees } from '@/app/actions/kiosk'

export function ViewShiftButton() {
    const router = useRouter()
    const [employees, setEmployees] = useState<{ id: string; full_name: string; code: string }[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState<string>('')

    useEffect(() => {
        const fetchEmployees = async () => {
            const data = await getAllEmployees()
            setEmployees(data)
        }
        fetchEmployees()
    }, [])

    const handleEmployeeSelect = (employeeId: string) => {
        setSelectedEmployee(employeeId)
        router.push(`/kiosk/employee/shift?id=${employeeId}`)
    }

    return (
        <div className={`z-50 ${isOpen ? '' : ''}`}>
            {!isOpen ? (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-14 px-6 text-base shadow-lg hover:shadow-xl transition-shadow"
                    size="lg"
                >
                    <Calendar className="h-5 w-5 mr-2" />
                    View Shift
                </Button>
            ) : (
                <div className="bg-white rounded-lg shadow-xl p-4 min-w-[280px]">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-sm">Select Employee</h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsOpen(false)}
                            className="h-6 px-2"
                        >
                            ✕
                        </Button>
                    </div>
                    <Select value={selectedEmployee} onValueChange={handleEmployeeSelect}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose an employee..." />
                        </SelectTrigger>
                        <SelectContent>
                            {employees.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                    {emp.full_name} ({emp.code})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>
    )
}
