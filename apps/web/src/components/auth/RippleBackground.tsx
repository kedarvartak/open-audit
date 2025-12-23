import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';

interface RippleBackgroundProps {
    isDark?: boolean;
}

export const RippleBackground = ({ isDark = false }: RippleBackgroundProps) => {
    const blob1Ref = useRef<HTMLDivElement>(null);
    const blob2Ref = useRef<HTMLDivElement>(null);
    const blob3Ref = useRef<HTMLDivElement>(null);
    const blob4Ref = useRef<HTMLDivElement>(null);
    const blob5Ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // GSAP timeline for complex ripple animations
        const tl = gsap.timeline({ repeat: -1, yoyo: true });

        // Blob 1 - Large flowing movement
        tl.to(blob1Ref.current, {
            x: 150,
            y: -100,
            scale: 1.3,
            duration: 8,
            ease: 'sine.inOut',
        }, 0);

        // Blob 2 - Counter movement
        gsap.to(blob2Ref.current, {
            x: -120,
            y: 140,
            scale: 1.4,
            duration: 10,
            repeat: -1,
            yoyo: true,
            ease: 'power1.inOut',
        });

        // Blob 3 - Circular motion
        gsap.to(blob3Ref.current, {
            motionPath: {
                path: [
                    { x: 0, y: 0 },
                    { x: 100, y: -80 },
                    { x: 0, y: -160 },
                    { x: -100, y: -80 },
                    { x: 0, y: 0 },
                ],
                curviness: 2,
            },
            duration: 15,
            repeat: -1,
            ease: 'none',
        });

        // Blob 4 - Pulsing and moving
        gsap.to(blob4Ref.current, {
            scale: 1.5,
            opacity: 0.4,
            duration: 6,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
        });

        // Blob 5 - Gentle wave
        gsap.to(blob5Ref.current, {
            x: 80,
            y: -60,
            rotation: 180,
            duration: 12,
            repeat: -1,
            yoyo: true,
            ease: 'power1.inOut',
        });
    }, []);

    // Light mode: darker blues/purples
    // Dark mode: lighter, more pastel tones
    const gradientColors = isDark
        ? 'linear-gradient(135deg, #E0F2FE 0%, #93C5FD 20%, #60A5FA 40%, #C4B5FD 60%, #DDD6FE 80%, #F3E8FF 100%)'
        : 'linear-gradient(135deg, #87CEEB 0%, #4A90E2 20%, #2563EB 40%, #7C3AED 60%, #A78BFA 80%, #DDD6FE 100%)';

    return (
        <div className="absolute inset-0 overflow-hidden">
            {/* Base gradient matching the reference image */}
            <div
                className="absolute inset-0"
                style={{ background: gradientColors }}
            />

            {/* Framer Motion animated gradient overlay */}
            <motion.div
                className="absolute inset-0"
                style={{
                    background: isDark
                        ? 'radial-gradient(circle at 30% 50%, rgba(224, 242, 254, 0.3) 0%, transparent 50%)'
                        : 'radial-gradient(circle at 30% 50%, rgba(135, 206, 235, 0.3) 0%, transparent 50%)',
                }}
                animate={{
                    backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: 'linear',
                }}
            />

            {/* GSAP controlled blob 1 */}
            <div
                ref={blob1Ref}
                className="absolute w-[700px] h-[700px] rounded-full opacity-60"
                style={{
                    background: isDark
                        ? 'radial-gradient(circle, rgba(224, 242, 254, 0.8) 0%, rgba(147, 197, 253, 0.4) 50%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(135, 206, 235, 0.8) 0%, rgba(74, 144, 226, 0.4) 50%, transparent 70%)',
                    filter: 'blur(80px)',
                    top: '-10%',
                    left: '-5%',
                }}
            />

            {/* GSAP controlled blob 2 */}
            <div
                ref={blob2Ref}
                className="absolute w-[600px] h-[600px] rounded-full opacity-70"
                style={{
                    background: isDark
                        ? 'radial-gradient(circle, rgba(147, 197, 253, 0.9) 0%, rgba(96, 165, 250, 0.5) 50%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(37, 99, 235, 0.9) 0%, rgba(30, 58, 138, 0.5) 50%, transparent 70%)',
                    filter: 'blur(90px)',
                    bottom: '-10%',
                    left: '10%',
                }}
            />

            {/* GSAP controlled blob 3 */}
            <div
                ref={blob3Ref}
                className="absolute w-[550px] h-[550px] rounded-full opacity-60"
                style={{
                    background: isDark
                        ? 'radial-gradient(circle, rgba(196, 181, 253, 0.8) 0%, rgba(221, 214, 254, 0.4) 50%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(124, 58, 237, 0.8) 0%, rgba(139, 92, 246, 0.4) 50%, transparent 70%)',
                    filter: 'blur(70px)',
                    top: '30%',
                    left: '40%',
                }}
            />

            {/* GSAP controlled blob 4 */}
            <div
                ref={blob4Ref}
                className="absolute w-[500px] h-[500px] rounded-full opacity-50"
                style={{
                    background: isDark
                        ? 'radial-gradient(circle, rgba(221, 214, 254, 0.7) 0%, rgba(243, 232, 255, 0.3) 50%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(167, 139, 250, 0.7) 0%, rgba(221, 214, 254, 0.3) 50%, transparent 70%)',
                    filter: 'blur(60px)',
                    top: '10%',
                    right: '5%',
                }}
            />

            {/* GSAP controlled blob 5 */}
            <div
                ref={blob5Ref}
                className="absolute w-[400px] h-[400px] rounded-full opacity-40"
                style={{
                    background: isDark
                        ? 'radial-gradient(circle, rgba(147, 197, 253, 0.6) 0%, transparent 60%)'
                        : 'radial-gradient(circle, rgba(96, 165, 250, 0.6) 0%, transparent 60%)',
                    filter: 'blur(50px)',
                    top: '50%',
                    left: '20%',
                }}
            />

            {/* Framer Motion water ripple effect overlays */}
            <motion.div
                className="absolute w-[800px] h-[800px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
                    filter: 'blur(40px)',
                    top: '20%',
                    left: '30%',
                }}
                animate={{
                    scale: [1, 1.2, 1],
                    x: [0, 50, 0],
                    y: [0, -50, 0],
                    opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />

            {/* Noise texture for depth */}
            <div
                className="absolute inset-0 opacity-[0.02] mix-blend-overlay"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
            />

            {/* Soft vignette */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10" />
        </div>
    );
};
