import React from 'react';
import { View, Text, ScrollView, useColorScheme, SafeAreaView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle: string;
}

export const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <View className="flex-1 bg-[#464ace]">
            <StatusBar style="light" />
            <SafeAreaView className="flex-1">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    {/* Brand Header */}
                    <View className="px-6 pt-8 pb-10">
                        <View className="flex-row items-center gap-3">
                            <View className="w-10 h-10 bg-white/20 rounded-xl items-center justify-center">
                                <Text className="text-white text-xl font-bold">O</Text>
                            </View>
                            <View>
                                <Text className="text-white text-xl font-bold">Open-Audit</Text>
                                <Text className="text-indigo-200 text-xs">Transparent Public Works</Text>
                            </View>
                        </View>
                    </View>

                    {/* Form Card */}
                    <View className={`flex-1 rounded-t-3xl ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                        <ScrollView
                            contentContainerStyle={{ flexGrow: 1, padding: 24 }}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            <View className="gap-8">
                                <View className="gap-2 pt-2">
                                    <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                        {title}
                                    </Text>
                                    <Text className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {subtitle}
                                    </Text>
                                </View>

                                {children}
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
};
