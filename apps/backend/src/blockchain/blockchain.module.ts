import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlockchainService } from './blockchain.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [BlockchainService],
  exports: [BlockchainService],
})
export class BlockchainModule { }
