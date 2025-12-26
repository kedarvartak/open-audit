import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { AiVerificationService } from './ai-verification.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
    imports: [PrismaModule, StorageModule, BlockchainModule],
    controllers: [TasksController],
    providers: [TasksService, AiVerificationService],
    exports: [TasksService],
})
export class TasksModule { }
