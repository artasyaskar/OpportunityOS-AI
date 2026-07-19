'use client';

import { useEffect, useState, useRef } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export default function AnimatedCounter({ 
  value, 
  duration = 2000, 
  prefix = '', 
  suffix = '',
  decimals = 0
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let startTime: number | null = null;
    const endValue = value;
    
    // Set up intersection observer to start animation only when visible
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        const step = (timestamp: number) => {
          if (!startTime) startTime = timestamp;
          const progress = Math.min((timestamp - startTime) / duration, 1);
          
          // Easing function (easeOutQuart)
          const easeOut = 1 - Math.pow(1 - progress, 4);
          const currentCount = endValue * easeOut;
          
          setCount(currentCount);
          
          if (progress < 1) {
            window.requestAnimationFrame(step);
          } else {
            setCount(endValue);
          }
        };
        window.requestAnimationFrame(step);
        observer.disconnect(); // Run once
      }
    }, { threshold: 0.1 });

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [value, duration]);

  const formattedCount = decimals > 0 
    ? count.toFixed(decimals)
    : Math.floor(count).toLocaleString();

  return (
    <span ref={elementRef}>
      {prefix}{formattedCount}{suffix}
    </span>
  );
}
