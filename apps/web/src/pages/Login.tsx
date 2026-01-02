import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AuthLayout } from '../components/auth/AuthLayout';
import { useTheme } from '../contexts/ThemeContext';
import { authAPI } from '../services/api';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('client@test.com');
    const [password, setPassword] = useState('password123');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const { theme } = useTheme();

    useEffect(() => {
        const savedEmail = localStorage.getItem('rememberedEmail');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    }, []);

    // Decode JWT to extract user data
    const decodeJWT = (token: string) => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('Failed to decode JWT:', error);
            return null;
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await authAPI.login(email, password);
            console.log('Login response:', response.data);

            const { access_token } = response.data;

            if (!access_token) {
                throw new Error('No access token received');
            }

            localStorage.setItem('token', access_token);

            // Decode JWT to get user data
            const decoded = decodeJWT(access_token);
            console.log('Decoded JWT:', decoded);

            if (decoded) {
                localStorage.setItem('userId', decoded.sub); // 'sub' is the user ID
                localStorage.setItem('userRole', decoded.role);
                localStorage.setItem('userName', decoded.email || decoded.name || 'User');

                if (rememberMe) {
                    localStorage.setItem('rememberedEmail', email);
                } else {
                    localStorage.removeItem('rememberedEmail');
                }

                console.log('Saved to localStorage:', {
                    userId: decoded.sub,
                    userRole: decoded.role,
                    userName: decoded.email
                });
            }

            toast.success('Login successful! Welcome back.');
            navigate('/dashboard');
        } catch (error: any) {
            console.error('Login failed:', error);
            toast.error(error.response?.data?.message || 'Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Get Started Now"
            subtitle="Please log in to your account to continue."
        >
            <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                    <label className={`block text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                        }`} htmlFor="email">
                        Email address
                    </label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="font-medium"
                    />
                </div>
                <div className="space-y-2">
                    <label className={`block text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                        }`} htmlFor="password">
                        Password
                    </label>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="password123"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="pr-10 font-medium"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                    <input
                        type="checkbox"
                        id="terms"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className={`w-4 h-4 rounded text-[#464ace] focus:ring-[#464ace] focus:ring-offset-0 transition-colors cursor-pointer ${theme === 'dark' ? 'border-slate-600 bg-slate-700' : 'border-slate-300 bg-white'
                            }`}
                    />
                    <label htmlFor="terms" className={`text-sm cursor-pointer ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                        Remember me
                    </label>
                </div>

                <Button className="w-full font-bold text-base h-14 mt-4 shadow-lg shadow-blue-500/20" type="submit" disabled={loading}>
                    {loading ? 'Logging in...' : 'Log in'}
                </Button>

                <p className={`text-center text-sm pt-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Don't have an account?{' '}
                    <Link to="/register" className={`font-bold transition-colors ${theme === 'dark' ? 'text-[#464ace] hover:text-[#3d42b8]' : 'text-[#464ace] hover:text-[#3d42b8]'
                        }`}>
                        Sign up
                    </Link>
                </p>
            </form>
        </AuthLayout>
    );
}
