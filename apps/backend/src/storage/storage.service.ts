import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class StorageService implements OnModuleInit {
    private minioClient: Minio.Client;
    private bucketName: string;

    constructor(private configService: ConfigService) {
        this.bucketName = this.configService.get<string>('MINIO_BUCKET', 'proofs');

        this.minioClient = new Minio.Client({
            endPoint: this.configService.get<string>('MINIO_ENDPOINT', 'localhost'),
            port: parseInt(this.configService.get<string>('MINIO_PORT', '9000')),
            useSSL: this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true',
            accessKey: this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
            secretKey: this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
        });
    }

    async onModuleInit() {
        // Ensure bucket exists
        const exists = await this.minioClient.bucketExists(this.bucketName);
        if (!exists) {
            await this.minioClient.makeBucket(this.bucketName, 'us-east-1');

            // Set bucket policy to public read
            const policy = {
                Version: '2012-10-17',
                Statement: [
                    {
                        Effect: 'Allow',
                        Principal: { AWS: ['*'] },
                        Action: ['s3:GetObject'],
                        Resource: [`arn:aws:s3:::${this.bucketName}/*`],
                    },
                ],
            };

            await this.minioClient.setBucketPolicy(this.bucketName, JSON.stringify(policy));
        }
    }

    async uploadFile(
        fileName: string,
        fileBuffer: Buffer,
        contentType: string,
    ): Promise<string> {
        await this.minioClient.putObject(
            this.bucketName,
            fileName,
            fileBuffer,
            fileBuffer.length,
            {
                'Content-Type': contentType,
            },
        );

        // Return the public URL
        const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
        const port = this.configService.get<string>('MINIO_PORT', '9000');
        const useSSL = this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
        const protocol = useSSL ? 'https' : 'http';

        return `${protocol}://${endpoint}:${port}/${this.bucketName}/${fileName}`;
    }

    async deleteFile(fileName: string): Promise<void> {
        await this.minioClient.removeObject(this.bucketName, fileName);
    }

    async getFile(fileName: string): Promise<Buffer> {
        const stream = await this.minioClient.getObject(this.bucketName, fileName);

        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', reject);
        });
    }
}
