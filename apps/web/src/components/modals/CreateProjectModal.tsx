import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DatePicker } from '../ui/DatePicker';
import { useTheme } from '../../contexts/ThemeContext';
import { MapPin, Trash2, ChevronRight, ChevronLeft } from 'lucide-react';
import axios from 'axios';

interface CreateProjectModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ onClose, onSuccess }) => {
    const { theme } = useTheme();
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        fundingGoal: '',
        deadline: '',
        locationName: '',
    });
    const [loading, setLoading] = useState(false);
    const [descriptionError, setDescriptionError] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [gettingLocation, setGettingLocation] = useState(false);

    const handleNext = () => {
        if (currentStep === 1) {
            if (!formData.title.trim()) {
                alert('Please enter a title');
                return;
            }
            const wordCount = formData.description.trim().split(/\s+/).filter(word => word.length > 0).length;
            if (wordCount < 10) {
                setDescriptionError(`Description must be at least 10 words (currently ${wordCount} words)`);
                return;
            }
        } else if (currentStep === 2) {
            if (!imageFile) {
                alert('Please upload an image');
                return;
            }
            if (!formData.locationName.trim()) {
                alert('Please provide a location');
                return;
            }
        }

        if (currentStep < 3) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.fundingGoal) {
            alert('Please enter a budget');
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('token');

            const submitData = new FormData();
            submitData.append('title', formData.title);
            submitData.append('description', formData.description);
            submitData.append('category', 'general');
            submitData.append('budget', formData.fundingGoal);
            submitData.append('locationName', formData.locationName);
            if (imageFile) {
                submitData.append('beforeImage', imageFile);
            }

            await axios.post(
                'http://localhost:3001/v0/tasks',
                submitData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
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

        if (e.target.name === 'description') {
            const wordCount = e.target.value.trim().split(/\s+/).filter(word => word.length > 0).length;
            if (wordCount < 10) {
                setDescriptionError(`Description must be at least 10 words (currently ${wordCount} words)`);
            } else {
                setDescriptionError('');
            }
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview('');
    };

    const getGPSLocation = () => {
        setGettingLocation(true);
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const response = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`
                        );
                        const data = await response.json();
                        setFormData({
                            ...formData,
                            locationName: data.display_name || `${position.coords.latitude}, ${position.coords.longitude}`,
                        });
                    } catch {
                        setFormData({
                            ...formData,
                            locationName: `${position.coords.latitude}, ${position.coords.longitude}`,
                        });
                    }
                    setGettingLocation(false);
                },
                () => {
                    alert('Unable to get your location. Please enter manually.');
                    setGettingLocation(false);
                }
            );
        } else {
            alert('Geolocation is not supported by your browser');
            setGettingLocation(false);
        }
    };

    const handleDateChange = (date: string) => {
        setFormData({
            ...formData,
            deadline: date,
        });
    };

    return (
        <div className="space-y-6">
            {/* Progress Steps - Just 3 Dashes */}
            <div className="flex items-center gap-3">
                {[1, 2, 3].map((num) => (
                    <div
                        key={num}
                        className={`flex-1 h-1 rounded-full transition-colors ${currentStep >= num
                            ? 'bg-blue-500'
                            : theme === 'dark'
                                ? 'bg-slate-700'
                                : 'bg-slate-300'
                            }`}
                    />
                ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Step 1: Basic Info */}
                {currentStep === 1 && (
                    <>
                        <div className="space-y-2">
                            <label htmlFor="title" className={`block text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                Task Title
                            </label>
                            <Input
                                id="title"
                                name="title"
                                type="text"
                                placeholder="Enter task title"
                                value={formData.title}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label htmlFor="description" className={`block text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
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
                                placeholder="Describe your task in detail (minimum 10 words)"
                                value={formData.description}
                                onChange={handleChange}
                                className={`flex w-full rounded-md border px-4 py-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 resize-none ${theme === 'dark'
                                    ? 'border-slate-600 bg-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:border-blue-500'
                                    : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-blue-500'
                                    } ${descriptionError ? 'border-red-500' : ''}`}
                            />
                            {descriptionError && (
                                <p className="text-xs text-red-500">{descriptionError}</p>
                            )}
                        </div>
                    </>
                )}

                {/* Step 2: Image & Location */}
                {currentStep === 2 && (
                    <>
                        <div className="space-y-2">
                            <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                Task Image <span className="text-red-500">*</span>
                            </label>
                            {imagePreview ? (
                                <div className="relative">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className={`w-full h-48 object-contain rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 hover:bg-red-600 shadow-lg transition-colors"
                                    >
                                        <Trash2 size={16} className="text-white" />
                                    </button>
                                </div>
                            ) : (
                                <label
                                    className={`flex flex-col items-center justify-center w-full h-56 rounded-xl cursor-pointer ${theme === 'dark'
                                        ? 'bg-gradient-to-b from-slate-800 to-slate-800/60 ring-1 ring-slate-700'
                                        : 'bg-gradient-to-b from-slate-100 to-slate-50 ring-1 ring-slate-200'
                                        }`}
                                >
                                    <div className="flex flex-col items-center justify-center py-8 px-4">
                                        {/* Folder Icon */}
                                        <div className={`mb-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`}>
                                            <svg width="56" height="56" viewBox="0 0 24 24" fill="currentColor" opacity="0.8">
                                                <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                                            </svg>
                                        </div>

                                        <p className={`mb-1 text-sm text-center ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Drag and drop or <span className="font-semibold text-blue-500">browse</span>
                                        </p>
                                        <p className={`text-xs text-center ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                            JPG, PNG & WEBP up to 5MB
                                        </p>
                                    </div>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                    />
                                </label>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="locationName" className={`block text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                Location <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    id="locationName"
                                    name="locationName"
                                    type="text"
                                    placeholder="Enter address or use GPS"
                                    value={formData.locationName}
                                    onChange={handleChange}
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    onClick={getGPSLocation}
                                    disabled={gettingLocation}
                                    className="px-3"
                                >
                                    <MapPin size={18} className={gettingLocation ? 'animate-pulse' : ''} />
                                </Button>
                            </div>
                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                Click GPS to auto-detect your location, or type manually
                            </p>
                        </div>
                    </>
                )}

                {/* Step 3: Budget & Deadline */}
                {currentStep === 3 && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="fundingGoal" className={`block text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Budget (₹)
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
                                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="deadline" className={`block text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Deadline
                                </label>
                                <DatePicker
                                    value={formData.deadline}
                                    onChange={handleDateChange}
                                    placeholder="dd/mm/yyyy"
                                />
                            </div>
                        </div>

                        <div className={`p-4 rounded-md border ${theme === 'dark'
                            ? 'bg-blue-900/20 border-blue-800/30 text-blue-300'
                            : 'bg-blue-50 border-blue-200 text-blue-700'
                            }`}>
                            <p className="text-sm">
                                <span className="font-semibold">Note:</span> All transactions are processed in INR through secure payment gateways.
                            </p>
                        </div>
                    </>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between gap-3 pt-4">
                    {currentStep > 1 && (
                        <Button
                            type="button"
                            onClick={handleBack}
                            className="flex items-center gap-2"
                        >
                            <ChevronLeft size={16} />
                            Back
                        </Button>
                    )}

                    <div className="flex-1" />

                    {currentStep < 3 ? (
                        <Button
                            type="button"
                            onClick={handleNext}
                            className="flex items-center gap-2"
                        >
                            Next
                            <ChevronRight size={16} />
                        </Button>
                    ) : (
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Task'}
                        </Button>
                    )}
                </div>
            </form>
        </div>
    );
};
