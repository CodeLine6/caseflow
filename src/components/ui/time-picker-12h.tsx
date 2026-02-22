'use client'

import { useEffect, useState } from 'react'

interface TimePicker12hProps {
    value: string // 24h format "HH:mm" e.g. "14:30"
    onChange: (value: string) => void // returns 24h format "HH:mm"
    className?: string
}

/**
 * A 12-hour time picker with hour, minute, and AM/PM selectors.
 * Accepts and returns values in 24-hour "HH:mm" format for storage compatibility.
 */
export function TimePicker12h({ value, onChange, className }: TimePicker12hProps) {
    const [hour12, setHour12] = useState('12')
    const [minute, setMinute] = useState('00')
    const [period, setPeriod] = useState<'AM' | 'PM'>('AM')

    // Parse incoming 24h value into 12h components
    useEffect(() => {
        if (!value) return
        const match = value.match(/^(\d{1,2}):(\d{2})/)
        if (!match) return
        let h = parseInt(match[1])
        const m = match[2]
        const p = h >= 12 ? 'PM' : 'AM'
        h = h % 12 || 12
        setHour12(h.toString())
        setMinute(m)
        setPeriod(p as 'AM' | 'PM')
    }, []) // Only parse on mount to avoid overwriting user edits

    // Convert 12h selection back to 24h and call onChange
    const emitChange = (h: string, m: string, p: string) => {
        let hour24 = parseInt(h)
        if (p === 'AM' && hour24 === 12) hour24 = 0
        if (p === 'PM' && hour24 !== 12) hour24 += 12
        const hh = hour24.toString().padStart(2, '0')
        onChange(`${hh}:${m}`)
    }

    const handleHourChange = (h: string) => {
        setHour12(h)
        emitChange(h, minute, period)
    }

    const handleMinuteChange = (m: string) => {
        setMinute(m)
        emitChange(hour12, m, period)
    }

    const handlePeriodChange = (p: string) => {
        setPeriod(p as 'AM' | 'PM')
        emitChange(hour12, minute, p)
    }

    const selectClass = 'px-2 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer'

    return (
        <div className={`flex items-center gap-1.5 ${className || ''}`}>
            {/* Hour */}
            <select
                value={hour12}
                onChange={(e) => handleHourChange(e.target.value)}
                className={`${selectClass} w-[60px] text-center`}
                aria-label="Hour"
            >
                {Array.from({ length: 12 }, (_, i) => {
                    const h = i + 1
                    return (
                        <option key={h} value={h.toString()}>
                            {h}
                        </option>
                    )
                })}
            </select>

            <span className="text-lg font-bold text-muted-foreground">:</span>

            {/* Minute */}
            <select
                value={minute}
                onChange={(e) => handleMinuteChange(e.target.value)}
                className={`${selectClass} w-[60px] text-center`}
                aria-label="Minute"
            >
                {Array.from({ length: 60 }, (_, i) => {
                    const m = i.toString().padStart(2, '0')
                    return (
                        <option key={m} value={m}>
                            {m}
                        </option>
                    )
                })}
            </select>

            {/* AM/PM */}
            <select
                value={period}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className={`${selectClass} w-[60px] text-center font-medium`}
                aria-label="AM or PM"
            >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
            </select>
        </div>
    )
}
