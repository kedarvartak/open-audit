import { Module } from '@nestjs/common';
import { ProofsController } from './proofs.controller';
import { ProofsService } from './proofs.service';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
    imports: [BlockchainModule],
    controllers: [ProofsController],
    providers: [ProofsService]
})
export class ProofsModule { }
