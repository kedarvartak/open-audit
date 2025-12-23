import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DatePicker } from '../ui/DatePicker';
import { useTheme } from '../../contexts/ThemeContext';
import axios from 'axios';

interface CreateProjectModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ onClose, onSuccess }) => {
    const { theme } = useTheme();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        fundingGoal: '',
        deadline: '',
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            await axios.post(
                'http://localhost:3000/projects',
                {
                    title: formData.title,
                    description: formData.description,
                    fundingGoal: parseFloat(formData.fundingGoal),
                    deadline: new Date(formData.deadline).toISOString(),
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to create project:', error);
            alert('Failed to create project');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleDateChange = (date: string) => {
        setFormData({
            ...formData,
            deadline: date,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <label
                    htmlFor="title"
                    className={`block text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                >
                    Project Title
                </label>
                <Input
                    id="title"
                    name="title"
                    type="text"
                    placeholder="Enter project title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                />
            </div>

            <div className="space-y-2">
                <label
                    htmlFor="description"
                    className={`block text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                >
                    Description
                </label>
                <textarea
                    id="description"
                    name="description"
                    rows={4}
                    placeholder="Describe your project"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    className={`flex w-full rounded-lg border px-4 py-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 resize-none ${theme === 'dark'
                            ? 'border-slate-600 bg-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:border-blue-500'
                            : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-blue-500'
                        }`}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label
                        htmlFor="fundingGoal"
                        className={`block text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                    >
                        Funding Goal (₹)
                    </label>
                    <Input
                        id="fundingGoal"
                        name="fundingGoal"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="₹ 0"
                        value={formData.fundingGoal}
                        onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            setFormData({ ...formData, fundingGoal: value });
                        }}
                        required
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                </div>

                <div className="space-y-2">
                    <label
                        htmlFor="deadline"
                        className={`block text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                    >
                        Deadline
                    </label>
                    <DatePicker
                        value={formData.deadline}
                        onChange={handleDateChange}
                        placeholder="dd/mm/yyyy"
                        required
                    />
                </div>
            </div>

            <div className={`p-4 rounded-lg border ${theme === 'dark'
                    ? 'bg-blue-900/20 border-blue-800/30 text-blue-300'
                    : 'bg-blue-50 border-blue-200 text-blue-700'
                }`}>
                <p className="text-sm">
                    <span className="font-semibold">Note:</span> All fund transactions are processed in INR through secure payment gateways.
                    Your project data will be securely stored with blockchain-backed immutability for transparency.
                </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={loading}
                >
                    Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Project'}
                </Button>
            </div>
        </form>
    );
};
