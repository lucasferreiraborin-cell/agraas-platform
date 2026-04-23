"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface HeroParallaxImageProps {
  src: string;
  alt?: string;
  className?: string;
  intensity?: number; // 0 to 1, default 0.25
}

export default function HeroParallaxImage({
  src,
  alt = "",
  className = "absolute inset-0 -z-10 h-full w-full object-cover",
  intensity = 0.25,
}: HeroParallaxImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", `${intensity * 100}%`]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1 + intensity * 0.3]);
  const opacity = useTransform(scrollYProgress, [0, 0.7, 1], [1, 0.9, 0.7]);

  return (
    <motion.div ref={ref} className={className} style={{ y, scale, opacity }}>
      <img
        src={src}
        alt={alt}
        loading="eager"
        fetchPriority="high"
        className="h-full w-full object-cover"
      />
    </motion.div>
  );
}
