import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DatePicker } from '../ui/DatePicker';
import { useTheme } from '../../contexts/ThemeContext';
import { MapPin, Trash2, Check } from 'lucide-react';
import type { Task } from '../../services/api';
import axios from 'axios';

interface CreateProjectModalProps {
    onClose: () => void;
    onSuccess: () => void;
    editTask?: Task;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ onClose, onSuccess, editTask }) => {
    const { theme } = useTheme();
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        title: editTask?.title || '',
        description: editTask?.description || '',
        fundingGoal: editTask?.budget?.toString() || '',
        deadline: editTask?.deadline?.split('T')[0] || '',
        locationName: editTask?.locationName || '',
    });
    const [loading, setLoading] = useState(false);
    const [descriptionError, setDescriptionError] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>(editTask?.beforeImageUrl || '');
    const [gettingLocation, setGettingLocation] = useState(false);

    const steps = [
        { number: 1, title: 'Basic Info', description: 'Title and description' },
        { number: 2, title: 'Media', description: 'Upload task image' },
        { number: 3, title: 'Location', description: 'Set task location' },
        { number: 4, title: 'Budget', description: 'Set budget & deadline' },
    ];

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
            if (!imageFile && !editTask?.beforeImageUrl) {
                alert('Please upload an image');
                return;
            }
        } else if (currentStep === 3) {
            if (!formData.locationName.trim()) {
                alert('Please provide a location');
                return;
            }
        }

        if (currentStep < 4) {
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

        if (!formData.deadline) {
            alert('Please select a deadline');
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
            if (formData.deadline) {
                submitData.append('deadline', formData.deadline);
            }
            if (imageFile) {
                submitData.append('beforeImage', imageFile);
            }

            const url = editTask
                ? `http://localhost:3001/v0/tasks/${editTask.id}`
                : 'http://localhost:3001/v0/tasks';

            const method = editTask ? 'put' : 'post';

            await axios[method](
                url,
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
        <div className="flex min-h-[500px]">
            {/* Left Sidebar - Steps */}
            <div className={`w-56 pr-6 border-r ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                <div className="relative">
                    {steps.map((step, index) => (
                        <div key={step.number} className="relative flex gap-4 pb-8 last:pb-0">
                            {/* Vertical line */}
                            {index < steps.length - 1 && (
                                <div
                                    className={`absolute left-3 top-7 w-0.5 h-full ${currentStep > step.number
                                        ? 'bg-[#464ace]'
                                        : theme === 'dark'
                                            ? 'bg-slate-600'
                                            : 'bg-slate-300'
                                        }`}
                                    style={{ borderStyle: currentStep > step.number ? 'solid' : 'dashed' }}
                                />
                            )}

                            {/* Step indicator */}
                            <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${currentStep > step.number
                                ? 'bg-[#464ace] text-white'
                                : currentStep === step.number
                                    ? 'bg-[#464ace] text-white'
                                    : theme === 'dark'
                                        ? 'bg-slate-700 border-2 border-slate-600'
                                        : 'bg-white border-2 border-slate-300'
                                }`}>
                                {currentStep > step.number ? (
                                    <Check size={14} />
                                ) : (
                                    <span className={`text-xs font-medium ${currentStep === step.number
                                        ? 'text-white'
                                        : theme === 'dark'
                                            ? 'text-slate-400'
                                            : 'text-slate-500'
                                        }`}>
                                        {step.number}
                                    </span>
                                )}
                            </div>

                            {/* Step text */}
                            <div className="pt-0.5">
                                <p className={`text-sm font-semibold ${currentStep >= step.number
                                    ? theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
                                    : theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                                    }`}>
                                    {step.title}
                                </p>
                                <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {step.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 pl-8 flex flex-col">
                {/* Step Title */}
                <h3 className={`text-lg font-semibold mb-6 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                    {steps[currentStep - 1].title}
                </h3>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                    {/* Step 1: Basic Info */}
                    {currentStep === 1 && (
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label htmlFor="title" className={`block text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Task Title <span className="text-red-500">*</span>
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
                                    <label htmlFor="description" className={`block text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Description <span className="text-red-500">*</span>
                                    </label>
                                    <span className={`text-xs ${formData.description.trim().split(/\s+/).filter(word => word.length > 0).length >= 10
                                        ? 'text-green-500'
                                        : theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                        {formData.description.trim().split(/\s+/).filter(word => word.length > 0).length}/10 words
                                    </span>
                                </div>
                                <textarea
                                    id="description"
                                    name="description"
                                    rows={4}
                                    placeholder="Describe your task in detail (minimum 10 words)"
                                    value={formData.description}
                                    onChange={handleChange}
                                    className={`flex w-full rounded-md border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 resize-none ${theme === 'dark'
                                        ? 'border-slate-600 bg-slate-700 text-slate-100 placeholder:text-slate-500'
                                        : 'border-slate-300 bg-slate-100 text-slate-900 placeholder:text-slate-400'
                                        } ${descriptionError ? 'border-red-500' : ''}`}
                                />
                                {descriptionError && (
                                    <p className="text-xs text-red-500">{descriptionError}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Media */}
                    {currentStep === 2 && (
                        <div className="space-y-4">
                            {/* Upload Area */}
                            <div className={`border-2 border-dashed rounded-xl p-6 ${theme === 'dark'
                                ? 'border-slate-600 bg-slate-800/30'
                                : 'border-slate-300 bg-slate-50'
                                }`}>
                                <div className="flex flex-col items-center justify-center">
                                    {/* Folder Icon */}
                                    <div className="mb-4 text-[#464ace]">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.9">
                                            <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                                        </svg>
                                    </div>

                                    <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                                        Drag your file(s) to start uploading
                                    </p>

                                    <p className={`text-xs mb-3 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                        OR
                                    </p>

                                    <label className="cursor-pointer">
                                        <span className="px-4 py-2 text-sm font-medium text-[#464ace] border border-[#464ace] rounded-md hover:bg-[#464ace]/10 transition-colors">
                                            Browse files
                                        </span>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Format Support Text */}
                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                Only support .jpg, .png and .svg and zip files
                            </p>

                            {/* Uploaded File Info */}
                            {imageFile && (
                                <div className={`flex items-center gap-3 p-3 rounded-lg border ${theme === 'dark'
                                    ? 'bg-slate-800 border-slate-700'
                                    : 'bg-white border-slate-200'
                                    }`}>
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="w-10 h-10 object-cover rounded" />
                                    ) : (
                                        <div className={`w-10 h-10 rounded flex items-center justify-center ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-[#464ace]">
                                                <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                                            </svg>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                                            {imageFile.name}
                                        </p>
                                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                            {(imageFile.size / (1024 * 1024)).toFixed(2)} MB
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        className="p-1.5 rounded-full hover:bg-red-500/10 transition-colors"
                                    >
                                        <Trash2 size={18} className="text-red-500" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Location */}
                    {currentStep === 3 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="locationName" className={`block text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Location <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-3">
                                    <Input
                                        id="locationName"
                                        name="locationName"
                                        type="text"
                                        placeholder="Enter address"
                                        value={formData.locationName}
                                        onChange={handleChange}
                                        className="flex-1"
                                    />
                                    <Button
                                        type="button"
                                        onClick={getGPSLocation}
                                        disabled={gettingLocation}
                                        className="px-4"
                                    >
                                        <MapPin size={18} className={gettingLocation ? 'animate-pulse' : ''} />
                                    </Button>
                                </div>
                                <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Click the pin icon to auto-detect location
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Budget & Deadline */}
                    {currentStep === 4 && (
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label htmlFor="fundingGoal" className={`block text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Budget (₹) <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    id="fundingGoal"
                                    name="fundingGoal"
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    placeholder="Enter amount"
                                    value={formData.fundingGoal}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        setFormData({ ...formData, fundingGoal: value });
                                    }}
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="deadline" className={`block text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Deadline
                                </label>
                                <DatePicker
                                    value={formData.deadline}
                                    onChange={handleDateChange}
                                    placeholder="Select date"
                                />
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-end gap-3 mt-auto pt-8">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={currentStep === 1 ? onClose : handleBack}
                        >
                            {currentStep === 1 ? 'Cancel' : 'Back'}
                        </Button>

                        {currentStep < 4 ? (
                            <Button type="button" onClick={handleNext}>
                                Next
                            </Button>
                        ) : (
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Creating...' : 'Create Task'}
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};
