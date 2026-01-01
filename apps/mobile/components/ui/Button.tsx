import { TouchableOpacity, Text, TouchableOpacityProps, ActivityIndicator } from 'react-native';
import { forwardRef } from 'react';

interface ButtonProps extends TouchableOpacityProps {
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'default' | 'sm' | 'lg';
    loading?: boolean;
    children: React.ReactNode;
}

export const Button = forwardRef<TouchableOpacity, ButtonProps>(
    ({ className, variant = 'default', size = 'default', loading, children, disabled, ...props }, ref) => {
        const baseStyles = "flex-row items-center justify-center rounded-2xl";

        const variants = {
            default: "bg-slate-900",
            outline: "border-2 border-slate-900 bg-transparent",
            ghost: "bg-transparent",
        };

        const variantsDark = {
            default: "bg-white",
            outline: "border-2 border-white bg-transparent",
            ghost: "bg-transparent",
        };

        const sizes = {
            default: "h-14 px-6",
            sm: "h-11 px-4",
            lg: "h-16 px-8",
        };

        const textStyles = {
            default: "text-white font-semibold text-base",
            outline: "text-slate-900 font-semibold text-base",
            ghost: "text-slate-900 font-medium text-base",
        };

        const textStylesDark = {
            default: "text-slate-900 font-semibold text-base",
            outline: "text-white font-semibold text-base",
            ghost: "text-white font-medium text-base",
        };

        const isDisabled = disabled || loading;

        return (
            <TouchableOpacity
                ref={ref}
                className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
                disabled={isDisabled}
                activeOpacity={0.8}
                {...props}
            >
                {loading ? (
                    <ActivityIndicator color={variant === 'default' ? 'white' : '#1e293b'} />
                ) : (
                    <Text className={textStyles[variant]}>{children}</Text>
                )}
            </TouchableOpacity>
        );
    }
);
