import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export const CreateProject = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        milestones: [{ description: '', amount: '' }]
    });

    const handleMilestoneChange = (index: number, field: string, value: string) => {
        const newMilestones = [...formData.milestones];
        newMilestones[index] = { ...newMilestones[index], [field]: value };
        setFormData({ ...formData, milestones: newMilestones });
    };

    const addMilestone = () => {
        setFormData({
            ...formData,
            milestones: [...formData.milestones, { description: '', amount: '' }]
        });
    };

    const removeMilestone = (index: number) => {
        const newMilestones = formData.milestones.filter((_, i) => i !== index);
        setFormData({ ...formData, milestones: newMilestones });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem('token');

            const projectRes = await axios.post('http://localhost:3000/projects', {
                title: formData.title,
                description: formData.description,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const projectId = projectRes.data.id;

            for (const m of formData.milestones) {
                await axios.post(`http://localhost:3000/projects/${projectId}/milestones`, {
                    description: m.description,
                    amount: parseFloat(m.amount)
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            navigate('/');
        } catch (error) {
            console.error('Failed to create project:', error);
            alert('Failed to create project.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-12">
            <div className="space-y-4 pb-4">
                <h1 className="text-4xl font-bold text-slate-700 neu-text">Create New Project</h1>
                <p className="text-lg text-slate-500 font-medium">
                    Define your project goals and funding milestones.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-12">
                <Card className="neu-flat overflow-visible">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl font-bold text-slate-600">Project Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8 p-8">
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-slate-500 uppercase tracking-wide ml-2">Project Title</label>
                            <Input
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g., Community Water Well"
                                className="text-lg"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-slate-500 uppercase tracking-wide ml-2">Description</label>
                            <textarea
                                required
                                rows={5}
                                className="flex w-full rounded-md bg-[#e0e5ec] px-4 py-3 text-slate-700 font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 disabled:cursor-not-allowed disabled:opacity-50 neu-pressed border-none outline-none transition-all resize-none"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe the impact of this project..."
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-8">
                    <div className="flex justify-between items-center px-2">
                        <h2 className="text-2xl font-bold text-slate-700 neu-text">Milestones</h2>
                        <Button
                            type="button"
                            onClick={addMilestone}
                            className="text-[#6d5dfc] hover:text-[#5b4bc4]"
                        >
                            <Plus size={20} className="mr-2" /> Add Milestone
                        </Button>
                    </div>

                    {formData.milestones.map((milestone, index) => (
                        <Card key={index} className="neu-flat">
                            <CardContent className="p-8 flex gap-8 items-start">
                                <div className="flex-grow space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide ml-2">Description</label>
                                        <Input
                                            type="text"
                                            required
                                            value={milestone.description}
                                            onChange={(e) => handleMilestoneChange(index, 'description', e.target.value)}
                                            placeholder="e.g., Foundation Laying"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide ml-2">Amount ($)</label>
                                        <Input
                                            type="number"
                                            required
                                            value={milestone.amount}
                                            onChange={(e) => handleMilestoneChange(index, 'amount', e.target.value)}
                                            placeholder="5000"
                                        />
                                    </div>
                                </div>
                                {formData.milestones.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeMilestone(index)}
                                        className="mt-8 text-red-400 hover:text-red-500 rounded-sm hover:neu-pressed"
                                    >
                                        <Trash2 size={20} />
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="flex justify-end pt-8 pb-12">
                    <Button
                        type="submit"
                        size="lg"
                        disabled={loading}
                        className="w-full md:w-auto text-lg text-[#6d5dfc] font-bold"
                    >
                        {loading ? 'Creating Project...' : 'Create Project'}
                    </Button>
                </div>
            </form>
        </div>
    );
};
