'use client';

/**
 * Restrained motion primitives for OpportunityOS, built on framer-motion.
 *
 * Scope is intentionally small (page fade, grid stagger, hover-lift, scroll
 * reveal) so motion communicates state and structure without decoration. All
 * primitives honor `prefers-reduced-motion`: when the user asks for reduced
 * motion, framer-motion's `useReducedMotion` short-circuits transforms and we
 * fall back to opacity-only (or no) animation.
 */

import { motion, useReducedMotion, type Variants, type HTMLMotionProps } from 'framer-motion';
import { type ReactNode } from 'react';

// Shared easing — matches the cubic-bezier used by the CSS hover utilities.
const EASE = [0.4, 0, 0.2, 1] as const;

/* ---------- Page / section fade-in ---------- */
export function FadeIn({
  children,
  delay = 0,
  y = 12,
  className,
  ...rest
}: { children: ReactNode; delay?: number; y?: number; className?: string } & HTMLMotionProps<'div'>) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: EASE }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/* ---------- Stagger container + item (card grids, lists) ---------- */
export function Stagger({
  children,
  className,
  gap = 0.05,
  ...rest
}: { children: ReactNode; className?: string; gap?: number } & HTMLMotionProps<'div'>) {
  const reduce = useReducedMotion();
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : gap } },
  };
  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      animate="show"
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  y = 12,
  ...rest
}: { children: ReactNode; className?: string; y?: number } & HTMLMotionProps<'div'>) {
  const reduce = useReducedMotion();
  const item: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : y },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
  };
  return (
    <motion.div className={className} variants={item} {...rest}>
      {children}
    </motion.div>
  );
}

/* ---------- Scroll reveal (replaces manual .reveal-on-scroll) ---------- */
export function Reveal({
  children,
  className,
  y = 20,
  ...rest
}: { children: ReactNode; className?: string; y?: number } & HTMLMotionProps<'div'>) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: EASE }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/* ---------- Hover-lift (cards, interactive tiles) ---------- */
export function HoverLift({
  children,
  className,
  lift = -4,
  ...rest
}: { children: ReactNode; className?: string; lift?: number } & HTMLMotionProps<'div'>) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      whileHover={reduce ? undefined : { y: lift, transition: { duration: 0.2, ease: EASE } }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
