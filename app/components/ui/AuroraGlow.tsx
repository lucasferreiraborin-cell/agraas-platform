"use client";

import { motion } from "framer-motion";

interface AuroraGlowProps {
  className?: string;
  intensity?: "subtle" | "medium" | "strong";
}

export default function AuroraGlow({
  className = "",
  intensity = "medium",
}: AuroraGlowProps) {
  const opacity =
    intensity === "subtle" ? 0.35 : intensity === "strong" ? 0.8 : 0.55;

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <motion.div
        className="absolute -top-[30%] -left-[20%] h-[80%] w-[80%] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(61, 165, 76, 0.35) 0%, rgba(46, 139, 62, 0.12) 40%, transparent 70%)",
          filter: "blur(60px)",
          opacity,
        }}
        animate={{
          x: [0, 60, -30, 0],
          y: [0, -40, 30, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute top-[10%] right-[-25%] h-[70%] w-[70%] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(46, 139, 62, 0.3) 0%, rgba(30, 94, 38, 0.1) 45%, transparent 75%)",
          filter: "blur(70px)",
          opacity,
        }}
        animate={{
          x: [0, -50, 20, 0],
          y: [0, 40, -20, 0],
          scale: [1, 0.92, 1.08, 1],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-[-15%] left-[30%] h-[60%] w-[60%] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(141, 188, 95, 0.22) 0%, rgba(46, 139, 62, 0.05) 50%, transparent 80%)",
          filter: "blur(55px)",
          opacity,
        }}
        animate={{
          x: [0, 30, -40, 0],
          y: [0, -25, 15, 0],
          scale: [1, 1.05, 0.98, 1],
        }}
        transition={{
          duration: 34,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
