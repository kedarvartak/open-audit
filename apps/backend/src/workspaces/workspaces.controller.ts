import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceRole } from '@prisma/client';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
    constructor(private workspacesService: WorkspacesService) { }

    // Create a new workspace
    @Post()
    async createWorkspace(
        @Request() req: any,
        @Body() body: { name: string; description?: string },
    ) {
        return this.workspacesService.createWorkspace(
            req.user.userId,
            body.name,
            body.description,
        );
    }

    // Get all workspaces for current user
    @Get()
    async getMyWorkspaces(@Request() req: any) {
        return this.workspacesService.getUserWorkspaces(req.user.userId);
    }

    // Get active workspace
    @Get('active')
    async getActiveWorkspace(@Request() req: any) {
        return this.workspacesService.getActiveWorkspace(req.user.userId);
    }

    // Set active workspace
    @Post('active/:workspaceId')
    async setActiveWorkspace(
        @Request() req: any,
        @Param('workspaceId') workspaceId: string,
    ) {
        return this.workspacesService.setActiveWorkspace(req.user.userId, workspaceId);
    }

    // Get a single workspace
    @Get(':id')
    async getWorkspace(@Request() req: any, @Param('id') id: string) {
        return this.workspacesService.getWorkspace(id, req.user.userId);
    }

    // Update workspace
    @Put(':id')
    async updateWorkspace(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { name?: string; description?: string },
    ) {
        return this.workspacesService.updateWorkspace(id, req.user.userId, body);
    }

    // Delete workspace
    @Delete(':id')
    async deleteWorkspace(@Request() req: any, @Param('id') id: string) {
        return this.workspacesService.deleteWorkspace(id, req.user.userId);
    }

    // Invite a member
    @Post(':id/members')
    async inviteMember(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { email: string; role?: WorkspaceRole },
    ) {
        return this.workspacesService.inviteMember(
            id,
            req.user.userId,
            body.email,
            body.role,
        );
    }

    // Remove a member
    @Delete(':id/members/:userId')
    async removeMember(
        @Request() req: any,
        @Param('id') id: string,
        @Param('userId') userId: string,
    ) {
        return this.workspacesService.removeMember(id, req.user.userId, userId);
    }

    // Update member role
    @Put(':id/members/:userId')
    async updateMemberRole(
        @Request() req: any,
        @Param('id') id: string,
        @Param('userId') userId: string,
        @Body() body: { role: WorkspaceRole },
    ) {
        return this.workspacesService.updateMemberRole(
            id,
            req.user.userId,
            userId,
            body.role,
        );
    }
}
