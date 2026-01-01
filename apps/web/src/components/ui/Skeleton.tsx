import { cn } from "../../lib/utils";
import { useTheme } from "../../contexts/ThemeContext";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Skeleton({ className, ...props }: SkeletonProps) {
    const { theme } = useTheme();

    return (
        <div
            className={cn(
                "animate-pulse rounded-md",
                theme === 'dark' ? "bg-slate-800" : "bg-slate-200",
                className
            )}
            {...props}
        />
    );
}
