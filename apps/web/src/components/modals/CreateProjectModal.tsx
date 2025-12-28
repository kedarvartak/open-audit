import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DatePicker } from '../ui/DatePicker';
import { useTheme } from '../../contexts/ThemeContext';
import { Trash2, Check, Sparkles } from 'lucide-react';
import type { Task } from '../../services/api';
import { tasksAPI } from '../../services/api';
import axios from 'axios';
import toast from 'react-hot-toast';

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
    const [enhancing, setEnhancing] = useState(false);
    const [descriptionError, setDescriptionError] = useState('');
    // Track existing image URLs (from editTask) separately from new files
    const [existingImages, setExistingImages] = useState<string[]>(editTask?.beforeImages || []);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
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
            // Check total images (existing + new)
            const totalImages = existingImages.length + imageFiles.length;
            if (totalImages === 0) {
                alert('Please upload at least one image');
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
            // Append all new image files
            imageFiles.forEach((file) => {
                submitData.append('beforeImages', file);
            });
            // Send existing image URLs to keep (for edits)
            if (editTask && existingImages.length > 0) {
                submitData.append('existingImages', JSON.stringify(existingImages));
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
        const files = e.target.files;
        if (files && files.length > 0) {
            const newFiles = Array.from(files);
            setImageFiles(prev => [...prev, ...newFiles]);

            // Generate previews for new files
            newFiles.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setNewImagePreviews(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeExistingImage = (index: number) => {
        setExistingImages(prev => prev.filter((_, i) => i !== index));
    };

    const removeNewImage = (index: number) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        setNewImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleEnhanceDescription = async () => {
        if (!formData.description.trim()) {
            toast.error('Please enter a description first');
            return;
        }

        setEnhancing(true);
        try {
            const response = await tasksAPI.enhanceDescription(formData.description);
            setFormData({ ...formData, description: response.data.enhancedDescription });
            toast.success('Description enhanced successfully!');
        } catch (error: any) {
            console.error('Enhancement error:', error);
            toast.error(error.response?.data?.message || 'Failed to enhance description');
        } finally {
            setEnhancing(false);
        }
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
                                <button
                                    type="button"
                                    onClick={handleEnhanceDescription}
                                    disabled={enhancing || !formData.description.trim()}
                                    className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${enhancing || !formData.description.trim()
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'bg-[#464ace] hover:bg-[#3d42b8] text-white'
                                        }`}
                                >
                                    <Sparkles size={16} className={enhancing ? 'animate-spin' : ''} />
                                    {enhancing ? 'Enhancing...' : 'Enhance with AI'}
                                </button>
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
                                            multiple
                                            onChange={handleImageChange}
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Format Support Text */}
                            <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                Only support .jpg, .png and .svg and zip files
                            </p>

                            {/* Uploaded Files */}
                            {(existingImages.length > 0 || newImagePreviews.length > 0) && (
                                <div className="space-y-2">
                                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Uploaded Images ({existingImages.length + newImagePreviews.length})
                                    </p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {/* Existing Images */}
                                        {existingImages.map((url: string, index: number) => (
                                            <div key={`existing-${index}`} className="relative group">
                                                <img
                                                    src={url}
                                                    alt={`Existing ${index + 1}`}
                                                    className={`w-full aspect-square object-contain rounded-lg ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeExistingImage(index)}
                                                    className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 size={12} className="text-white" />
                                                </button>
                                            </div>
                                        ))}
                                        {/* New Images */}
                                        {newImagePreviews.map((preview: string, index: number) => (
                                            <div key={`new-${index}`} className="relative group">
                                                <img
                                                    src={preview}
                                                    alt={`New ${index + 1}`}
                                                    className={`w-full aspect-square object-contain rounded-lg border-2 border-dashed border-green-500 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeNewImage(index)}
                                                    className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 size={12} className="text-white" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
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
                                        <img src="/map.svg" alt="Map" className={`w-5 h-5 ${gettingLocation ? 'animate-pulse' : ''}`} />
                                    </Button>
                                </div>
                                <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Click the map icon to auto-detect location
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
