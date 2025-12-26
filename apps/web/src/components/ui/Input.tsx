import * as React from "react"
import { cn } from "../../lib/utils"
import { useTheme } from "../../contexts/ThemeContext"

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        const { theme } = useTheme();

        return (
            <input
                type={type}
                className={cn(
                    `flex h-12 w-full rounded-md border px-4 py-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 ${theme === 'dark'
                        ? 'border-slate-600 bg-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:border-blue-500'
                        : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-blue-500'
                    }`,
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"

export { Input }
