import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import FormData from 'form-data';
import axios from 'axios';
import * as fs from 'fs';

@Injectable()
export class AiVerificationService {
    private readonly aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8003';

    async analyzeDefect(beforeImagePath: string, afterImagePath: string) {
        try {
            const formData = new FormData();

            // Add images to form data
            formData.append('before_image', fs.createReadStream(beforeImagePath));
            formData.append('after_image', fs.createReadStream(afterImagePath));

            // Call AI service
            const response = await axios.post(
                `${this.aiServiceUrl}/analyze`,
                formData,
                {
                    headers: formData.getHeaders(),
                    timeout: 60000, // 60 second timeout
                }
            );

            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            console.error('AI Service Error:', error.message);
            throw new HttpException(
                {
                    success: false,
                    message: 'Failed to analyze defect with AI',
                    error: error.message,
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async verifyRepair(proofId: string, beforeImagePath: string, afterImagePath: string) {
        const result = await this.analyzeDefect(beforeImagePath, afterImagePath);

        if (!result.success) {
            return {
                verified: false,
                confidence: 0,
                reason: 'AI analysis failed',
            };
        }

        const aiData = result.data;
        const phase1 = aiData.phase1_groq || {};
        const phase2 = aiData.phase2_deep_learning || {};

        return {
            verified: phase2.is_fixed === true,
            confidence: phase2.confidence || 0,
            defectDescription: phase1.description || 'Unknown defect',
            defectLocation: phase1.location_pixels || null,
            featureDistance: phase2.feature_distance || 0,
            verdict: phase2.verdict || 'UNKNOWN',
            summary: aiData.summary || '',
            annotatedBeforeImage: aiData.before_image_annotated || null,
            annotatedAfterImage: aiData.after_image_annotated || null,
        };
    }
}
