import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class ProjectsService {
    constructor(
        private prisma: PrismaService,
        private blockchainService: BlockchainService,
    ) { }

    async create(data: any, userId: string) {
        try {
            await this.blockchainService.createProjectOnChain(data.title);
        } catch (e) {
            console.error("Blockchain creation failed", e);
        }

        return this.prisma.project.create({
            data: {
                ...data,
                organizerId: userId,
            },
        });
    }

    async findAll() {
        return this.prisma.project.findMany({
            include: { milestones: true, organizer: { select: { name: true, email: true } } },
        });
    }

    async findOne(id: string) {
        return this.prisma.project.findUnique({
            where: { id },
            include: { milestones: true },
        });
    }

    async createMilestone(projectId: string, data: any) {
        return this.prisma.milestone.create({
            data: {
                ...data,
                projectId,
            },
        });
    }
}
