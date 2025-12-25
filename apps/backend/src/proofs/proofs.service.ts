import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ProofStatus, VoteType } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class ProofsService {
    constructor(
        private prisma: PrismaService,
        private storageService: StorageService,
    ) { }

    async createProof(
        files: Express.Multer.File[],
        createProofDto: any,
        userId: string,
    ) {
        const [beforeImage, afterImage] = files;

        // Upload images to MinIO and get SHA-256 hashes
        const beforeUpload = await this.uploadAndHash(beforeImage, 'before');
        const afterUpload = await this.uploadAndHash(afterImage, 'after');

        // Create proof record
        const proof = await this.prisma.proof.create({
            data: {
                milestoneId: createProofDto.milestoneId,
                beforeImageUrl: beforeUpload.url,
                beforeImageHash: beforeUpload.hash,
                afterImageUrl: afterUpload.url,
                afterImageHash: afterUpload.hash,
                gpsLatitude: parseFloat(createProofDto.gpsLatitude),
                gpsLongitude: parseFloat(createProofDto.gpsLongitude),
                location: createProofDto.location,
                timestamp: new Date(createProofDto.timestamp || Date.now()),
                deviceInfo: createProofDto.deviceInfo,
                status: ProofStatus.PENDING,
            },
            include: {
                milestone: {
                    include: {
                        project: true,
                    },
                },
            },
        });

        // TODO: Trigger AI analysis job (BullMQ)
        // await this.queueService.addJob('ai-analysis', { proofId: proof.id });

        return proof;
    }

    private async uploadAndHash(
        file: Express.Multer.File,
        prefix: string,
    ): Promise<{ url: string; hash: string }> {
        // Generate SHA-256 hash
        const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');

        // Upload to MinIO
        const fileName = `${prefix}-${Date.now()}-${file.originalname}`;
        const url = await this.storageService.uploadFile(fileName, file.buffer, file.mimetype);

        return { url, hash };
    }

    async getProofsByMilestone(milestoneId: string) {
        const proofs = await this.prisma.proof.findMany({
            where: { milestoneId },
            include: {
                verifications: {
                    include: {
                        verifier: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return proofs;
    }

    async getProofById(id: string) {
        const proof = await this.prisma.proof.findUnique({
            where: { id },
            include: {
                milestone: {
                    include: {
                        project: {
                            include: {
                                organizer: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                    },
                                },
                            },
                        },
                    },
                },
                verifications: {
                    include: {
                        verifier: {
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

        if (!proof) {
            throw new NotFoundException(`Proof with ID ${id} not found`);
        }

        return proof;
    }

    async verifyProof(
        proofId: string,
        verifierId: string,
        verifyDto: { vote: 'APPROVE' | 'REJECT'; comment?: string },
    ) {
        // Check if proof exists
        const proof = await this.getProofById(proofId);

        // Check if user already voted
        const existingVote = await this.prisma.verification.findUnique({
            where: {
                proofId_verifierId: {
                    proofId,
                    verifierId,
                },
            },
        });

        if (existingVote) {
            throw new Error('You have already voted on this proof');
        }

        // Create verification vote
        const verification = await this.prisma.verification.create({
            data: {
                proofId,
                verifierId,
                vote: verifyDto.vote as VoteType,
                comment: verifyDto.comment,
            },
        });

        // Check if milestone approval threshold is met
        const milestone = await this.prisma.milestone.findUnique({
            where: { id: proof.milestoneId },
            include: {
                proofs: {
                    include: {
                        verifications: true,
                    },
                },
            },
        });

        if (!milestone) {
            throw new NotFoundException('Milestone not found');
        }

        const approvalCount = await this.prisma.verification.count({
            where: {
                proofId,
                vote: VoteType.APPROVE,
            },
        });

        // Update proof status based on votes
        if (approvalCount >= milestone.requiredApprovals) {
            await this.prisma.proof.update({
                where: { id: proofId },
                data: { status: ProofStatus.VERIFIED },
            });

            // TODO: Trigger blockchain milestone approval
            // TODO: Emit event for fund release
        }

        return verification;
    }
}
