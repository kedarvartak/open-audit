import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';

// projects service handles offchain operations in DB and onchain operations on ethereum
// its an orchestrator in between Web app state ↔ Database ↔ Blockchain

@Injectable()
export class ProjectsService {
    constructor(
        private prisma: PrismaService,
        private blockchainService: BlockchainService,
    ) { }

    // create project - both onchain and offchain
    // graceful degradation pattern
    async create(data: any, userId: string) {
        let contractAddress = null;
        try {
            const result = await this.blockchainService.createProjectOnChain(data.title);
            if (result) {
                contractAddress = result.address;
            }
        } catch (e) {
            console.error("Blockchain creation failed", e);
        }

        return this.prisma.project.create({
            data: {
                ...data,
                organizerId: userId,
                contractAddress,
            },
        });
    }

    // fetch all projects from DB
    async findAll() {
        return this.prisma.project.findMany({
            include: { milestones: true, organizer: { select: { name: true, email: true } } },
        });
    }

    // find a particular project from DB
    async findOne(id: string) {
        return this.prisma.project.findUnique({
            where: { id },
            include: { milestones: true },
        });
    }

    // create a milestone for a project in DB
    async createMilestone(projectId: string, data: any) {
        return this.prisma.milestone.create({
            data: {
                ...data,
                projectId,
            },
        });
    }
}

// Create Project Flow
// Client
//  → POST /projects
//  → ProjectsController
//  → ProjectsService.create()
//    → BlockchainService.createProjectOnChain()
//    → Prisma.project.create()
//  → Response
