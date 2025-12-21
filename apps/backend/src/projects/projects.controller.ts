import { Controller, Post, Body, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('projects')
export class ProjectsController {
    constructor(private projectsService: ProjectsService) { }

    @UseGuards(JwtAuthGuard)
    @Post()
    create(@Body() createProjectDto: any, @Request() req: any) {
        return this.projectsService.create(createProjectDto, req.user.userId);
    }

    @Get()
    findAll() {
        return this.projectsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.projectsService.findOne(id);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/milestones')
    createMilestone(@Param('id') id: string, @Body() createMilestoneDto: any) {
        return this.projectsService.createMilestone(id, createMilestoneDto);
    }
}
