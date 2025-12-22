import { Controller, Post, UseInterceptors, UploadedFile, Param, Body, UseGuards, Request, Get, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProofsService } from './proofs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('proofs')
export class ProofsController {
    constructor(private readonly proofsService: ProofsService) { }

    @UseGuards(JwtAuthGuard)
    @Post(':milestoneId')
    @UseInterceptors(FileInterceptor('file'))
    async uploadProof(
        @Param('milestoneId') milestoneId: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 }), // 10MB
                    // new FileTypeValidator({ fileType: 'image/*' }), // Optional: restrict to images
                ],
            }),
        ) file: Express.Multer.File,
        @Body('location') locationStr: string,
        @Request() req: any,
    ) {
        let location = { lat: 0, long: 0 };
        try {
            if (locationStr) {
                location = JSON.parse(locationStr);
            }
        } catch (e) {
            console.error('Failed to parse location:', e);
        }

        return this.proofsService.submitProof(milestoneId, file, location, req.user.userId);
    }

    @Get(':milestoneId')
    async getProofs(@Param('milestoneId') milestoneId: string) {
        return this.proofsService.findAllByMilestone(milestoneId);
    }
}
