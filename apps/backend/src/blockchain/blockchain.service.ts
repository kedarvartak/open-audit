import { Injectable, OnModuleInit } from '@nestjs/common';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BlockchainService implements OnModuleInit {
    private provider: ethers.JsonRpcProvider;
    private wallet: ethers.Wallet;
    private factoryContract: ethers.Contract;
    private factoryAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // Deployed address

    constructor() {
        this.provider = new ethers.JsonRpcProvider('http://localhost:8545');
        // Use the first account from Anvil (Private Key #0)
        this.wallet = new ethers.Wallet(
            '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
            this.provider,
        );
    }

    async onModuleInit() {
        const factoryAbiPath = path.resolve(
            __dirname,
            '../../../../../packages/contracts/artifacts/contracts/ProjectFactory.sol/ProjectFactory.json',
        );

        // Check if file exists, if not, we might be in dist/apps/backend... adjust path
        // For dev mode, this path should work relative to src/blockchain

        if (fs.existsSync(factoryAbiPath)) {
            const factoryArtifact = JSON.parse(fs.readFileSync(factoryAbiPath, 'utf8'));
            this.factoryContract = new ethers.Contract(
                this.factoryAddress,
                factoryArtifact.abi,
                this.wallet,
            );
            console.log('BlockchainService initialized with Factory:', this.factoryAddress);
        } else {
            console.error('Factory ABI not found at:', factoryAbiPath);
        }
    }

    async createProjectOnChain(title: string) {
        if (!this.factoryContract) return null;
        try {
            const tx = await this.factoryContract.createProject(title);
            const receipt = await tx.wait();
            // Parse logs to get the new project address
            // For now, just return the hash
            return receipt.hash;
        } catch (error) {
            console.error('Error creating project on chain:', error);
            throw error;
        }
    }
}
