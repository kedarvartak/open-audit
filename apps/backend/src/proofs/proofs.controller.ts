import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    UseGuards,
    UseInterceptors,
    UploadedFiles,
    Request,
    HttpCode,
    HttpStatus,
    BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProofsService } from './proofs.service';
import { AiVerificationService } from './ai-verification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateProofDto, VerifyProofDto } from './dto/proof.dto';

@Controller('proofs')
export class ProofsController {
    constructor(
        private readonly proofsService: ProofsService,
        private readonly aiVerificationService: AiVerificationService,
    ) { }

    @Post('upload')
    @HttpCode(HttpStatus.CREATED)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ORGANIZER, Role.ADMIN)
    @UseInterceptors(FilesInterceptor('images', 2)) // Max 2 images (before & after)
    async uploadProof(
        @UploadedFiles() files: Express.Multer.File[],
        @Body() createProofDto: CreateProofDto,
        @Request() req: any,
    ) {
        if (!files || files.length !== 2) {
            throw new BadRequestException('Please upload exactly 2 images (before and after)');
        }

        return this.proofsService.createProof(files, createProofDto, req.user.userId);
    }

    @Get('milestone/:milestoneId')
    @HttpCode(HttpStatus.OK)
    async getProofsByMilestone(@Param('milestoneId') milestoneId: string) {
        return this.proofsService.getProofsByMilestone(milestoneId);
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    async getProof(@Param('id') id: string) {
        return this.proofsService.getProofById(id);
    }

    @Post(':id/verify')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.VERIFIER, Role.ADMIN)
    async verifyProof(
        @Param('id') id: string,
        @Body() verifyDto: VerifyProofDto,
        @Request() req: any,
    ) {
        return this.proofsService.verifyProof(id, req.user.userId, verifyDto);
    }

    @Post(':id/ai-verify')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    async aiVerifyProof(@Param('id') id: string) {
        const proof = await this.proofsService.getProofById(id);

        if (!proof.beforeImageUrl || !proof.afterImageUrl) {
            throw new BadRequestException('Proof must have both before and after images');
        }

        return this.aiVerificationService.verifyRepair(
            id,
            proof.beforeImageUrl,
            proof.afterImageUrl,
        );
    }
}

