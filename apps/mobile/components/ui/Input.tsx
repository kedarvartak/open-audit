import { TextInput, TextInputProps, View, Text, TouchableOpacity } from 'react-native';
import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react-native';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    isPassword?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(
    ({ className, label, error, isPassword, ...props }, ref) => {
        const [showPassword, setShowPassword] = useState(false);

        return (
            <View className="gap-3">
                {label && (
                    <Text className="text-sm font-medium text-slate-700">
                        {label}
                    </Text>
                )}
                <View className="flex-row items-center h-14 rounded-2xl border-2 border-slate-200 bg-slate-50 px-4">
                    <TextInput
                        ref={ref}
                        placeholderTextColor="#94a3b8"
                        secureTextEntry={isPassword && !showPassword}
                        className={`flex-1 text-lg text-slate-900 h-full ${className}`}
                        style={{ textAlignVertical: 'center', paddingVertical: 0, includeFontPadding: false }}
                        {...props}
                    />
                    {isPassword && (
                        <TouchableOpacity
                            onPress={() => setShowPassword(!showPassword)}
                            className="ml-2 p-1"
                        >
                            {showPassword ? (
                                <EyeOff size={20} color="#64748b" />
                            ) : (
                                <Eye size={20} color="#64748b" />
                            )}
                        </TouchableOpacity>
                    )}
                </View>
                {error && <Text className="text-red-500 text-xs">{error}</Text>}
            </View>
        );
    }
);
