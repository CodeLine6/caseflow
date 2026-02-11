'use client'

import * as React from 'react'
import { Check, X, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'

interface MultiSelectProps {
    options: { label: string; value: string; role?: string }[]
    value: string[]
    onValueChange: (value: string[]) => void
    placeholder?: string
    className?: string
}

export function MultiSelect({
    options,
    value,
    onValueChange,
    placeholder,
    className,
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false)

    const handleSelect = (optionValue: string) => {
        const newValue = value.includes(optionValue)
            ? value.filter((item) => item !== optionValue)
            : [...value, optionValue]
        onValueChange(newValue)
    }

    const handleRemove = (optionValue: string) => {
        const newValue = value.filter((item) => item !== optionValue)
        onValueChange(newValue)
    }

    const selectedOptions = options.filter((option) => value.includes(option.value))

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn('w-full justify-between h-auto min-h-10', className)}
                >
                    <div className="flex flex-wrap gap-1">
                        {selectedOptions.length > 0 ? (
                            selectedOptions.map((option) => (
                                <Badge key={option.value} className="px-2 py-0.5 flex items-center gap-1 text-xs">
                                    {option.label}
                                    <X
                                        className="h-3 w-3 cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleRemove(option.value)
                                        }}
                                    />
                                </Badge>
                            ))
                        ) : (
                            <span className="text-muted-foreground text-sm">{placeholder || 'Select...'}</span>
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-1 max-h-60 overflow-y-auto">
                {options.map((option) => (
                    <div
                        key={option.value}
                        onClick={() => handleSelect(option.value)}
                        className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm transition-colors',
                            'hover:bg-accent hover:text-accent-foreground',
                            option.role === 'INTERN' ? 'bg-amber-500/10' : ''
                        )}
                    >
                        <div className={cn(
                            'h-4 w-4 border rounded flex items-center justify-center transition-colors',
                            value.includes(option.value)
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'border-muted-foreground/30'
                        )}>
                            {value.includes(option.value) && <Check className="h-3 w-3" />}
                        </div>
                        <span>{option.label}</span>
                        {option.role === 'INTERN' && (
                            <span className="text-xs text-amber-600 dark:text-amber-400">(Intern)</span>
                        )}
                    </div>
                ))}
                {options.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                        No options available
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}
