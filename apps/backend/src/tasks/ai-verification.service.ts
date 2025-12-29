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
                reason: 'AI analysis failed',
                details: []
            };
        }

        const aiResults = result.data; // List of results
        console.log(`[AiVerificationService] Raw AI results type: ${typeof aiResults}`);
        console.log(`[AiVerificationService] Is array? ${Array.isArray(aiResults)}`);
        if (Array.isArray(aiResults) && aiResults.length > 0) {
            console.log(`[AiVerificationService] First result keys: ${Object.keys(aiResults[0])}`);
            console.log(`[AiVerificationService] First result content: ${JSON.stringify(aiResults[0])}`);
            console.log(`[AiVerificationService] First result before_image_annotated length: ${aiResults[0].before_image_annotated?.length}`);
        }

        // Aggregate results
        let totalConfidence = 0;
        let allFixed = true;
        let details = [];

        // Handle case where aiResults might not be an array (if service error returned object)
        const resultsArray = Array.isArray(aiResults) ? aiResults : [aiResults];

        for (const res of resultsArray) {
            const phase2 = res.phase2_deep_learning || {};
            const isFixed = phase2.is_fixed === true;

            if (!isFixed) allFixed = false;
            totalConfidence += (phase2.confidence || 0);

            details.push(res);
        }

        const avgConfidence = resultsArray.length > 0 ? totalConfidence / resultsArray.length : 0;

        return {
            verified: allFixed,
            confidence: parseFloat(avgConfidence.toFixed(2)),
            verdict: allFixed ? 'FIXED' : 'NOT_FIXED',
            summary: `Analyzed ${resultsArray.length} image pairs. Verdict: ${allFixed ? 'FIXED' : 'NOT_FIXED'}`,
            details: details, // Store full list of results
            // Keep these for backward compatibility if needed, using the first result or aggregate
            defectDescription: resultsArray[0]?.phase1_groq?.description || 'Multiple defects',
            annotatedBeforeImage: resultsArray[0]?.before_image_annotated || null,
            annotatedAfterImage: resultsArray[0]?.after_image_annotated || null,
        };
    }
}
