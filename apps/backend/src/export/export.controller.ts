import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
    constructor(private readonly exportService: ExportService) { }

    @Post('workspace-to-sheets')
    async exportWorkspaceToSheets(
        @Body('workspaceId') workspaceId: string,
        @Request() req: any,
    ) {
        const userEmail = req.user.email;
        const result = await this.exportService.exportWorkspaceToSheets(workspaceId, userEmail);
        return result;
    }
}
