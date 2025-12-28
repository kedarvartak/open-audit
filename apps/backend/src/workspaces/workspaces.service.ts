import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceRole } from '@prisma/client';

@Injectable()
export class WorkspacesService {
    constructor(private prisma: PrismaService) { }

    // Create a new workspace
    async createWorkspace(userId: string, name: string, description?: string) {
        // Create workspace with owner as first member
        const workspace = await this.prisma.workspace.create({
            data: {
                name,
                description,
                ownerId: userId,
                members: {
                    create: {
                        userId,
                        role: WorkspaceRole.OWNER,
                        joinedAt: new Date(),
                    },
                },
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });

        // Set as active workspace for the user
        await this.prisma.user.update({
            where: { id: userId },
            data: { activeWorkspaceId: workspace.id },
        });

        return workspace;
    }

    // Get all workspaces for a user
    async getUserWorkspaces(userId: string) {
        return this.prisma.workspace.findMany({
            where: {
                members: {
                    some: {
                        userId,
                    },
                },
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        tasks: true,
                        members: true,
                    },
                },
            },
        });
    }

    // Get a single workspace by ID
    async getWorkspace(workspaceId: string, userId: string) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                role: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        tasks: true,
                    },
                },
            },
        });

        if (!workspace) {
            throw new NotFoundException('Workspace not found');
        }

        // Check if user is a member
        const isMember = workspace.members.some(m => m.userId === userId);
        if (!isMember) {
            throw new ForbiddenException('You are not a member of this workspace');
        }

        return workspace;
    }

    // Update workspace
    async updateWorkspace(workspaceId: string, userId: string, data: { name?: string; description?: string }) {
        const workspace = await this.getWorkspace(workspaceId, userId);

        // Check if user has admin/owner permissions
        const member = workspace.members.find(m => m.userId === userId);
        if (!member || (member.role !== WorkspaceRole.OWNER && member.role !== WorkspaceRole.ADMIN)) {
            throw new ForbiddenException('You do not have permission to update this workspace');
        }

        return this.prisma.workspace.update({
            where: { id: workspaceId },
            data,
        });
    }

    // Delete workspace
    async deleteWorkspace(workspaceId: string, userId: string) {
        const workspace = await this.getWorkspace(workspaceId, userId);

        // Only owner can delete
        if (workspace.ownerId !== userId) {
            throw new ForbiddenException('Only the workspace owner can delete it');
        }

        return this.prisma.workspace.delete({
            where: { id: workspaceId },
        });
    }

    // Invite a member to workspace
    async inviteMember(workspaceId: string, inviterId: string, email: string, role: WorkspaceRole = WorkspaceRole.MEMBER) {
        const workspace = await this.getWorkspace(workspaceId, inviterId);

        // Check if inviter has permission
        const inviter = workspace.members.find(m => m.userId === inviterId);
        if (!inviter || (inviter.role !== WorkspaceRole.OWNER && inviter.role !== WorkspaceRole.ADMIN)) {
            throw new ForbiddenException('You do not have permission to invite members');
        }

        // Find user by email
        const userToInvite = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!userToInvite) {
            throw new NotFoundException('User not found with this email');
        }

        // Check if already a member
        const existingMember = await this.prisma.workspaceMember.findUnique({
            where: {
                userId_workspaceId: {
                    userId: userToInvite.id,
                    workspaceId,
                },
            },
        });

        if (existingMember) {
            throw new BadRequestException('User is already a member of this workspace');
        }

        // Create membership
        return this.prisma.workspaceMember.create({
            data: {
                userId: userToInvite.id,
                workspaceId,
                role,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
    }

    // Remove a member from workspace
    async removeMember(workspaceId: string, removerId: string, memberUserId: string) {
        const workspace = await this.getWorkspace(workspaceId, removerId);

        // Can't remove owner
        if (workspace.ownerId === memberUserId) {
            throw new BadRequestException('Cannot remove the workspace owner');
        }

        // Check if remover has permission
        const remover = workspace.members.find(m => m.userId === removerId);
        if (!remover || (remover.role !== WorkspaceRole.OWNER && remover.role !== WorkspaceRole.ADMIN)) {
            throw new ForbiddenException('You do not have permission to remove members');
        }

        return this.prisma.workspaceMember.delete({
            where: {
                userId_workspaceId: {
                    userId: memberUserId,
                    workspaceId,
                },
            },
        });
    }

    // Update member role
    async updateMemberRole(workspaceId: string, updaterId: string, memberUserId: string, newRole: WorkspaceRole) {
        const workspace = await this.getWorkspace(workspaceId, updaterId);

        // Only owner can change roles
        if (workspace.ownerId !== updaterId) {
            throw new ForbiddenException('Only the workspace owner can change member roles');
        }

        // Can't change owner's role
        if (workspace.ownerId === memberUserId) {
            throw new BadRequestException('Cannot change the owner\'s role');
        }

        return this.prisma.workspaceMember.update({
            where: {
                userId_workspaceId: {
                    userId: memberUserId,
                    workspaceId,
                },
            },
            data: { role: newRole },
        });
    }

    // Set active workspace for user
    async setActiveWorkspace(userId: string, workspaceId: string) {
        // Verify user is a member
        const membership = await this.prisma.workspaceMember.findUnique({
            where: {
                userId_workspaceId: {
                    userId,
                    workspaceId,
                },
            },
        });

        if (!membership) {
            throw new ForbiddenException('You are not a member of this workspace');
        }

        return this.prisma.user.update({
            where: { id: userId },
            data: { activeWorkspaceId: workspaceId },
        });
    }

    // Get user's active workspace
    async getActiveWorkspace(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { activeWorkspaceId: true },
        });

        if (!user?.activeWorkspaceId) {
            return null;
        }

        return this.getWorkspace(user.activeWorkspaceId, userId);
    }
}
