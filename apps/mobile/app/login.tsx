import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Animated, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';
import { ChevronLeft } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../contexts/AuthContext';

type Step = 'email' | 'password';

export default function Login() {
    const { login } = useAuth();
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('worker@test.com');
    const [password, setPassword] = useState('password123');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const animateTransition = (callback: () => void) => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            callback();
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }).start();
        });
    };

    const handleContinue = async () => {
        setError('');

        if (step === 'email') {
            if (!email.trim()) return;
            animateTransition(() => setStep('password'));
        } else {
            if (!password.trim()) return;
            setLoading(true);
            try {
                await login(email, password);
                // Navigation happens in AuthContext
            } catch (err: any) {
                const message = err.response?.data?.message || 'Login failed. Please try again.';
                setError(message);
                Alert.alert('Login Failed', message);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleBack = () => {
        if (step === 'password') {
            animateTransition(() => setStep('email'));
        } else {
            router.back();
        }
    };

    const getStepContent = () => {
        switch (step) {
            case 'email':
                return {
                    title: 'Welcome Back!',
                    subtitle: 'Access your account using your email',
                    label: 'Enter Your Email',
                    placeholder: 'name@example.com',
                    value: email,
                    onChangeText: setEmail,
                    keyboardType: 'email-address' as const,
                    autoComplete: 'email' as const,
                };
            case 'password':
                return {
                    title: 'Enter Password',
                    subtitle: `Signing in as ${email}`,
                    label: 'Enter Your Password',
                    placeholder: '••••••••',
                    value: password,
                    onChangeText: setPassword,
                    isPassword: true,
                    autoComplete: 'password' as const,
                };
        }
    };

    const content = getStepContent();
    const isButtonDisabled = step === 'email' ? !email.trim() : !password.trim();

    return (
        <SafeAreaView className="flex-1 bg-white">
            <StatusBar style="dark" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <View className="flex-1 px-6">
                    {/* Header */}
                    <View className="flex-row items-center justify-between py-4">
                        <TouchableOpacity
                            onPress={handleBack}
                            className="w-10 h-10 rounded-full items-center justify-center bg-slate-100"
                        >
                            <ChevronLeft size={24} color="#1e293b" />
                        </TouchableOpacity>

                        <Logo width={36} height={36} />
                    </View>

                    {/* Content */}
                    <Animated.View style={{ opacity: fadeAnim }} className="flex-1 pt-8">
                        <View className="gap-2 mb-10">
                            <Text className="text-3xl font-bold text-slate-900">
                                {content.title}
                            </Text>
                            <Text className="text-base text-slate-500">
                                {content.subtitle}
                            </Text>
                        </View>

                        <View className="gap-6">
                            <Input
                                label={content.label}
                                placeholder={content.placeholder}
                                value={content.value}
                                onChangeText={content.onChangeText}
                                keyboardType={content.keyboardType}
                                autoComplete={content.autoComplete}
                                isPassword={content.isPassword}
                                autoFocus
                            />
                        </View>
                    </Animated.View>

                    {/* Bottom Section */}
                    <View className="pb-8 gap-4">
                        <Button
                            onPress={handleContinue}
                            loading={loading}
                            disabled={isButtonDisabled}
                            className={isButtonDisabled ? 'opacity-50' : ''}
                        >
                            Continue
                        </Button>

                        {step === 'email' && (
                            <View className="flex-row justify-center items-center gap-1">
                                <Text className="text-sm text-slate-500">
                                    Don't have an account?
                                </Text>
                                <Link href="/register" asChild>
                                    <TouchableOpacity>
                                        <Text className="font-bold text-slate-900 text-sm">
                                            Sign up
                                        </Text>
                                    </TouchableOpacity>
                                </Link>
                            </View>
                        )}
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
