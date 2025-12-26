import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Dropdown } from '../components/ui/Dropdown';
import { AuthLayout } from '../components/auth/AuthLayout';
import { useTheme } from '../contexts/ThemeContext';
import { authAPI } from '../services/api';

export default function Register() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('WORKER');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { theme } = useTheme();

    const roleOptions = [
        { value: 'WORKER', label: 'Worker (Find Work)' },
        { value: 'CLIENT', label: 'Client (Post Tasks)' }
    ];

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

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await authAPI.register({
                name,
                email,
                password,
                role
            });

            const { access_token } = response.data;

            if (!access_token) {
                throw new Error('No access token received');
            }

            localStorage.setItem('token', access_token);

            // Decode JWT to get user data
            const decoded = decodeJWT(access_token);

            if (decoded) {
                localStorage.setItem('userId', decoded.sub);
                localStorage.setItem('userRole', decoded.role);
                localStorage.setItem('userName', decoded.name || decoded.email || name);
            }

            toast.success('Account created successfully! Welcome aboard.');
            navigate('/dashboard');
        } catch (error: any) {
            console.error('Registration failed:', error);
            toast.error(error.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Create an Account"
            subtitle="Join us to start managing your tasks."
        >
            <form onSubmit={handleRegister} className="space-y-5">
                <div className="space-y-2">
                    <label className={`block text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                        }`} htmlFor="name">
                        Name
                    </label>
                    <Input
                        id="name"
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>
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
                    <label className={`block text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                        }`} htmlFor="role">
                        Account Type
                    </label>
                    <Dropdown
                        value={role}
                        onChange={setRole}
                        options={roleOptions}
                        placeholder="Select account type"
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

                <Button className="w-full font-semibold text-sm h-12 mt-2" type="submit" disabled={loading}>
                    {loading ? 'Creating account...' : 'Sign Up'}
                </Button>

                <p className={`text-center text-sm pt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Already have an account?{' '}
                    <Link to="/login" className={`font-semibold transition-colors ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                        }`}>
                        Log in
                    </Link>
                </p>
            </form>
        </AuthLayout>
    );
}
