import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AiVerificationService } from './ai-verification.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { TaskStatus } from '@prisma/client';
import { ethers } from 'ethers';

@Injectable()
export class TasksService {
    constructor(
        private prisma: PrismaService,
        private storage: StorageService,
        private aiVerification: AiVerificationService,
        private blockchain: BlockchainService,
    ) { }

    // CLIENT: Create a new task
    async createTask(clientId: string, dto: any) {
        const task = await this.prisma.task.create({
            data: {
                title: dto.title,
                description: dto.description,
                category: dto.category,
                budget: dto.budget,
                clientId,
                status: TaskStatus.OPEN,

                // Location (if provided)
                requiresLocation: dto.requiresLocation || false,
                locationLat: dto.locationLat,
                locationLng: dto.locationLng,
                locationRadius: dto.locationRadius || 50, // Default 50m
                locationName: dto.locationName,
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

    // WORKER: Upload before image and start work
    async startWork(
        taskId: string,
        workerId: string,
        beforeImage: Express.Multer.File,
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

        // Upload image
        const imageUrl = await this.storage.uploadFile(beforeImage, 'tasks');
        const imageHash = await this.storage.getFileHash(beforeImage.buffer);

        const updatedTask = await this.prisma.task.update({
            where: { id: taskId },
            data: {
                status: TaskStatus.IN_PROGRESS,
                beforeImageUrl: imageUrl,
                beforeImageHash: imageHash,
                workerStartLat: workerLat,
                workerStartLng: workerLng,
                locationVerified: task.requiresLocation ? true : false,
            },
        });

        // Record work submission would happen in submitWork
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

        if (!task.beforeImageUrl) {
            throw new BadRequestException('Before image not found');
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

        // Call AI verification
        const aiResult = await this.aiVerification.verifyRepair(
            taskId,
            task.beforeImageUrl,
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

        // Record work submission on blockchain
        this.blockchain.recordWorkSubmission(
            taskId,
            task.beforeImageHash!,
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
}
