import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { AiVerificationService } from './ai-verification.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';

@Module({
    imports: [PrismaModule, StorageModule],
    controllers: [TasksController],
    providers: [TasksService, AiVerificationService],
    exports: [TasksService],
})
export class TasksModule { }
