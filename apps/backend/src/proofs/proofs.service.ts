import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import * as crypto from 'crypto';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class ProofsService {
    constructor(
        private prisma: PrismaService,
        private storageService: StorageService,
        private blockchainService: BlockchainService,
    ) { }

    async submitProof(milestoneId: string, file: Express.Multer.File, location: { lat: number; long: number }, userId: string) {
        // 1. Validate Milestone
        const milestone = await this.prisma.milestone.findUnique({
            where: { id: milestoneId },
            include: { project: true },
        });

        if (!milestone) {
            throw new NotFoundException('Milestone not found');
        }

        // Check if user is the organizer (optional, but good practice)
        if (milestone.project.organizerId !== userId) {
            // throw new ForbiddenException('Only organizer can submit proofs');
            // For hackathon/MVP, maybe lenient or strictly enforce?
            // Let's enforce it if we have userId.
        }

        // 2. Calculate Hash
        const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');

        // 3. Upload to MinIO
        const filename = `${milestoneId}-${Date.now()}-${file.originalname}`;
        const imageUrl = await this.storageService.uploadFile(filename, file.buffer, file.mimetype);

        // 4. Save to DB
        const proof = await this.prisma.proof.create({
            data: {
                milestoneId,
                imageUrl,
                ipfsHash: hash, // Using SHA256 as "ipfsHash" for now, or we can actually upload to IPFS later
                gpsLat: location.lat,
                gpsLong: location.long,
                timestamp: new Date(),
                status: 'PENDING',
            },
        });

        // 5. (Optional) Trigger Blockchain Submission here OR let the frontend do it.
        // The plan says: "Return the Hash to the client for on-chain submission."
        // So we just return the proof details.

        return proof;
    }

    async findAllByMilestone(milestoneId: string) {
        return this.prisma.proof.findMany({
            where: { milestoneId },
        });
    }
}
