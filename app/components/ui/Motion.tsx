"use client";

import { motion, useScroll, useTransform, type Variants } from "framer-motion";
import { useRef, type ReactNode } from "react";

const EASE = [0.19, 1, 0.22, 1] as const;

type Direction = "up" | "down" | "left" | "right" | "none";

function initialFor(direction: Direction, distance: number) {
  switch (direction) {
    case "up":    return { opacity: 0, y: distance };
    case "down":  return { opacity: 0, y: -distance };
    case "left":  return { opacity: 0, x: distance };
    case "right": return { opacity: 0, x: -distance };
    case "none":  return { opacity: 0 };
  }
}

function animateFor(direction: Direction) {
  switch (direction) {
    case "up":
    case "down":  return { opacity: 1, y: 0 };
    case "left":
    case "right": return { opacity: 1, x: 0 };
    case "none":  return { opacity: 1 };
  }
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.9,
  direction = "up",
  distance = 40,
  once = true,
  className,
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  direction?: Direction;
  distance?: number;
  once?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      initial={initialFor(direction, distance)}
      whileInView={animateFor(direction)}
      viewport={{ once, margin: "-10%" }}
      transition={{ duration, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({
  children,
  delayChildren = 0,
  staggerChildren = 0.08,
  once = true,
  className,
}: {
  children: ReactNode;
  delayChildren?: number;
  staggerChildren?: number;
  once?: boolean;
  className?: string;
}) {
  const variants: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren, delayChildren },
    },
  };

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-10%" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  direction = "up",
  distance = 40,
  duration = 0.9,
  className,
}: {
  children: ReactNode;
  direction?: Direction;
  distance?: number;
  duration?: number;
  className?: string;
}) {
  const variants: Variants = {
    hidden: initialFor(direction, distance),
    visible: { ...animateFor(direction), transition: { duration, ease: EASE } },
  };

  return (
    <motion.div variants={variants} className={className}>
      {children}
    </motion.div>
  );
}

export function Parallax({
  children,
  offset = 80,
  className,
}: {
  children: ReactNode;
  offset?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [-offset, offset]);

  return (
    <div ref={ref} className={className} style={{ overflow: "hidden" }}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}

export function ScrollProgress({ className }: { className?: string }) {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      style={{ scaleX: scrollYProgress, transformOrigin: "0%" }}
      className={
        className ??
        "fixed top-0 left-0 right-0 z-[60] h-[2px] bg-[var(--primary)]"
      }
    />
  );
}

export function CounterAnimation({
  value,
  duration = 1.8,
  delay = 0,
  format,
  className,
}: {
  value: number;
  duration?: number;
  delay?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.4, delay }}
      onViewportEnter={() => {
        const el = ref.current;
        if (!el) return;
        const start = performance.now();
        const render = (now: number) => {
          const t = Math.min(1, (now - start - delay * 1000) / (duration * 1000));
          if (t < 0) { requestAnimationFrame(render); return; }
          const eased = 1 - Math.pow(1 - t, 3);
          const current = Math.round(value * eased);
          el.textContent = format ? format(current) : current.toLocaleString("pt-BR");
          if (t < 1) requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
      }}
    >
      {format ? format(0) : "0"}
    </motion.span>
  );
}
