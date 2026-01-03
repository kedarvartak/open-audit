import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import * as path from 'path';
import * as fs from 'fs';

// Project root - stable in both local dev and production
const PROJECT_ROOT = process.cwd();

// Load TaskEscrow ABI - search multiple locations for dev/prod compatibility
const findABI = (): any | null => {
    const locations = [
        // Production (compiled) - dist folder
        path.join(PROJECT_ROOT, 'dist', 'contracts', 'abi', 'TaskEscrow.json'),

        // Local development - src folder
        path.join(PROJECT_ROOT, 'src', 'contracts', 'abi', 'TaskEscrow.json'),

        // Alternative: apps/backend path (for monorepo root execution)
        path.join(PROJECT_ROOT, 'apps', 'backend', 'dist', 'contracts', 'abi', 'TaskEscrow.json'),
        path.join(PROJECT_ROOT, 'apps', 'backend', 'src', 'contracts', 'abi', 'TaskEscrow.json'),
    ];

    for (const loc of locations) {
        if (fs.existsSync(loc)) {
            console.log(`Found TaskEscrow ABI at: ${loc}`);
            return JSON.parse(fs.readFileSync(loc, 'utf-8'));
        }
    }

    // Graceful failure - don't crash the app
    console.warn('TaskEscrow ABI not found. Blockchain features will be disabled.');
    console.warn('Searched locations:', locations);
    return null;
};

const TaskEscrowABI = findABI();

@Injectable()
export class BlockchainService {
    private readonly logger = new Logger(BlockchainService.name);
    private provider: ethers.JsonRpcProvider | null = null;
    private wallet: ethers.Wallet | null = null;
    private taskEscrowContract: ethers.Contract | null = null;
    private isEnabled: boolean = false;

    constructor(private configService: ConfigService) {
        // Check if ABI was found
        if (!TaskEscrowABI) {
            this.logger.warn('Blockchain service disabled - ABI not found');
            return;
        }

        const rpcUrl = this.configService.get<string>('BLOCKCHAIN_RPC_URL', 'http://localhost:8545');
        const privateKey = this.configService.get<string>(
            'BLOCKCHAIN_PRIVATE_KEY',
            '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
        );
        const contractAddress = this.configService.get<string>('TASKESCROW_CONTRACT_ADDRESS');

        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.wallet = new ethers.Wallet(privateKey, this.provider);

        if (contractAddress && TaskEscrowABI?.abi) {
            this.taskEscrowContract = new ethers.Contract(
                contractAddress,
                TaskEscrowABI.abi,
                this.wallet
            );
            this.isEnabled = true;
            this.logger.log('Blockchain service initialized');
            this.logger.log(`Contract address: ${contractAddress}`);
            this.logger.log(`Wallet address: ${this.wallet.address}`);
        } else {
            this.logger.warn('TASKESCROW_CONTRACT_ADDRESS not configured - blockchain recording disabled');
        }
    }

    // Record task creation on blockchain
    async recordTaskCreation(
        taskId: string,
        clientAddress: string,
        amountINR: number,
        stripePaymentIntentId: string,
    ): Promise<string | null> {
        if (!this.taskEscrowContract) {
            this.logger.warn('Blockchain recording skipped - contract not configured');
            return null;
        }

        try {
            const taskIdHash = ethers.keccak256(ethers.toUtf8Bytes(taskId));

            this.logger.log(`Recording task creation: ${taskId}`);

            const tx = await this.taskEscrowContract.recordTaskCreation(
                taskIdHash,
                clientAddress || this.wallet?.address || '', // Use wallet address if no client address
                amountINR,
                stripePaymentIntentId || ''
            );

            const receipt = await tx.wait();
            this.logger.log(`Task created on blockchain. Tx: ${receipt.hash}`);

            return receipt.hash;
        } catch (error) {
            this.logger.error('Failed to record task creation', error);
            return null;
        }
    }

    // Record task acceptance
    async recordTaskAcceptance(
        taskId: string,
        workerAddress: string,
    ): Promise<string | null> {
        if (!this.taskEscrowContract) return null;

        try {
            const taskIdHash = ethers.keccak256(ethers.toUtf8Bytes(taskId));

            const tx = await this.taskEscrowContract.recordTaskAcceptance(
                taskIdHash,
                workerAddress || this.wallet?.address || ''
            );

            const receipt = await tx.wait();
            this.logger.log(`Task acceptance recorded. Tx: ${receipt.hash}`);

            return receipt.hash;
        } catch (error) {
            this.logger.error('Failed to record task acceptance', error);
            return null;
        }
    }

    // Record work submission with image hashes
    async recordWorkSubmission(
        taskId: string,
        beforeImageHash: string,
        afterImageHash: string,
    ): Promise<string | null> {
        if (!this.taskEscrowContract) return null;

        try {
            const taskIdHash = ethers.keccak256(ethers.toUtf8Bytes(taskId));

            const tx = await this.taskEscrowContract.recordWorkSubmission(
                taskIdHash,
                beforeImageHash,
                afterImageHash
            );

            const receipt = await tx.wait();
            this.logger.log(`Work submission recorded. Tx: ${receipt.hash}`);

            return receipt.hash;
        } catch (error) {
            this.logger.error('Failed to record work submission', error);
            return null;
        }
    }

    // Record AI verification
    async recordAIVerification(
        taskId: string,
        confidence: number,
        approved: boolean,
    ): Promise<string | null> {
        if (!this.taskEscrowContract) return null;

        try {
            const taskIdHash = ethers.keccak256(ethers.toUtf8Bytes(taskId));
            const confidenceUint8 = Math.min(Math.max(Math.floor(confidence * 100), 0), 100);

            const tx = await this.taskEscrowContract.recordAIVerification(
                taskIdHash,
                confidenceUint8,
                approved
            );

            const receipt = await tx.wait();
            this.logger.log(`AI verification recorded (${confidenceUint8}%). Tx: ${receipt.hash}`);

            return receipt.hash;
        } catch (error) {
            this.logger.error('Failed to record AI verification', error);
            return null;
        }
    }

    // Record payment release
    async recordPaymentRelease(
        taskId: string,
        stripeTransferId: string,
    ): Promise<string | null> {
        if (!this.taskEscrowContract) return null;

        try {
            const taskIdHash = ethers.keccak256(ethers.toUtf8Bytes(taskId));

            const tx = await this.taskEscrowContract.recordPaymentRelease(
                taskIdHash,
                stripeTransferId || ''
            );

            const receipt = await tx.wait();
            this.logger.log(`Payment release recorded. Tx: ${receipt.hash}`);

            return receipt.hash;
        } catch (error) {
            this.logger.error('Failed to record payment release', error);
            return null;
        }
    }

    // Record dispute
    async recordDispute(
        taskId: string,
        reason: string,
    ): Promise<string | null> {
        if (!this.taskEscrowContract) return null;

        try {
            const taskIdHash = ethers.keccak256(ethers.toUtf8Bytes(taskId));

            const tx = await this.taskEscrowContract.recordDispute(
                taskIdHash,
                reason
            );

            const receipt = await tx.wait();
            this.logger.log(`Dispute recorded. Tx: ${receipt.hash}`);

            return receipt.hash;
        } catch (error) {
            this.logger.error('Failed to record dispute', error);
            return null;
        }
    }

    // Get task audit from blockchain (public function)
    async getTaskAudit(taskId: string): Promise<any> {
        if (!this.taskEscrowContract) return null;

        try {
            const taskIdHash = ethers.keccak256(ethers.toUtf8Bytes(taskId));
            const audit = await this.taskEscrowContract.getTaskAudit(taskIdHash);

            return {
                client: audit[0],
                worker: audit[1],
                amountINR: Number(audit[2]),
                status: Number(audit[3]),
                createdAt: Number(audit[4]),
                completedAt: Number(audit[5]),
                beforeImageHash: audit[6],
                afterImageHash: audit[7],
                aiConfidence: Number(audit[8]),
                stripePaymentIntentId: audit[9],
                stripeTransferId: audit[10],
            };
        } catch (error) {
            this.logger.error('Failed to get task audit', error);
            return null;
        }
    }
}
