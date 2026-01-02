import { useAiVerification } from '../hooks/useAiVerification';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import './AiVerification.css';

interface AiVerificationProps {
    proofId: string;
    onVerificationComplete?: (result: any) => void;
}

export function AiVerification({ proofId, onVerificationComplete }: AiVerificationProps) {
    const { verifyProof, loading, result, error } = useAiVerification();

    const handleVerify = async () => {
        try {
            const verificationResult = await verifyProof(proofId);
            onVerificationComplete?.(verificationResult);
        } catch (err) {
            console.error('Verification failed:', err);
        }
    };

    return (
        <div className="ai-verification">
            <Card>
                <div className="ai-verification__header">
                    <h3>AI-Powered Verification</h3>
                    <p className="ai-verification__subtitle">
                        Automated defect detection using deep learning
                    </p>
                </div>

                <div className="ai-verification__actions">
                    <Button
                        onClick={handleVerify}
                        disabled={loading}
                        variant="default"
                        className="ai-verification__button"
                    >
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                Analyzing with AI...
                            </>
                        ) : (
                            <>
                                <span className="icon">🤖</span>
                                Run AI Verification
                            </>
                        )}
                    </Button>
                </div>

                {error && (
                    <div className="ai-verification__error">
                        <span className="icon">Error</span>
                        {error}
                    </div>
                )}

                {result && (
                    <div className="ai-verification__result">
                        <div className={`result-status ${result.verified ? 'verified' : 'not-verified'}`}>
                            <span className="status-icon">
                                {result.verified ? 'Correct' : 'Incorrect'}
                            </span>
                            <span className="status-text">
                                {result.verified ? 'VERIFIED - Repair Confirmed' : 'NOT VERIFIED - No Repair Detected'}
                            </span>
                        </div>

                        <div className="result-details">
                            <div className="detail-item">
                                <label>Confidence</label>
                                <div className="confidence-bar">
                                    <div
                                        className="confidence-fill"
                                        style={{ width: `${result.confidence * 100}%` }}
                                    />
                                    <span className="confidence-text">
                                        {(result.confidence * 100).toFixed(0)}%
                                    </span>
                                </div>
                            </div>

                            <div className="detail-item">
                                <label>Defect Description</label>
                                <p>{result.defectDescription}</p>
                            </div>

                            <div className="detail-item">
                                <label>AI Verdict</label>
                                <span className={`verdict ${result.verdict.toLowerCase()}`}>
                                    {result.verdict}
                                </span>
                            </div>

                            <div className="detail-item">
                                <label>Analysis Strength</label>
                                <p>Feature Distance: {result.featureDistance.toFixed(2)}</p>
                            </div>
                        </div>

                        {(result.annotatedBeforeImage || result.annotatedAfterImage) && (
                            <div className="annotated-images">
                                <h4>AI Analysis Results</h4>
                                <div className="images-grid">
                                    {result.annotatedBeforeImage && (
                                        <div className="image-container">
                                            <label>Before (with defect marked)</label>
                                            <img
                                                src={result.annotatedBeforeImage}
                                                alt="Before - Annotated"
                                            />
                                        </div>
                                    )}
                                    {result.annotatedAfterImage && (
                                        <div className="image-container">
                                            <label>After (with verification)</label>
                                            <img
                                                src={result.annotatedAfterImage}
                                                alt="After - Annotated"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="result-summary">
                            <p>{result.summary}</p>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
