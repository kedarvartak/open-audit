import { Injectable, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService implements OnModuleInit {
    private minioClient: Minio.Client;
    private bucketName = 'gdg-proofs';

    constructor(private configService: ConfigService) {
        this.minioClient = new Minio.Client({
            endPoint: this.configService.get('MINIO_ENDPOINT') || 'localhost',
            port: parseInt(this.configService.get('MINIO_PORT') || '9000'),
            useSSL: this.configService.get('MINIO_USE_SSL') === 'true',
            accessKey: this.configService.get('MINIO_ACCESS_KEY') || 'minioadmin',
            secretKey: this.configService.get('MINIO_SECRET_KEY') || 'minioadmin',
        });
    }

    async onModuleInit() {
        await this.ensureBucket();
    }

    private async ensureBucket() {
        try {
            const exists = await this.minioClient.bucketExists(this.bucketName);
            if (!exists) {
                await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
                console.log(`Bucket ${this.bucketName} created.`);
            }
        } catch (err) {
            console.error('Error ensuring bucket exists:', err);
        }
    }

    async uploadFile(filename: string, buffer: Buffer, mimetype: string): Promise<string> {
        await this.minioClient.putObject(this.bucketName, filename, buffer, buffer.length, {
            'Content-Type': mimetype,
        });
        // Return the URL (assuming localhost access for now)
        // In production, this would be a presigned URL or a public URL via Nginx
        return `http://localhost:9000/${this.bucketName}/${filename}`;
    }

    async getFileUrl(filename: string): Promise<string> {
        return await this.minioClient.presignedGetObject(this.bucketName, filename, 24 * 60 * 60);
    }
}
