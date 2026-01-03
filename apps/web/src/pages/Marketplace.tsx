import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksAPI } from '../services/api';
import type { Task } from '../services/api';

export default function Marketplace() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('');
    const [minBudget, setMinBudget] = useState('');
    const [maxBudget, setMaxBudget] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchTasks();
    }, [category, minBudget, maxBudget]);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const filters: any = {};
            if (category) filters.category = category;
            if (minBudget) filters.minBudget = Number(minBudget);
            if (maxBudget) filters.maxBudget = Number(maxBudget);

            const response = await tasksAPI.getMarketplace(filters);
            setTasks(response.data);
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const categories = ['repair', 'cleaning', 'delivery', 'installation', 'maintenance'];

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Task Marketplace</h1>
                    <p className="mt-2 text-gray-600">Browse available tasks and start earning</p>
                </div>

                <div className="bg-white rounded-md shadow p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Category
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Categories</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Min Budget (INR)
                            </label>
                            <input
                                type="number"
                                value={minBudget}
                                onChange={(e) => setMinBudget(e.target.value)}
                                placeholder="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Max Budget (INR)
                            </label>
                            <input
                                type="number"
                                value={maxBudget}
                                onChange={(e) => setMaxBudget(e.target.value)}
                                placeholder="10000"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white rounded-md shadow p-6 space-y-4 animate-pulse">
                                <div className="flex items-start justify-between">
                                    <div className="h-6 w-20 rounded bg-gray-200" />
                                    <div className="h-6 w-16 rounded bg-gray-200" />
                                </div>
                                <div className="h-6 w-3/4 rounded bg-gray-200" />
                                <div className="h-4 w-full rounded bg-gray-200" />
                                <div className="h-4 w-2/3 rounded bg-gray-200" />
                                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                                    <div className="h-4 w-24 rounded bg-gray-200" />
                                    <div className="h-4 w-12 rounded bg-gray-200" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-md shadow">
                        <p className="text-gray-500">No tasks available</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tasks.map((task) => (
                            <div
                                key={task.id}
                                onClick={() => navigate(`/tasks/${task.id}`)}
                                className="bg-white rounded-md shadow hover:shadow-lg transition-shadow cursor-pointer p-6"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <span className="inline-block px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-sm">
                                        {task.category}
                                    </span>
                                    <span className="text-lg font-bold text-green-600">
                                        Rs.{task.budget}
                                    </span>
                                </div>

                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    {task.title}
                                </h3>

                                <p className="text-gray-600 mb-4 line-clamp-2">
                                    {task.description}
                                </p>

                                {task.locationName && (
                                    <div className="flex items-center text-sm text-gray-500 mb-4">
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        {task.locationName}
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                                    <div className="flex items-center text-sm text-gray-500">
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        {task.client.name}
                                    </div>
                                    <div className="flex items-center text-sm text-yellow-600">
                                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                        {task.client.rating.toFixed(1)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
