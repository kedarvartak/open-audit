import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';
import { ChevronLeft } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

type Step = 'name' | 'email' | 'password';

export default function Register() {
    const [step, setStep] = useState<Step>('name');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
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
        if (step === 'name') {
            if (!name.trim()) return;
            animateTransition(() => setStep('email'));
        } else if (step === 'email') {
            if (!email.trim()) return;
            animateTransition(() => setStep('password'));
        } else {
            if (!password.trim()) return;
            setLoading(true);
            try {
                await new Promise(resolve => setTimeout(resolve, 1000));
                router.replace('/dashboard');
            } catch (error) {
                console.error('Registration failed:', error);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleBack = () => {
        if (step === 'password') {
            animateTransition(() => setStep('email'));
        } else if (step === 'email') {
            animateTransition(() => setStep('name'));
        } else {
            router.back();
        }
    };

    const getStepContent = () => {
        switch (step) {
            case 'name':
                return {
                    title: 'Create Account',
                    subtitle: 'Let\'s start with your name',
                    label: 'Enter Your Name',
                    placeholder: 'John Doe',
                    value: name,
                    onChangeText: setName,
                    autoComplete: 'name' as const,
                };
            case 'email':
                return {
                    title: `Hi, ${name.split(' ')[0]}!`,
                    subtitle: 'Now enter your email address',
                    label: 'Enter Your Email',
                    placeholder: 'name@example.com',
                    value: email,
                    onChangeText: setEmail,
                    keyboardType: 'email-address' as const,
                    autoComplete: 'email' as const,
                };
            case 'password':
                return {
                    title: 'Secure Your Account',
                    subtitle: 'Create a strong password',
                    label: 'Create Password',
                    placeholder: '••••••••',
                    value: password,
                    onChangeText: setPassword,
                    isPassword: true,
                    autoComplete: 'password' as const,
                };
        }
    };

    const content = getStepContent();
    const isButtonDisabled =
        (step === 'name' && !name.trim()) ||
        (step === 'email' && !email.trim()) ||
        (step === 'password' && !password.trim());

    const getStepIndicator = () => {
        const steps = ['name', 'email', 'password'];
        const currentIndex = steps.indexOf(step);
        return (
            <View className="flex-row gap-2 mb-6">
                {steps.map((s, index) => (
                    <View
                        key={s}
                        className={`h-1 flex-1 rounded-full ${index <= currentIndex ? 'bg-slate-900' : 'bg-slate-200'
                            }`}
                    />
                ))}
            </View>
        );
    };

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
                        {getStepIndicator()}

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
                            {step === 'password' ? 'Create Account' : 'Continue'}
                        </Button>

                        {step === 'name' && (
                            <View className="flex-row justify-center items-center gap-1">
                                <Text className="text-sm text-slate-500">
                                    Already have an account?
                                </Text>
                                <Link href="/login" asChild>
                                    <TouchableOpacity>
                                        <Text className="font-bold text-slate-900 text-sm">
                                            Sign in
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
