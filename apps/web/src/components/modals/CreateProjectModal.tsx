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
    const [descriptionError, setDescriptionError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate description word count before submitting
        const wordCount = formData.description.trim().split(/\s+/).filter(word => word.length > 0).length;
        if (wordCount < 10) {
            setDescriptionError(`Description must be at least 10 words (currently ${wordCount} words)`);
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            await axios.post(
                'http://localhost:3001/v0/tasks',
                {
                    title: formData.title,
                    description: formData.description,
                    category: 'general', // Default category
                    budget: parseFloat(formData.fundingGoal),
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
            console.error('Failed to Create Task:', error);
            alert('Failed to Create Task');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });

        // Validate description word count
        if (e.target.name === 'description') {
            const wordCount = e.target.value.trim().split(/\s+/).filter(word => word.length > 0).length;
            if (wordCount < 10) {
                setDescriptionError(`Description must be at least 10 words (currently ${wordCount} words)`);
            } else {
                setDescriptionError('');
            }
        }
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
                <div className="flex items-center justify-between">
                    <label
                        htmlFor="description"
                        className={`block text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                    >
                        Description
                    </label>
                    <span className={`text-xs ${formData.description.trim().split(/\s+/).filter(word => word.length > 0).length >= 10
                        ? theme === 'dark' ? 'text-green-400' : 'text-green-600'
                        : theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                        {formData.description.trim().split(/\s+/).filter(word => word.length > 0).length} / 10 words
                    </span>
                </div>
                <textarea
                    id="description"
                    name="description"
                    rows={4}
                    placeholder="Describe your project in detail (minimum 10 words)"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    className={`flex w-full rounded-md border px-4 py-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 resize-none ${theme === 'dark'
                        ? 'border-slate-600 bg-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:border-blue-500'
                        : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-blue-500'
                        } ${descriptionError ? 'border-red-500' : ''}`}
                />
                {descriptionError && (
                    <p className="text-xs text-red-500">{descriptionError}</p>
                )}
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

            <div className={`p-4 rounded-md border ${theme === 'dark'
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
                    {loading ? 'Creating...' : 'Create Task'}
                </Button>
            </div>
        </form>
    );
};
