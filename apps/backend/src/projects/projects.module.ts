import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [BlockchainModule],
  controllers: [ProjectsController],
  providers: [ProjectsService]
})
export class ProjectsModule { }
