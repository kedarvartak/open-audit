import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectStatus, MilestoneStatus, Prisma } from '@prisma/client';

@Injectable()
export class ProjectsService {
    constructor(private prisma: PrismaService) { }

    async create(createProjectDto: any, userId: string) {
        const project = await this.prisma.project.create({
            data: {
                title: createProjectDto.title,
                description: createProjectDto.description,
                fundingGoal: createProjectDto.fundingGoal,
                deadline: new Date(createProjectDto.deadline),
                status: ProjectStatus.DRAFT,
                organizerId: userId,
            },
            include: {
                organizer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return project;
    }

    async findAll(filters?: { status?: string; organizerId?: string }) {
        const where: Prisma.ProjectWhereInput = {};

        if (filters?.status) {
            where.status = filters.status as ProjectStatus;
        }

        if (filters?.organizerId) {
            where.organizerId = filters.organizerId;
        }

        const projects = await this.prisma.project.findMany({
            where,
            include: {
                organizer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                milestones: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return projects;
    }

    async findOne(id: string) {
        const project = await this.prisma.project.findUnique({
            where: { id },
            include: {
                organizer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                milestones: {
                    include: {
                        proofs: {
                            select: {
                                id: true,
                                status: true,
                                createdAt: true,
                            },
                        },
                    },
                },
            },
        });

        if (!project) {
            throw new NotFoundException(`Project with ID ${id} not found`);
        }

        return project;
    }

    async update(id: string, updateProjectDto: any, userId: string) {
        const project = await this.findOne(id);

        if (project.organizerId !== userId) {
            throw new ForbiddenException('You can only update your own projects');
        }

        const updated = await this.prisma.project.update({
            where: { id },
            data: {
                title: updateProjectDto.title,
                description: updateProjectDto.description,
                fundingGoal: updateProjectDto.fundingGoal,
                deadline: updateProjectDto.deadline ? new Date(updateProjectDto.deadline) : undefined,
                status: updateProjectDto.status,
            },
            include: {
                organizer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return updated;
    }

    async remove(id: string, userId: string) {
        const project = await this.findOne(id);

        if (project.organizerId !== userId) {
            throw new ForbiddenException('You can only delete your own projects');
        }

        await this.prisma.project.delete({
            where: { id },
        });

        return { message: 'Project deleted successfully' };
    }

    // Milestone methods
    async createMilestone(projectId: string, createMilestoneDto: any, userId: string) {
        const project = await this.findOne(projectId);

        if (project.organizerId !== userId) {
            throw new ForbiddenException('You can only create milestones for your own projects');
        }

        const milestone = await this.prisma.milestone.create({
            data: {
                projectId,
                title: createMilestoneDto.title,
                description: createMilestoneDto.description,
                requiredApprovals: createMilestoneDto.requiredApprovals || 3,
                status: MilestoneStatus.PENDING,
            },
        });

        return milestone;
    }

    async getMilestones(projectId: string) {
        const milestones = await this.prisma.milestone.findMany({
            where: { projectId },
            include: {
                proofs: {
                    select: {
                        id: true,
                        status: true,
                        aiConfidence: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        return milestones;
    }
}
