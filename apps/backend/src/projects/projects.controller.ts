import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
    Put,
    Delete,
    Query
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateProjectDto, UpdateProjectDto, CreateMilestoneDto } from './dto/project.dto';

@Controller('projects')
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ORGANIZER, Role.ADMIN)
    async create(@Body() createProjectDto: CreateProjectDto, @Request() req: any) {
        return this.projectsService.create(createProjectDto, req.user.userId);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    async findAll(
        @Query('status') status?: string,
        @Query('organizerId') organizerId?: string,
    ) {
        return this.projectsService.findAll({ status, organizerId });
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    async findOne(@Param('id') id: string) {
        return this.projectsService.findOne(id);
    }

    @Put(':id')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ORGANIZER, Role.ADMIN)
    async update(
        @Param('id') id: string,
        @Body() updateProjectDto: UpdateProjectDto,
        @Request() req: any,
    ) {
        return this.projectsService.update(id, updateProjectDto, req.user.userId);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ORGANIZER, Role.ADMIN)
    async remove(@Param('id') id: string, @Request() req: any) {
        return this.projectsService.remove(id, req.user.userId);
    }

    // Milestone endpoints
    @Post(':id/milestones')
    @HttpCode(HttpStatus.CREATED)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ORGANIZER, Role.ADMIN)
    async createMilestone(
        @Param('id') projectId: string,
        @Body() createMilestoneDto: CreateMilestoneDto,
        @Request() req: any,
    ) {
        return this.projectsService.createMilestone(projectId, createMilestoneDto, req.user.userId);
    }

    @Get(':id/milestones')
    @HttpCode(HttpStatus.OK)
    async getMilestones(@Param('id') projectId: string) {
        return this.projectsService.getMilestones(projectId);
    }
}
