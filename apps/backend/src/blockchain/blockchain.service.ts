import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { PrismaService } from '../prisma/prisma.service';
import { MilestoneStatus, ProofStatus } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

// Load Contract ABIs
const contractsPath = path.join(__dirname, '..', 'contracts', 'artifacts', 'contracts');
const ProjectFactoryABI = JSON.parse(
    fs.readFileSync(path.join(contractsPath, 'ProjectFactory.sol', 'ProjectFactory.json'), 'utf-8')
).abi;
const ProjectABI = JSON.parse(
    fs.readFileSync(path.join(contractsPath, 'Project.sol', 'Project.json'), 'utf-8')
).abi;

@Injectable()
export class BlockchainService implements OnModuleInit {
    private readonly logger = new Logger(BlockchainService.name);
    private provider: ethers.JsonRpcProvider;
    private wallet: ethers.Wallet;
    private factoryContract: ethers.Contract;

    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
    ) {
        // Initialize provider and wallet
        const rpcUrl = this.configService.get<string>('BLOCKCHAIN_RPC_URL', 'http://localhost:8545');
        const privateKey = this.configService.get<string>(
            'BLOCKCHAIN_PRIVATE_KEY',
            '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' // Hardhat account #0
        );

        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.wallet = new ethers.Wallet(privateKey, this.provider);

        // Initialize factory contract
        const factoryAddress = this.configService.get<string>('BLOCKCHAIN_FACTORY_ADDRESS');
        if (!factoryAddress) {
            throw new Error('BLOCKCHAIN_FACTORY_ADDRESS not configured');
        }
        this.factoryContract = new ethers.Contract(factoryAddress, ProjectFactoryABI, this.wallet);

        this.logger.log('🔗 Blockchain service initialized');
        this.logger.log(`📍 Factory contract: ${factoryAddress}`);
        this.logger.log(`👤 Wallet address: ${this.wallet.address}`);
    }

    async onModuleInit() {
        // Start listening to events
        this.startEventListeners();
    }

    /**
     * Deploy a new Project contract via the factory
     */
    async createProject(
        organizerAddress: string,
        title: string,
        description: string,
        fundingGoal: number,
    ): Promise<string> {
        try {
            this.logger.log(`🏗️  Creating project: ${title}`);

            // Convert funding goal to wei equivalent
            const fundingGoalWei = ethers.parseEther(fundingGoal.toString());

            // Call factory to create project
            const tx = await this.factoryContract.createProject(
                organizerAddress,
                title,
                description,
                fundingGoalWei,
            );

            const receipt = await tx.wait();

            // Extract project address from event
            const event = receipt.logs.find((log: any) => {
                try {
                    return this.factoryContract.interface.parseLog(log)?.name === 'ProjectCreated';
                } catch {
                    return false;
                }
            });

            if (event) {
                const parsedEvent = this.factoryContract.interface.parseLog(event);
                if (!parsedEvent) throw new Error('Failed to parse event');
                const projectAddress = parsedEvent.args[0];

                this.logger.log(`✅ Project deployed at: ${projectAddress}`);
                return projectAddress;
            }

            throw new Error('ProjectCreated event not found in transaction receipt');
        } catch (error) {
            this.logger.error('❌ Failed to create project on blockchain:', error);
            throw error;
        }
    }

    /**
     * Create a milestone in the Project contract
     */
    async createMilestone(
        projectAddress: string,
        title: string,
        description: string,
        requiredApprovals: number,
    ): Promise<number> {
        try {
            const projectContract = new ethers.Contract(projectAddress, ProjectABI, this.wallet);

            this.logger.log(`📝 Creating milestone: ${title} for project ${projectAddress}`);

            const tx = await projectContract.createMilestone(title, description, requiredApprovals);
            const receipt = await tx.wait();

            // Get milestone ID from event
            const event = receipt.logs.find((log: any) => {
                try {
                    return projectContract.interface.parseLog(log)?.name === 'MilestoneCreated';
                } catch {
                    return false;
                }
            });

            if (event) {
                const parsedEvent = projectContract.interface.parseLog(event);
                if (!parsedEvent) throw new Error('Failed to parse event');
                const milestoneId = Number(parsedEvent.args[0]);

                this.logger.log(`✅ Milestone created with ID: ${milestoneId}`);
                return milestoneId;
            }

            throw new Error('MilestoneCreated event not found');
        } catch (error) {
            this.logger.error('❌ Failed to create milestone:', error);
            throw error;
        }
    }

    /**
     * Submit proof to the blockchain
     */
    async submitProof(
        projectAddress: string,
        milestoneId: number,
        beforeImageHash: string,
        afterImageHash: string,
        gpsCoordinates: string,
    ): Promise<string> {
        try {
            const projectContract = new ethers.Contract(projectAddress, ProjectABI, this.wallet);

            this.logger.log(`📸 Submitting proof for milestone ${milestoneId}`);

            // Convert hashes to bytes32
            const beforeHash = ethers.keccak256(ethers.toUtf8Bytes(beforeImageHash));
            const afterHash = ethers.keccak256(ethers.toUtf8Bytes(afterImageHash));

            const tx = await projectContract.submitProof(
                milestoneId,
                beforeHash,
                afterHash,
                gpsCoordinates,
            );

            const receipt = await tx.wait();

            this.logger.log(`✅ Proof submitted. Tx hash: ${receipt.hash}`);
            return receipt.hash;
        } catch (error) {
            this.logger.error('❌ Failed to submit proof:', error);
            throw error;
        }
    }

    /**
     * Add a verifier to the project
     */
    async addVerifier(projectAddress: string, verifierAddress: string): Promise<void> {
        try {
            const projectContract = new ethers.Contract(projectAddress, ProjectABI, this.wallet);

            this.logger.log(`👤 Adding verifier ${verifierAddress} to project ${projectAddress}`);

            const tx = await projectContract.addVerifier(verifierAddress);
            await tx.wait();

            this.logger.log(`✅ Verifier added successfully`);
        } catch (error) {
            this.logger.error('❌ Failed to add verifier:', error);
            throw error;
        }
    }

    /**
     * Cast a vote on a proof
     */
    async voteOnProof(
        projectAddress: string,
        milestoneId: number,
        approve: boolean,
    ): Promise<string> {
        try {
            const projectContract = new ethers.Contract(projectAddress, ProjectABI, this.wallet);

            this.logger.log(`🗳️  Voting on milestone ${milestoneId}: ${approve ? 'APPROVE' : 'REJECT'}`);

            const tx = await projectContract.voteOnProof(milestoneId, approve);
            const receipt = await tx.wait();

            this.logger.log(`✅ Vote cast. Tx hash: ${receipt.hash}`);
            return receipt.hash;
        } catch (error) {
            this.logger.error('❌ Failed to vote:', error);
            throw error;
        }
    }

    /**
     * Start listening to blockchain events
     */
    private startEventListeners() {
        this.logger.log('👂 Starting blockchain event listeners...');

        // Listen for MilestoneApproved events
        this.factoryContract.on('ProjectCreated', async (projectAddress, organizer, title) => {
            this.logger.log(`🔔 ProjectCreated event: ${projectAddress}`);
            // Event is handled during project creation
        });

        this.logger.log('✅ Event listeners started');
    }

    /**
     * Listen to events for a specific project
     */
    async listenToProjectEvents(projectAddress: string, projectId: string) {
        const projectContract = new ethers.Contract(projectAddress, ProjectABI, this.wallet);

        // Listen for MilestoneApproved
        projectContract.on('MilestoneApproved', async (milestoneId, approvalCount, timestamp) => {
            this.logger.log(`🎉 Milestone ${milestoneId} approved in project ${projectAddress}`);

            try {
                // Update database
                const milestone = await this.prisma.milestone.findFirst({
                    where: {
                        blockchainMilestoneId: Number(milestoneId),
                        project: { contractAddress: projectAddress },
                    },
                });

                if (milestone) {
                    await this.prisma.milestone.update({
                        where: { id: milestone.id },
                        data: { status: MilestoneStatus.APPROVED },
                    });

                    // Update associated proof status
                    await this.prisma.proof.updateMany({
                        where: { milestoneId: milestone.id },
                        data: { status: ProofStatus.VERIFIED },
                    });

                    this.logger.log(`✅ Database updated for approved milestone ${milestone.id}`);

                    // TODO: Trigger fund release via payment gateway
                    // await this.paymentService.releaseFunds(milestone.id);
                }
            } catch (error) {
                this.logger.error('❌ Failed to handle MilestoneApproved event:', error);
            }
        });

        // Listen for MilestoneRejected
        projectContract.on('MilestoneRejected', async (milestoneId, rejectionCount) => {
            this.logger.log(`❌ Milestone ${milestoneId} rejected in project ${projectAddress}`);

            try {
                const milestone = await this.prisma.milestone.findFirst({
                    where: {
                        blockchainMilestoneId: Number(milestoneId),
                        project: { contractAddress: projectAddress },
                    },
                });

                if (milestone) {
                    await this.prisma.milestone.update({
                        where: { id: milestone.id },
                        data: { status: MilestoneStatus.REJECTED },
                    });

                    await this.prisma.proof.updateMany({
                        where: { milestoneId: milestone.id },
                        data: { status: ProofStatus.REJECTED },
                    });

                    this.logger.log(`✅ Database updated for rejected milestone ${milestone.id}`);
                }
            } catch (error) {
                this.logger.error('❌ Failed to handle MilestoneRejected event:', error);
            }
        });

        this.logger.log(`✅ Listening to events for project ${projectAddress}`);
    }

    /**
     * Get project details from blockchain
     */
    async getProjectDetails(projectAddress: string) {
        const projectContract = new ethers.Contract(projectAddress, ProjectABI, this.provider);

        const [organizer, title, description, fundingGoal, createdAt] = await Promise.all([
            projectContract.organizer(),
            projectContract.title(),
            projectContract.description(),
            projectContract.fundingGoal(),
            projectContract.createdAt(),
        ]);

        return {
            organizer,
            title,
            description,
            fundingGoal: ethers.formatEther(fundingGoal),
            createdAt: Number(createdAt),
        };
    }
}
