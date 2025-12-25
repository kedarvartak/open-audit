import { Module } from '@nestjs/common';
import { ProofsController } from './proofs.controller';
import { ProofsService } from './proofs.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
    imports: [PrismaModule, StorageModule, BlockchainModule],
    controllers: [ProofsController],
    providers: [ProofsService],
    exports: [ProofsService],
})
export class ProofsModule { }
