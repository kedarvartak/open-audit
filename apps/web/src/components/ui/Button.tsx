import * as React from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

const buttonVariants = {
    default: "bg-[#464ace] text-white hover:bg-[#3d42b8] active:scale-[0.98]",
    destructive: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20 active:scale-[0.98]",
    outline: "border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 active:scale-[0.98]",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 active:scale-[0.98]",
    ghost: "hover:bg-slate-100 hover:text-slate-900",
    link: "text-blue-600 underline-offset-4 hover:underline",
}

const buttonSizes = {
    default: "h-12 px-6 py-3 rounded-md",
    sm: "h-10 px-4 rounded-md",
    lg: "h-14 px-8 rounded-md text-lg",
    icon: "h-12 w-12 rounded-md",
}

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: keyof typeof buttonVariants
    size?: keyof typeof buttonSizes
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", ...props }, ref) => {
        return (
            <button
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                    buttonVariants[variant],
                    buttonSizes[size],
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
