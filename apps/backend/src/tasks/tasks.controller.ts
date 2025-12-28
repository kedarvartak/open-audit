import {
    Controller,
    Post,
    Get,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Request,
    HttpCode,
    HttpStatus,
    BadRequestException,
    Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('tasks')
export class TasksController {
    constructor(private readonly tasksService: TasksService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.CLIENT, Role.ADMIN)
    @UseInterceptors(FileInterceptor('beforeImage'))
    async createTask(
        @Body() body: any,
        @UploadedFile() beforeImage: Express.Multer.File,
        @Request() req: any,
    ) {
        return this.tasksService.createTask(req.user.userId, body, beforeImage);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    async getOpenTasks(
        @Query('category') category?: string,
        @Query('minBudget') minBudget?: string,
        @Query('maxBudget') maxBudget?: string,
    ) {
        const filters: any = {};
        if (category) filters.category = category;
        if (minBudget) filters.minBudget = parseFloat(minBudget);
        if (maxBudget) filters.maxBudget = parseFloat(maxBudget);

        return this.tasksService.getOpenTasks(filters);
    }

    @Get('my-tasks')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    async getMyTasks(@Request() req: any, @Query('role') role: 'client' | 'worker') {
        if (!role) {
            throw new BadRequestException('Role query parameter required (client or worker)');
        }
        return this.tasksService.getMyTasks(req.user.userId, role);
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    async getTask(@Param('id') id: string) {
        return this.tasksService.getTaskById(id);
    }

    @Post(':id/accept')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.WORKER, Role.ADMIN)
    async acceptTask(@Param('id') id: string, @Request() req: any) {
        return this.tasksService.acceptTask(id, req.user.userId);
    }

    @Post(':id/start')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.WORKER, Role.ADMIN)
    @UseInterceptors(FileInterceptor('beforeImage'))
    async startWork(
        @Param('id') id: string,
        @UploadedFile() beforeImage: Express.Multer.File,
        @Body() body: any,
        @Request() req: any,
    ) {
        if (!beforeImage) {
            throw new BadRequestException('Before image required');
        }

        return this.tasksService.startWork(
            id,
            req.user.userId,
            beforeImage,
            body.lat ? parseFloat(body.lat) : undefined,
            body.lng ? parseFloat(body.lng) : undefined,
        );
    }

    @Post(':id/submit')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.WORKER, Role.ADMIN)
    @UseInterceptors(FileInterceptor('afterImage'))
    async submitWork(
        @Param('id') id: string,
        @UploadedFile() afterImage: Express.Multer.File,
        @Request() req: any,
    ) {
        if (!afterImage) {
            throw new BadRequestException('After image required');
        }

        return this.tasksService.submitWork(id, req.user.userId, afterImage);
    }

    @Post(':id/dispute')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.CLIENT, Role.ADMIN)
    async disputeTask(
        @Param('id') id: string,
        @Body() body: { reason: string },
        @Request() req: any,
    ) {
        return this.tasksService.disputeTask(id, req.user.userId, body.reason);
    }

    @Post(':id/ai-verify')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    async aiVerifyTask(@Param('id') id: string) {
        // This endpoint was already created for AI verification
        // Keep it for compatibility with existing frontend
        const task = await this.tasksService.getTaskById(id);

        if (!task.beforeImageUrl || !task.afterImageUrl) {
            throw new BadRequestException('Task must have both before and after images');
        }

        // AI verification is now called automatically in submitWork
        // This endpoint just returns the existing result
        return {
            verified: task.aiVerdict === 'FIXED',
            confidence: task.aiConfidence,
            verdict: task.aiVerdict,
            aiVerification: task.aiVerification,
        };
    }

    @Put(':id')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.CLIENT, Role.ADMIN)
    @UseInterceptors(FileInterceptor('beforeImage'))
    async updateTask(
        @Param('id') id: string,
        @Body() body: any,
        @UploadedFile() beforeImage: Express.Multer.File,
        @Request() req: any,
    ) {
        return this.tasksService.updateTask(id, req.user.userId, body, beforeImage);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.CLIENT, Role.ADMIN)
    async deleteTask(@Param('id') id: string, @Request() req: any) {
        return this.tasksService.deleteTask(id, req.user.userId);
    }
}
