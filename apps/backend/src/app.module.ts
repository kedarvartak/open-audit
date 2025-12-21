import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { BlockchainModule } from './blockchain/blockchain.module';

@Module({
  imports: [AuthModule, PrismaModule, ProjectsModule, BlockchainModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
