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
    UploadedFiles,
    Request,
    HttpCode,
    HttpStatus,
    BadRequestException,
    Query,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('tasks')
export class TasksController {
    constructor(private readonly tasksService: TasksService) { }

    @Post('enhance-description')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.CLIENT, Role.ADMIN)
    async enhanceDescription(@Body() body: { description: string }) {
        return this.tasksService.enhanceDescription(body.description);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.CLIENT, Role.ADMIN)
    @UseInterceptors(FilesInterceptor('beforeImages', 10))  // Max 10 images
    async createTask(
        @Body() body: any,
        @UploadedFiles() beforeImages: Express.Multer.File[],
        @Request() req: any,
    ) {
        return this.tasksService.createTask(req.user.userId, body, beforeImages);
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

    @Post(':id/en-route')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.WORKER, Role.ADMIN)
    async startJourney(
        @Param('id') id: string,
        @Body() body: any,
        @Request() req: any,
    ) {
        return this.tasksService.startJourney(
            id,
            req.user.userId,
            body.lat ? parseFloat(body.lat) : undefined,
            body.lng ? parseFloat(body.lng) : undefined,
        );
    }

    @Post(':id/arrived')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.WORKER, Role.ADMIN)
    async markArrived(
        @Param('id') id: string,
        @Body() body: any,
        @Request() req: any,
    ) {
        if (!body.lat || !body.lng) {
            throw new BadRequestException('Location (lat, lng) is required to mark as arrived');
        }
        return this.tasksService.markArrived(
            id,
            req.user.userId,
            parseFloat(body.lat),
            parseFloat(body.lng),
            body.skipLocationCheck === true, // Testing mode: skip geofence check
        );
    }

    @Post(':id/start')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.WORKER, Role.ADMIN)
    async startWork(
        @Param('id') id: string,
        @Body() body: any,
        @Request() req: any,
    ) {
        return this.tasksService.startWork(
            id,
            req.user.userId,
            body.lat ? parseFloat(body.lat) : undefined,
            body.lng ? parseFloat(body.lng) : undefined,
            body.skipLocationCheck === true, // Testing mode: skip geofence check
        );
    }

    @Post(':id/submit')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.WORKER, Role.ADMIN)
    @UseInterceptors(FilesInterceptor('afterImages', 10))
    async submitWork(
        @Param('id') id: string,
        @UploadedFiles() afterImages: Express.Multer.File[],
        @Request() req: any,
    ) {
        console.log(`[TasksController] submitWork called for task ${id} by user ${req.user.userId}`);
        console.log(`[TasksController] Received ${afterImages?.length || 0} afterImages`);

        if (!afterImages || afterImages.length === 0) {
            console.error('[TasksController] No afterImages provided');
            throw new BadRequestException('After images required');
        }

        const result = await this.tasksService.submitWork(id, req.user.userId, afterImages);
        console.log(`[TasksController] submitWork result: aiResult keys=${result.aiResult ? Object.keys(result.aiResult) : 'null'}`);
        if (result.aiResult && result.aiResult.details) {
            console.log(`[TasksController] AI details count: ${result.aiResult.details.length}`);
            result.aiResult.details.forEach((d, i) => {
                console.log(`[TasksController] Detail ${i}: before_len=${d.before_image_annotated?.length}, after_len=${d.after_image_annotated?.length}`);
            });
        }
        return result;
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

        if (!task.beforeImages || task.beforeImages.length === 0 || !task.afterImageUrl) {
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
    @UseInterceptors(FilesInterceptor('beforeImages', 10))
    async updateTask(
        @Param('id') id: string,
        @Body() body: any,
        @UploadedFiles() beforeImages: Express.Multer.File[],
        @Request() req: any,
    ) {
        return this.tasksService.updateTask(id, req.user.userId, body, beforeImages);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.CLIENT, Role.ADMIN)
    async deleteTask(@Param('id') id: string, @Request() req: any) {
        return this.tasksService.deleteTask(id, req.user.userId);
    }
}
