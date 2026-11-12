"use client";

import React from "react";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export const Reveal: React.FC<RevealProps> = ({ children, delay = 0, className = "" }) => {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

