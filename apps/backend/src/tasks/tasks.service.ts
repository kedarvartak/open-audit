import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AiVerificationService } from './ai-verification.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { FirebaseService } from '../firebase/firebase.service';
import { TaskStatus } from '@prisma/client';
import { ethers } from 'ethers';
import Groq from 'groq-sdk';

@Injectable()
export class TasksService {
    private groq: Groq;

    constructor(
        private prisma: PrismaService,
        private storage: StorageService,
        private aiVerification: AiVerificationService,
        private blockchain: BlockchainService,
        private firebase: FirebaseService,
    ) {
        // Initialize Groq with API key from environment
        this.groq = new Groq({
            apiKey: process.env.GROQ_API_KEY,
        });
    }

    // LLM: Enhance task description
    async enhanceDescription(description: string): Promise<{ enhancedDescription: string }> {
        if (!description || description.trim().length === 0) {
            throw new BadRequestException('Description cannot be empty');
        }

        try {
            const chatCompletion = await this.groq.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that enhances task descriptions. Make them clear, professional, and detailed while maintaining the core meaning. Keep the enhanced description concise (2-4 sentences max). Focus on clarity, actionable details, and professional tone.',
                    },
                    {
                        role: 'user',
                        content: `Enhance this task description: "${description}"`,
                    },
                ],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.7,
                max_tokens: 200,
            });

            const enhancedDescription = chatCompletion.choices[0]?.message?.content || description;

            return { enhancedDescription: enhancedDescription.trim() };
        } catch (error) {
            console.error('Groq API error:', error);
            throw new BadRequestException('Failed to enhance description. Please try again.');
        }
    }

    // CLIENT: Create a new task
    async createTask(clientId: string, dto: any, beforeImages?: Express.Multer.File[]) {
        // Validate required fields
        if (!dto.title?.trim()) {
            throw new BadRequestException('Title is required');
        }
        if (!dto.description?.trim()) {
            throw new BadRequestException('Description is required');
        }
        if (!dto.budget) {
            throw new BadRequestException('Budget is required');
        }
        if (!dto.locationName?.trim()) {
            throw new BadRequestException('Location is required');
        }
        if (!dto.deadline) {
            throw new BadRequestException('Deadline is required');
        }
        if (!beforeImages || beforeImages.length === 0) {
            throw new BadRequestException('At least one task image is required');
        }

        // Upload all images
        const imageUrls: string[] = [];
        const imageHashes: string[] = [];

        for (const image of beforeImages) {
            const url = await this.storage.uploadFile(image, 'tasks');
            const hash = await this.storage.getFileHash(image.buffer);
            imageUrls.push(url);
            imageHashes.push(hash);
        }

        // Parse deadline
        const deadline = new Date(dto.deadline);

        // Parse budget (it might come as string from FormData)
        const budget = typeof dto.budget === 'string' ? parseFloat(dto.budget) : dto.budget;

        const task = await this.prisma.task.create({
            data: {
                title: dto.title,
                description: dto.description,
                category: dto.category || 'general',
                budget,
                clientId,
                status: TaskStatus.OPEN,

                // Images (array)
                beforeImages: imageUrls,
                beforeImageHashes: imageHashes,

                // Location (if provided)
                requiresLocation: dto.requiresLocation || false,
                locationLat: dto.locationLat ? parseFloat(dto.locationLat) : undefined,
                locationLng: dto.locationLng ? parseFloat(dto.locationLng) : undefined,
                locationRadius: dto.locationRadius ? parseInt(dto.locationRadius) : 50,
                locationName: dto.locationName,

                // Deadline
                deadline,
            },
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        // Record on blockchain (async, non-blocking)
        // Generate a deterministic address from email for blockchain identity
        const clientAddressHash = ethers.keccak256(ethers.toUtf8Bytes(task.client.email));
        const clientAddress = '0x' + clientAddressHash.slice(2, 42); // Take first 20 bytes

        this.blockchain.recordTaskCreation(
            task.id,
            clientAddress,
            task.budget,
            'stripe_pending' // Will be updated when Stripe is integrated
        ).catch(err => console.error('Blockchain recording failed:', err));

        return task;
    }

    // Get all open tasks (marketplace)
    async getOpenTasks(filters?: { category?: string; minBudget?: number; maxBudget?: number }) {
        const where: any = { status: TaskStatus.OPEN };

        if (filters?.category) {
            where.category = filters.category;
        }

        if (filters?.minBudget || filters?.maxBudget) {
            where.budget = {};
            if (filters.minBudget) where.budget.gte = filters.minBudget;
            if (filters.maxBudget) where.budget.lte = filters.maxBudget;
        }

        return this.prisma.task.findMany({
            where,
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        rating: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // Get task by ID
    async getTaskById(id: string) {
        const task = await this.prisma.task.findUnique({
            where: { id },
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        rating: true,
                    },
                },
                worker: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        rating: true,
                    },
                },
            },
        });

        if (!task) {
            throw new NotFoundException('Task not found');
        }

        return task;
    }

    // WORKER: Accept a task
    async acceptTask(taskId: string, workerId: string) {
        const task = await this.getTaskById(taskId);

        if (task.status !== TaskStatus.OPEN) {
            throw new BadRequestException('Task is not available');
        }

        if (task.clientId === workerId) {
            throw new BadRequestException('Cannot accept your own task');
        }

        const updatedTask = await this.prisma.task.update({
            where: { id: taskId },
            data: {
                workerId,
                status: TaskStatus.ACCEPTED,
                acceptedAt: new Date(),
            },
            include: {
                client: true,
                worker: true,
            },
        });

        // Record on blockchain
        if (updatedTask.worker) {
            const workerAddressHash = ethers.keccak256(ethers.toUtf8Bytes(updatedTask.worker.email));
            const workerAddress = '0x' + workerAddressHash.slice(2, 42);

            this.blockchain.recordTaskAcceptance(
                taskId,
                workerAddress
            ).catch(err => console.error('Blockchain recording failed:', err));
        }

        // Send Firebase Notification to Client
        if (updatedTask.client.fcmToken && updatedTask.worker) {
            this.firebase.notifyTaskAccepted(
                updatedTask.client.fcmToken,
                updatedTask.worker.name,
                updatedTask.title
            ).catch(err => console.error('Failed to send Firebase notification:', err));
        }

        return updatedTask;
    }

    // WORKER: Start journey to task location (En Route)
    async startJourney(
        taskId: string,
        workerId: string,
        workerLat?: number,
        workerLng?: number,
    ) {
        const task = await this.getTaskById(taskId);

        if (task.workerId !== workerId) {
            throw new BadRequestException('Not your task');
        }

        if (task.status !== TaskStatus.ACCEPTED) {
            throw new BadRequestException('Task must be in ACCEPTED state to start journey');
        }

        const updatedTask = await this.prisma.task.update({
            where: { id: taskId },
            data: {
                status: TaskStatus.EN_ROUTE,
                workerStartLat: workerLat,
                workerStartLng: workerLng,
            },
            include: {
                client: true,
                worker: true,
            },
        });

        // Send Firebase Notification to Client - "Worker is on the way"
        if (updatedTask.client.fcmToken && updatedTask.worker) {
            this.firebase.notifyWorkerEnRoute(
                updatedTask.client.fcmToken,
                updatedTask.worker.name,
                updatedTask.title
            ).catch(err => console.error('Failed to send Firebase notification:', err));
        }

        return updatedTask;
    }

    // WORKER: Mark as arrived at location
    async markArrived(
        taskId: string,
        workerId: string,
        workerLat: number,
        workerLng: number,
        skipLocationCheck: boolean = false, // Testing mode: skip geofence verification
    ) {
        const task = await this.getTaskById(taskId);

        if (task.workerId !== workerId) {
            throw new BadRequestException('Not your task');
        }

        if (task.status !== TaskStatus.EN_ROUTE) {
            throw new BadRequestException('Must be EN_ROUTE to mark as arrived');
        }

        // Location verification - worker must be within radius of task location
        // Skip verification if testing mode is enabled
        if (!skipLocationCheck && task.requiresLocation && task.locationLat !== null && task.locationLng !== null) {
            const distance = this.calculateDistance(
                workerLat,
                workerLng,
                task.locationLat,
                task.locationLng,
            );

            const radius = task.locationRadius || 100; // Default 100m radius
            if (distance > radius) {
                throw new BadRequestException(
                    `You are ${Math.round(distance)}m away. Must be within ${radius}m to mark as arrived.`,
                );
            }
        }

        const updatedTask = await this.prisma.task.update({
            where: { id: taskId },
            data: {
                status: TaskStatus.ARRIVED,
            },
            include: {
                client: true,
                worker: true,
            },
        });

        // Send Firebase Notification to Client - "Worker has arrived"
        if (updatedTask.client.fcmToken && updatedTask.worker) {
            this.firebase.notifyWorkerArrived(
                updatedTask.client.fcmToken,
                updatedTask.worker.name,
                updatedTask.title
            ).catch(err => console.error('Failed to send Firebase notification:', err));
        }

        return updatedTask;
    }

    // WORKER: Start work on the task
    async startWork(
        taskId: string,
        workerId: string,
        workerLat?: number,
        workerLng?: number,
        skipLocationCheck: boolean = false, // Testing mode: skip geofence verification
    ) {
        const task = await this.getTaskById(taskId);

        if (task.workerId !== workerId) {
            throw new BadRequestException('Not your task');
        }

        // Allow starting work from ACCEPTED (backwards compatible), EN_ROUTE, or ARRIVED
        const validStatuses: TaskStatus[] = [TaskStatus.ACCEPTED, TaskStatus.EN_ROUTE, TaskStatus.ARRIVED];
        if (!validStatuses.includes(task.status)) {
            throw new BadRequestException('Task not in valid state to start work');
        }

        // Location verification if required (skip if testing mode)
        if (!skipLocationCheck && task.requiresLocation) {
            if (!workerLat || !workerLng) {
                throw new BadRequestException('Location required for this task');
            }

            if (task.locationLat === null || task.locationLng === null || task.locationRadius === null) {
                throw new BadRequestException('Task location not properly configured');
            }

            const distance = this.calculateDistance(
                workerLat,
                workerLng,
                task.locationLat,
                task.locationLng,
            );

            if (distance > task.locationRadius) {
                throw new BadRequestException(
                    `You are ${Math.round(distance)}m away. Must be within ${task.locationRadius}m.`,
                );
            }
        }

        const updatedTask = await this.prisma.task.update({
            where: { id: taskId },
            data: {
                status: TaskStatus.IN_PROGRESS,
                workerStartLat: workerLat,
                workerStartLng: workerLng,
                locationVerified: task.requiresLocation ? true : false,
            },
        });

        return updatedTask;
    }

    // WORKER: Upload images for supervisor review (no AI verification)
    async uploadWorkerImages(
        taskId: string,
        workerId: string,
        images: Express.Multer.File[],
    ) {
        console.log(`[TasksService] uploadWorkerImages: Fetching task ${taskId}`);
        const task = await this.getTaskById(taskId);

        // Verify worker is assigned to this task
        if (task.workerId !== workerId) {
            throw new BadRequestException('You are not assigned to this task');
        }

        // Task must be in IN_PROGRESS state
        if (task.status !== TaskStatus.IN_PROGRESS && task.status !== TaskStatus.ACCEPTED) {
            throw new BadRequestException('Task must be in progress to upload images');
        }

        // Upload images to Cloudinary
        const imageUrls: string[] = [];
        for (const image of images) {
            const url = await this.storage.uploadFile(image, 'worker-uploads');
            imageUrls.push(url);
            console.log(`[TasksService] Uploaded worker image: ${url}`);
        }

        // Update task with worker images
        const updatedTask = await this.prisma.task.update({
            where: { id: taskId },
            data: {
                workerImages: imageUrls,
                workerImagesUploadedAt: new Date(),
                status: TaskStatus.SUBMITTED, // Mark as submitted for review
            },
            include: {
                client: { select: { id: true, name: true, email: true } },
                worker: { select: { id: true, name: true, email: true } },
            },
        });

        console.log(`[TasksService] Worker images uploaded: ${imageUrls.length} images`);
        return {
            success: true,
            message: 'Images uploaded successfully. Supervisor will review and verify.',
            imageCount: imageUrls.length,
            task: updatedTask,
        };
    }

    // WORKER: Submit completed work
    // Trigger rebuild for Prisma client update
    async submitWork(
        taskId: string,
        workerId: string,
        afterImages: Express.Multer.File[],
    ) {
        console.log(`[TasksService] submitWork: Fetching task ${taskId}`);
        let task = await this.getTaskById(taskId);
        console.log(`[TasksService] Task found: ${task.id}, Status: ${task.status}, Worker: ${task.workerId}`);

        // Note: Worker check removed for testing - supervisors can submit on behalf of workers
        // In production, you may want to add role-based checks here

        // Auto-set status to IN_PROGRESS if not already (bypass all status checks for testing)
        if (task.status !== TaskStatus.IN_PROGRESS && task.status !== TaskStatus.SUBMITTED && task.status !== TaskStatus.VERIFIED) {
            console.log(`[TasksService] Auto-setting status to IN_PROGRESS (was: ${task.status})`);
            task = await this.prisma.task.update({
                where: { id: taskId },
                data: {
                    status: TaskStatus.IN_PROGRESS,
                    locationVerified: false,
                },
                include: {
                    client: { select: { id: true, name: true, email: true, rating: true } },
                    worker: { select: { id: true, name: true, email: true, rating: true } },
                },
            });
        }

        if (!task.beforeImages || task.beforeImages.length === 0) {
            console.error(`[TasksService] No before images found`);
            throw new BadRequestException('Before images not found');
        }

        // Upload after images
        const imageUrls: string[] = [];
        const imageHashes: string[] = [];

        for (const image of afterImages) {
            const url = await this.storage.uploadFile(image, 'tasks');
            const hash = await this.storage.getFileHash(image.buffer);
            imageUrls.push(url);
            imageHashes.push(hash);
        }

        // Update task with after image (store first one in DB, but use all for AI)
        await this.prisma.task.update({
            where: { id: taskId },
            data: {
                status: TaskStatus.SUBMITTED,
                afterImageUrl: imageUrls[0],
                afterImageHash: imageHashes[0],
                completedAt: new Date(),
            },
        });

        // Call AI verification - pass all images
        const aiResult = await this.aiVerification.verifyRepair(
            taskId,
            task.beforeImages,
            imageUrls,
        );

        // Update with AI result
        const updatedTask = await this.prisma.task.update({
            where: { id: taskId },
            data: {
                status: TaskStatus.VERIFIED,
                aiVerification: aiResult as any,
                aiConfidence: aiResult.confidence,
                aiVerdict: aiResult.verdict,
                // Set 24h dispute deadline
                disputeDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
        });

        // Record work submission on blockchain - use first hash
        const beforeHashes = task.beforeImageHashes as string[] | null;
        this.blockchain.recordWorkSubmission(
            taskId,
            beforeHashes?.[0] || '',
            imageHashes[0]
        ).catch(err => console.error('Blockchain recording failed:', err));

        // Record AI verification on blockchain
        this.blockchain.recordAIVerification(
            taskId,
            aiResult.confidence,
            aiResult.verdict === 'FIXED'
        ).catch(err => console.error('Blockchain recording failed:', err));

        // TODO: If AI confidence >= 90%, trigger Stripe payment release
        // TODO: Send Firebase notification

        return {
            task: updatedTask,
            aiResult,
        };
    }

    // CLIENT: Dispute a task (within 24h)
    async disputeTask(taskId: string, clientId: string, reason: string) {
        const task = await this.getTaskById(taskId);

        if (task.clientId !== clientId) {
            throw new BadRequestException('Not your task');
        }

        if (task.status !== TaskStatus.VERIFIED) {
            throw new BadRequestException('Task not verified yet');
        }

        if (!task.disputeDeadline) {
            throw new BadRequestException('Dispute deadline not set');
        }

        if (new Date() > task.disputeDeadline) {
            throw new BadRequestException('Dispute window expired');
        }

        return this.prisma.task.update({
            where: { id: taskId },
            data: {
                status: TaskStatus.DISPUTED,
                disputed: true,
                disputeReason: reason,
                disputedAt: new Date(),
            },
        });
    }

    // Get my tasks (as client or worker)
    async getMyTasks(userId: string, role: 'client' | 'worker') {
        const where = role === 'client' ? { clientId: userId } : { workerId: userId };

        return this.prisma.task.findMany({
            where,
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        rating: true,
                    },
                },
                worker: {
                    select: {
                        id: true,
                        name: true,
                        rating: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // Helper: Calculate distance between two coordinates (Haversine formula)
    private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371e3; // Earth radius in meters
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lng2 - lng1) * Math.PI) / 180;

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    }

    // CLIENT: Update a task (only if OPEN)
    async updateTask(taskId: string, clientId: string, dto: any, beforeImages?: Express.Multer.File[]) {
        const task = await this.getTaskById(taskId);

        // Validate ownership
        if (task.clientId !== clientId) {
            throw new BadRequestException('Not your task');
        }

        // Validate status - can only update if OPEN
        if (task.status !== TaskStatus.OPEN) {
            throw new BadRequestException('Cannot update task after it has been accepted');
        }

        // Prepare update data
        const updateData: any = {};

        if (dto.title?.trim()) updateData.title = dto.title;
        if (dto.description?.trim()) updateData.description = dto.description;
        if (dto.budget) {
            updateData.budget = typeof dto.budget === 'string' ? parseFloat(dto.budget) : dto.budget;
        }
        if (dto.locationName) updateData.locationName = dto.locationName;
        if (dto.deadline) updateData.deadline = new Date(dto.deadline);

        // Handle images update
        // Get existing images to keep (sent as JSON string from frontend)
        let existingImagesToKeep: string[] = [];
        if (dto.existingImages) {
            try {
                existingImagesToKeep = JSON.parse(dto.existingImages);
            } catch (e) {
                console.error('Failed to parse existingImages:', e);
            }
        }

        // Upload new images if provided
        const newImageUrls: string[] = [];
        const newImageHashes: string[] = [];
        if (beforeImages && beforeImages.length > 0) {
            for (const image of beforeImages) {
                const url = await this.storage.uploadFile(image, 'tasks');
                const hash = await this.storage.getFileHash(image.buffer);
                newImageUrls.push(url);
                newImageHashes.push(hash);
            }
        }

        // Combine existing and new images
        if (existingImagesToKeep.length > 0 || newImageUrls.length > 0) {
            updateData.beforeImages = [...existingImagesToKeep, ...newImageUrls];
            // For existing images, we keep empty hashes (already on chain)
            // For new images, we have the new hashes
            const existingHashes = existingImagesToKeep.map(() => '');
            updateData.beforeImageHashes = [...existingHashes, ...newImageHashes];
        }

        return this.prisma.task.update({
            where: { id: taskId },
            data: updateData,
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
    }

    // CLIENT: Delete a task (only if OPEN)
    async deleteTask(taskId: string, clientId: string) {
        const task = await this.getTaskById(taskId);

        // Validate ownership
        if (task.clientId !== clientId) {
            throw new BadRequestException('Not your task');
        }

        // Validate status - can only delete if OPEN
        if (task.status !== TaskStatus.OPEN) {
            throw new BadRequestException('Cannot delete task after it has been accepted');
        }

        return this.prisma.task.delete({
            where: { id: taskId },
        });
    }
}
