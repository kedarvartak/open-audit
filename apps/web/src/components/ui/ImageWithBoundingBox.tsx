import React from 'react';

interface BoundingBox {
    x: number;      // percentage (0-100)
    y: number;      // percentage (0-100)
    width: number;  // percentage (0-100)
    height: number; // percentage (0-100)
}

interface ImageWithBoundingBoxProps {
    src: string;
    alt: string;
    bbox?: BoundingBox;
    boxColor?: 'orange' | 'green' | 'red';
    label?: string;
    sublabel?: string;
    className?: string;
}

export const ImageWithBoundingBox: React.FC<ImageWithBoundingBoxProps> = ({
    src,
    alt,
    bbox,
    boxColor = 'orange',
    label,
    sublabel,
    className = ''
}) => {
    const colorMap = {
        orange: {
            stroke: '#f97316',  // orange-500
            fill: 'rgba(249, 115, 22, 0.1)',
            text: '#f97316'
        },
        green: {
            stroke: '#22c55e',  // green-500
            fill: 'rgba(34, 197, 94, 0.1)',
            text: '#22c55e'
        },
        red: {
            stroke: '#ef4444',  // red-500
            fill: 'rgba(239, 68, 68, 0.1)',
            text: '#ef4444'
        }
    };

    const colors = colorMap[boxColor];

    return (
        <div className={`relative ${className}`}>
            <img
                src={src}
                alt={alt}
                className="w-full h-full object-contain"
            />
            {bbox && (
                <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    preserveAspectRatio="xMidYMid meet"
                    viewBox="0 0 100 100"
                    style={{ overflow: 'visible' }}
                >
                    {/* Animated bounding box */}
                    <rect
                        x={bbox.x}
                        y={bbox.y}
                        width={bbox.width}
                        height={bbox.height}
                        fill={colors.fill}
                        stroke={colors.stroke}
                        strokeWidth="0.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="animate-pulse"
                        style={{
                            animation: 'none',
                            filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.3))'
                        }}
                    />

                    {/* Corner accents for a more premium look */}
                    <g stroke={colors.stroke} strokeWidth="0.8" fill="none">
                        {/* Top-left corner */}
                        <path d={`M ${bbox.x} ${bbox.y + 3} L ${bbox.x} ${bbox.y} L ${bbox.x + 3} ${bbox.y}`} />
                        {/* Top-right corner */}
                        <path d={`M ${bbox.x + bbox.width - 3} ${bbox.y} L ${bbox.x + bbox.width} ${bbox.y} L ${bbox.x + bbox.width} ${bbox.y + 3}`} />
                        {/* Bottom-left corner */}
                        <path d={`M ${bbox.x} ${bbox.y + bbox.height - 3} L ${bbox.x} ${bbox.y + bbox.height} L ${bbox.x + 3} ${bbox.y + bbox.height}`} />
                        {/* Bottom-right corner */}
                        <path d={`M ${bbox.x + bbox.width - 3} ${bbox.y + bbox.height} L ${bbox.x + bbox.width} ${bbox.y + bbox.height} L ${bbox.x + bbox.width} ${bbox.y + bbox.height - 3}`} />
                    </g>

                    {/* Label background */}
                    {label && (
                        <>
                            <rect
                                x={bbox.x}
                                y={Math.max(0, bbox.y - 6)}
                                width={Math.min(bbox.width, 25)}
                                height="5"
                                fill={colors.stroke}
                                rx="0.5"
                            />
                            <text
                                x={bbox.x + 1}
                                y={Math.max(0, bbox.y - 2.5)}
                                fill="white"
                                fontSize="3"
                                fontWeight="bold"
                                fontFamily="system-ui, sans-serif"
                            >
                                {label}
                            </text>
                        </>
                    )}

                    {/* Sublabel (e.g., confidence) */}
                    {sublabel && (
                        <text
                            x={bbox.x + bbox.width + 1}
                            y={bbox.y + 4}
                            fill={colors.text}
                            fontSize="3"
                            fontWeight="600"
                            fontFamily="system-ui, sans-serif"
                            style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))' }}
                        >
                            {sublabel}
                        </text>
                    )}
                </svg>
            )}
        </div>
    );
};
