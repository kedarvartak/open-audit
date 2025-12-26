import { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

interface AiVerificationResult {
    verified: boolean;
    confidence: number;
    defectDescription: string;
    defectLocation: number[] | null;
    featureDistance: number;
    verdict: string;
    summary: string;
    annotatedBeforeImage: string | null;
    annotatedAfterImage: string | null;
}

export function useAiVerification() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AiVerificationResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const verifyProof = async (proofId: string) => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                `${API_BASE_URL}/proofs/${proofId}/ai-verify`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setResult(response.data);
            return response.data;
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || err.message || 'AI verification failed';
            setError(errorMsg);
            throw new Error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setResult(null);
        setError(null);
        setLoading(false);
    };

    return {
        verifyProof,
        loading,
        result,
        error,
        reset
    };
}
