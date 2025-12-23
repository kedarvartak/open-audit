import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Upload, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button, buttonVariants } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

interface Milestone {
    id: string;
    description: string;
    amount: number;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED' | 'REJECTED';
}

interface Project {
    id: string;
    title: string;
    description: string;
    contractAddress: string;
    milestones: Milestone[];
}

export const ProjectDetails = () => {
    const { id } = useParams();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState<string | null>(null);

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const response = await axios.get(`http://localhost:3000/projects/${id}`);
                setProject(response.data);
            } catch (error) {
                console.error('Failed to fetch project:', error);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchProject();
    }, [id]);

    const handleFileUpload = async (milestoneId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('location', JSON.stringify({ lat: 12.9716, long: 77.5946 }));

        setUploading(milestoneId);

        try {
            const token = localStorage.getItem('token');
            await axios.post(`http://localhost:3000/proofs/${milestoneId}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });
            alert('Proof uploaded successfully!');
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed. See console.');
        } finally {
            setUploading(null);
        }
    };

    if (loading) return <div className="text-slate-400 font-bold text-center py-20 text-2xl animate-pulse">Loading...</div>;
    if (!project) return <div className="text-slate-400 font-bold text-center py-20 text-2xl">Project not found</div>;

    return (
        <div className="space-y-12">
            <Card className="neu-flat p-8">
                <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-10">
                        <div className="space-y-6">
                            <h1 className="text-4xl font-bold text-slate-700 neu-text">{project.title}</h1>
                            <p className="text-slate-500 max-w-2xl text-lg font-medium leading-relaxed">
                                {project.description}
                            </p>
                        </div>
                        <div className="px-6 py-3 rounded-2xl neu-pressed flex items-center gap-3">
                            <div className={cn("w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,255,0,0.5)]", project.contractAddress ? "bg-green-400" : "bg-slate-300")}></div>
                            <span className="font-mono text-sm font-bold text-slate-600">
                                {project.contractAddress ?
                                    `${project.contractAddress.slice(0, 6)}...${project.contractAddress.slice(-4)}` :
                                    'NOT DEPLOYED'}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-8">
                <h2 className="text-2xl font-bold text-slate-700 neu-text px-4">Milestones</h2>
                <div className="grid gap-8">
                    {project.milestones.map((milestone, index) => (
                        <Card key={milestone.id} className="transition-all duration-300 hover:translate-y-[-4px]">
                            <CardContent className="p-8 flex flex-col md:flex-row gap-8 items-center">
                                <div className="flex-shrink-0">
                                    <div className={cn(
                                        "w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl neu-pressed",
                                        milestone.status === 'COMPLETED' ? "text-green-500" :
                                            milestone.status === 'IN_PROGRESS' ? "text-blue-500" :
                                                "text-slate-400"
                                    )}>
                                        {index + 1}
                                    </div>
                                </div>
                                <div className="flex-grow space-y-4 w-full">
                                    <div className="flex justify-between items-start w-full">
                                        <h3 className="text-xl font-bold text-slate-700">{milestone.description}</h3>
                                        <span className={cn(
                                            "px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider neu-flat",
                                            milestone.status === 'COMPLETED' ? "text-green-500" :
                                                milestone.status === 'IN_PROGRESS' ? "text-blue-500" :
                                                    "text-slate-400"
                                        )}>
                                            {milestone.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <p className="text-slate-600 font-mono text-lg font-bold px-4 py-1 rounded-xl neu-pressed">
                                            ${milestone.amount}
                                        </p>
                                    </div>

                                    <div className="pt-6 flex items-center gap-6">
                                        <div className="relative">
                                            <input
                                                type="file"
                                                id={`file-${milestone.id}`}
                                                className="hidden"
                                                accept="image/*,video/*"
                                                onChange={(e) => handleFileUpload(milestone.id, e)}
                                                disabled={uploading === milestone.id}
                                            />
                                            <label
                                                htmlFor={`file-${milestone.id}`}
                                                className={cn(
                                                    buttonVariants.default,
                                                    "cursor-pointer flex items-center text-[#6d5dfc] hover:text-[#5b4bc4]",
                                                    uploading === milestone.id && "opacity-50 cursor-not-allowed"
                                                )}
                                            >
                                                <Upload size={18} className="mr-2" />
                                                {uploading === milestone.id ? 'Uploading...' : 'Upload Proof'}
                                            </label>
                                        </div>
                                        <Button variant="ghost" className="text-slate-500 hover:text-slate-700">
                                            View Proofs
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};
