import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AiVerificationService } from './ai-verification.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { FirebaseService } from '../firebase/firebase.service';
import { TaskStatus } from '@prisma/client';
import { ethers } from 'ethers';

@Injectable()
export class TasksService {
    constructor(
        private prisma: PrismaService,
        private storage: StorageService,
        private aiVerification: AiVerificationService,
        private blockchain: BlockchainService,
        private firebase: FirebaseService,
    ) { }

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

        return updatedTask;
    }

    // WORKER: Start work on the task
    async startWork(
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
            throw new BadRequestException('Task not in accepted state');
        }

        // Location verification if required
        if (task.requiresLocation) {
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

    // WORKER: Submit completed work
    async submitWork(
        taskId: string,
        workerId: string,
        afterImage: Express.Multer.File,
    ) {
        const task = await this.getTaskById(taskId);

        if (task.workerId !== workerId) {
            throw new BadRequestException('Not your task');
        }

        if (task.status !== TaskStatus.IN_PROGRESS) {
            throw new BadRequestException('Work not started');
        }

        if (!task.beforeImages || task.beforeImages.length === 0) {
            throw new BadRequestException('Before images not found');
        }

        // Upload after image
        const imageUrl = await this.storage.uploadFile(afterImage, 'tasks');
        const imageHash = await this.storage.getFileHash(afterImage.buffer);

        // Update task with after image
        await this.prisma.task.update({
            where: { id: taskId },
            data: {
                status: TaskStatus.SUBMITTED,
                afterImageUrl: imageUrl,
                afterImageHash: imageHash,
                completedAt: new Date(),
            },
        });

        // Call AI verification - use first image for comparison
        const aiResult = await this.aiVerification.verifyRepair(
            taskId,
            task.beforeImages[0],
            imageUrl,
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
            imageHash
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
        if (beforeImages && beforeImages.length > 0) {
            const imageUrls: string[] = [];
            const imageHashes: string[] = [];

            for (const image of beforeImages) {
                const url = await this.storage.uploadFile(image, 'tasks');
                const hash = await this.storage.getFileHash(image.buffer);
                imageUrls.push(url);
                imageHashes.push(hash);
            }

            updateData.beforeImages = imageUrls;
            updateData.beforeImageHashes = imageHashes;
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
