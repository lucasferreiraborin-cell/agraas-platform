"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

export default function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ ease: [0.19, 1, 0.22, 1] }}
    >
      {children}
    </MotionConfig>
  );
}
