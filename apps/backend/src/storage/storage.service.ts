import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as crypto from 'crypto';

@Injectable()
export class StorageService implements OnModuleInit {
    private readonly logger = new Logger(StorageService.name);
    private isConfigured = false;

    constructor(private configService: ConfigService) { }

    async onModuleInit() {
        try {
            const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
            const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
            const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

            if (!cloudName || !apiKey || !apiSecret) {
                this.logger.warn('Cloudinary credentials not configured - storage disabled');
                this.logger.warn(`  CLOUDINARY_CLOUD_NAME: ${cloudName ? 'set' : 'missing'}`);
                this.logger.warn(`  CLOUDINARY_API_KEY: ${apiKey ? 'set' : 'missing'}`);
                this.logger.warn(`  CLOUDINARY_API_SECRET: ${apiSecret ? 'set' : 'missing'}`);
                return;
            }

            // Configure Cloudinary
            cloudinary.config({
                cloud_name: cloudName,
                api_key: apiKey,
                api_secret: apiSecret,
                secure: true, // Use HTTPS
            });

            this.isConfigured = true;
            this.logger.log(`Cloudinary initialized for cloud: ${cloudName}`);

        } catch (error) {
            this.logger.error('Failed to initialize Cloudinary:', error.message);
        }
    }

    /**
     * Upload file to Cloudinary
     * @param file - Multer file object
     * @param folder - Folder path in Cloudinary
     * @returns Public URL of the uploaded file
     */
    async uploadFile(
        file: Express.Multer.File,
        folder: string,
    ): Promise<string> {
        if (!this.isConfigured) {
            throw new Error('Cloudinary not configured. Check your environment variables.');
        }

        return new Promise((resolve, reject) => {
            // Generate unique public_id
            const timestamp = Date.now();
            const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^/.]+$/, '');
            const publicId = `${folder}/${timestamp}-${safeName}`;

            // Upload using upload_stream for buffer data
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: folder,
                    public_id: `${timestamp}-${safeName}`,
                    resource_type: 'auto', // Automatically detect image/video
                    overwrite: true,
                },
                (error, result: UploadApiResponse | undefined) => {
                    if (error) {
                        this.logger.error(`Cloudinary upload failed: ${error.message}`);
                        reject(error);
                    } else if (result) {
                        this.logger.log(`File uploaded: ${result.secure_url}`);
                        resolve(result.secure_url);
                    } else {
                        reject(new Error('Cloudinary upload returned no result'));
                    }
                }
            );

            // Write the buffer to the upload stream
            uploadStream.end(file.buffer);
        });
    }

    /**
     * Get SHA-256 hash of file buffer (for blockchain verification)
     * @param buffer - File buffer
     * @returns SHA-256 hash as hex string
     */
    async getFileHash(buffer: Buffer): Promise<string> {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    /**
     * Delete a file from Cloudinary
     * @param publicIdOrUrl - Cloudinary public_id or full URL
     */
    async deleteFile(publicIdOrUrl: string): Promise<void> {
        if (!this.isConfigured) {
            throw new Error('Cloudinary not configured');
        }

        try {
            // Extract public_id from URL if full URL is provided
            let publicId = publicIdOrUrl;

            if (publicIdOrUrl.includes('cloudinary.com')) {
                // URL format: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{folder}/{filename}.{ext}
                const matches = publicIdOrUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
                if (matches && matches[1]) {
                    publicId = matches[1];
                }
            }

            await cloudinary.uploader.destroy(publicId);
            this.logger.log(`File deleted: ${publicId}`);
        } catch (error) {
            this.logger.error(`Failed to delete file: ${publicIdOrUrl}`, error.message);
            throw error;
        }
    }

    /**
     * Get a file from Cloudinary as buffer
     * @param url - Cloudinary URL
     * @returns File buffer
     */
    async getFile(url: string): Promise<Buffer> {
        try {
            // Fetch the file from Cloudinary URL
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to fetch file: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        } catch (error) {
            this.logger.error(`Failed to get file: ${url}`, error.message);
            throw error;
        }
    }

    /**
     * Generate an optimized URL with transformations
     * @param publicIdOrUrl - Cloudinary public_id or URL
     * @param options - Transformation options
     * @returns Transformed URL
     */
    getOptimizedUrl(
        publicIdOrUrl: string,
        options: {
            width?: number;
            height?: number;
            quality?: number | 'auto';
            format?: 'auto' | 'webp' | 'jpg' | 'png';
        } = {}
    ): string {
        if (!this.isConfigured) {
            return publicIdOrUrl; // Return original if not configured
        }

        // Extract public_id if URL is provided
        let publicId = publicIdOrUrl;
        if (publicIdOrUrl.includes('cloudinary.com')) {
            const matches = publicIdOrUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
            if (matches && matches[1]) {
                publicId = matches[1];
            }
        }

        // Build transformation
        const transformations: string[] = [];

        if (options.width) transformations.push(`w_${options.width}`);
        if (options.height) transformations.push(`h_${options.height}`);
        if (options.quality) transformations.push(`q_${options.quality}`);
        if (options.format) transformations.push(`f_${options.format}`);

        // Default optimizations
        if (transformations.length === 0) {
            transformations.push('q_auto', 'f_auto');
        }

        return cloudinary.url(publicId, {
            transformation: transformations.join(','),
            secure: true,
        });
    }
}
