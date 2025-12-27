import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DatePicker } from '../ui/DatePicker';
import { useTheme } from '../../contexts/ThemeContext';
import { MapPin, Upload, X } from 'lucide-react';
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
        locationName: '',
    });
    const [loading, setLoading] = useState(false);
    const [descriptionError, setDescriptionError] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [gettingLocation, setGettingLocation] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);

    const steps = [
        { number: 1, title: 'Basic Info' },
        { number: 2, title: 'Image & Location' },
        { number: 3, title: 'Budget & Deadline' },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate description word count before submitting
        const wordCount = formData.description.trim().split(/\s+/).filter(word => word.length > 0).length;
        if (wordCount < 10) {
            setDescriptionError(`Description must be at least 10 words (currently ${wordCount} words)`);
            return;
        }

        // Validate image
        if (!imageFile) {
            alert('Please upload an image for the task');
            return;
        }

        // Validate location
        if (!formData.locationName.trim()) {
            alert('Please provide a location for the task');
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('token');

            // Create FormData for file upload
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
                        // Reverse geocode to get address
                        const response = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`
                        );
                        const data = await response.json();
                        setFormData({
                            ...formData,
                            locationName: data.display_name || `${position.coords.latitude}, ${position.coords.longitude}`,
                        });
                    } catch (error) {
                        setFormData({
                            ...formData,
                            locationName: `${position.coords.latitude}, ${position.coords.longitude}`,
                        });
                    }
                    setGettingLocation(false);
                },
                (error) => {
                    alert('Unable to get your location. Please enter manually.');
                    setGettingLocation(false);
                }
            );
        } else {
            alert('Geolocation is not supported by your browser');
            setGettingLocation(false);
        }
    };

    const handleNext = () => {
        // Validate current step
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

    const handleDateChange = (date: string) => {
        setFormData({
            ...formData,
            deadline: date,
        });
    };

    return (
        <form onSubmit={currentStep === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} className="space-y-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-between mb-8">
                {steps.map((step, index) => (
                    <React.Fragment key={step.number}>
                        <div className="flex flex-col items-center flex-1">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${currentStep >= step.number
                                    ? 'bg-blue-500 text-white'
                                    : theme === 'dark'
                                        ? 'bg-slate-700 text-slate-400'
                                        : 'bg-slate-200 text-slate-500'
                                }`}>
                                {step.number}
                            </div>
                            <span className={`mt-2 text-xs font-medium ${currentStep >= step.number
                                    ? 'text-blue-500'
                                    : theme === 'dark'
                                        ? 'text-slate-500'
                                        : 'text-slate-400'
                                }`}>
                                {step.title}
                            </span>
                        </div>
                        {index < steps.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-2 -mt-8 ${currentStep > step.number
                                    ? 'bg-blue-500'
                                    : theme === 'dark'
                                        ? 'bg-slate-700'
                                        : 'bg-slate-200'
                                }`} />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
                <>
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

                    {/* Image Upload */}
                    <div className="space-y-2">
                        <label className={`block text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                            Task Image <span className="text-red-500">*</span>
                        </label>
                        {imagePreview ? (
                            <div className="relative">
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="w-full h-48 object-cover rounded-lg"
                                />
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    className={`absolute top-2 right-2 p-1.5 rounded-full ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-slate-100'} shadow-lg`}
                                >
                                    <X size={16} className="text-red-500" />
                                </button>
                            </div>
                        ) : (
                            <label
                                className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${theme === 'dark'
                                    ? 'border-slate-600 bg-slate-700/50 hover:bg-slate-700'
                                    : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
                                    }`}
                            >
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className={`w-10 h-10 mb-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                                    <p className={`mb-2 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                        <span className="font-semibold">Click to upload</span> or drag and drop
                                    </p>
                                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                        PNG, JPG or WEBP (MAX. 5MB)
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    required
                                />
                            </label>
                        )}
                    </div>

                    {/* Location Input */}
                    <div className="space-y-2">
                        <label
                            htmlFor="locationName"
                            className={`block text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                        >
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
                                required
                                className="flex-1"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={getGPSLocation}
                                disabled={gettingLocation}
                                className="flex items-center gap-2"
                            >
                                <MapPin size={16} />
                                {gettingLocation ? 'Getting...' : 'GPS'}
                            </Button>
                        </div>
                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                            Click GPS to auto-detect your location, or type manually
                        </p>
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
