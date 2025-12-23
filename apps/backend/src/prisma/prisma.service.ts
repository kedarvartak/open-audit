import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

// Connects to the database
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  // ConfigService is injected so it can be used later if needed,
  // but PrismaClient is initialized with its default env-based config.
  constructor(configService: ConfigService) {
    super({
      log: ['warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
