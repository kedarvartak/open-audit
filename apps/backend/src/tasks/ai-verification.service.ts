import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import FormData from 'form-data';
import axios from 'axios';

@Injectable()
export class AiVerificationService {
    private readonly aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8003';

    async analyzeDefect(beforeImageUrls: string[], afterImageUrls: string[]) {
        console.log(`[AiVerificationService] analyzeDefect called`);
        console.log(`[AiVerificationService] Before image URLs: ${JSON.stringify(beforeImageUrls)}`);
        console.log(`[AiVerificationService] After image URLs: ${JSON.stringify(afterImageUrls)}`);
        console.log(`[AiVerificationService] AI Service URL: ${this.aiServiceUrl}`);

        try {
            const formData = new FormData();

            // Fetch and append before images
            for (let i = 0; i < beforeImageUrls.length; i++) {
                const url = beforeImageUrls[i];
                console.log(`[AiVerificationService] Fetching before image ${i}: ${url}`);
                const response = await axios.get(url, { responseType: 'stream' });
                formData.append('before_images', response.data, `before_${i}.jpg`);
            }

            // Fetch and append after images
            for (let i = 0; i < afterImageUrls.length; i++) {
                const url = afterImageUrls[i];
                console.log(`[AiVerificationService] Fetching after image ${i}: ${url}`);
                const response = await axios.get(url, { responseType: 'stream' });
                formData.append('after_images', response.data, `after_${i}.jpg`);
            }

            // Call AI service
            console.log(`[AiVerificationService] Calling AI service at: ${this.aiServiceUrl}/analyze`);
            const response = await axios.post(
                `${this.aiServiceUrl}/analyze`,
                formData,
                {
                    headers: formData.getHeaders(),
                    timeout: 120000, // 120 second timeout for batch
                }
            );

            console.log(`[AiVerificationService] AI service response received`);
            return {
                success: true,
                data: response.data, // This is now a list of results
            };
        } catch (error) {
            console.error('[AiVerificationService] AI Service Error:', error.message);
            if (error.response) {
                console.error('[AiVerificationService] Response status:', error.response.status);
                console.error('[AiVerificationService] Response data:', error.response.data);
            }
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

    async verifyRepair(taskId: string, beforeImageUrls: string[], afterImageUrls: string[]) {
        const result = await this.analyzeDefect(beforeImageUrls, afterImageUrls);

        if (!result.success) {
            return {
                verified: false,
                confidence: 0,
                verdict: 'ERROR',
                reason: 'AI analysis failed',
                details: []
            };
        }

        const aiResponse = result.data;
        console.log(`[AiVerificationService] AI Response verdict: ${aiResponse.verdict}`);
        console.log(`[AiVerificationService] Total defects: ${aiResponse.total_defects}, Fixed: ${aiResponse.fixed_count}`);

        // Handle the new flexible response structure
        // Response now has: { verdict, summary, fixed_count, total_defects, defects[], before_images[], after_images[] }

        if (aiResponse.verdict === 'NO_DEFECT') {
            return {
                verified: true,
                confidence: 1.0,
                verdict: 'NO_DEFECT',
                summary: aiResponse.summary || 'No defects detected in before images',
                details: [],
                fixed_count: 0,
                total_defects: 0
            };
        }

        // Calculate average confidence from all defects
        const defects = aiResponse.defects || [];
        let totalConfidence = 0;
        for (const defect of defects) {
            const phase2 = defect.phase2_deep_learning || {};
            totalConfidence += (phase2.confidence || 0);
        }
        const avgConfidence = defects.length > 0 ? totalConfidence / defects.length : 0;

        return {
            verified: aiResponse.verdict === 'FIXED',
            confidence: parseFloat(avgConfidence.toFixed(2)),
            verdict: aiResponse.verdict, // 'FIXED', 'PARTIAL', or 'NOT_FIXED'
            summary: aiResponse.summary,
            fixed_count: aiResponse.fixed_count || 0,
            total_defects: aiResponse.total_defects || 0,
            details: defects, // Per-defect results with bbox, before_image, after_image
            // Include raw image arrays for frontend
            before_images: aiResponse.before_images || [],
            after_images: aiResponse.after_images || []
        };
    }
}
