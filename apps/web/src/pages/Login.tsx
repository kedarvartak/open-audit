import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
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
    const { theme } = useTheme();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await authAPI.login(email, password);
            console.log('Login response:', response.data);

            const { access_token, user } = response.data;

            localStorage.setItem('token', access_token);

            if (user) {
                localStorage.setItem('userId', user.id);
                localStorage.setItem('userRole', user.role);
                localStorage.setItem('userName', user.name);
            }

            navigate('/dashboard');
        } catch (error: any) {
            console.error('Login failed:', error);
            alert(error.response?.data?.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Get Started Now"
            subtitle="Please log in to your account to continue."
        >
            <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                    <label className={`block text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                        }`} htmlFor="email">
                        Email address
                    </label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="workmail@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className={`block text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                            }`} htmlFor="password">
                            Password
                        </label>
                        <Link to="#" className={`text-xs font-medium transition-colors ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                            }`}>
                            Forgot Password?
                        </Link>
                    </div>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                    <input
                        type="checkbox"
                        id="terms"
                        className={`w-4 h-4 rounded text-blue-600 focus:ring-blue-500 focus:ring-offset-0 transition-colors cursor-pointer ${theme === 'dark' ? 'border-slate-600 bg-slate-700' : 'border-slate-300 bg-white'
                            }`}
                    />
                    <label htmlFor="terms" className={`text-xs cursor-pointer ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                        I agree to the <Link to="#" className={`font-medium ${theme === 'dark' ? 'text-blue-400 hover:underline' : 'text-blue-600 hover:underline'
                            }`}>Terms & Privacy</Link>
                    </label>
                </div>

                <Button className="w-full font-semibold text-sm h-12 mt-2" type="submit" disabled={loading}>
                    {loading ? 'Logging in...' : 'Log in'}
                </Button>

                <p className={`text-center text-sm pt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Don't have an account?{' '}
                    <Link to="/register" className={`font-semibold transition-colors ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                        }`}>
                        Sign up
                    </Link>
                </p>
            </form>
        </AuthLayout>
    );
}
