"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";

interface HeroParallaxImageProps {
  src: string;
  alt?: string;
  className?: string;
  intensity?: number; // 0 to 1, default 0.25
  priority?: boolean;
  sizes?: string;
}

export default function HeroParallaxImage({
  src,
  alt = "",
  className = "absolute inset-0 -z-10 h-full w-full",
  intensity = 0.25,
  priority = true,
  sizes = "100vw",
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
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        quality={85}
        className="object-cover"
      />
    </motion.div>
  );
}
