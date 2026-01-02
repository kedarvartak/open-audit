import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix
  app.setGlobalPrefix('v0');

  // Enable CORS for web and mobile clients
  app.enableCors({
    origin: [
      'http://localhost:5173',           // Vite dev server
      'http://localhost:3000',           // Alternative local
      'https://localhost:5173',
      /\.up\.railway\.app$/,             // Railway deployments
      /\.vercel\.app$/,                  // Vercel deployments
      /\.netlify\.app$/,                 // Netlify deployments
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error for non-whitelisted properties
      transform: true, // Auto-transform payloads to DTO instances
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: http://localhost:${process.env.PORT ?? 3000}/v0`);
}
bootstrap();
