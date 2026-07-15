'use client';

import { useEffect, useRef } from 'react';

export function useScrollReveal(options = { threshold: 0.1, rootMargin: '0px' }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // We look for elements with .reveal-on-scroll within the container
    const elements = container.querySelectorAll('.reveal-on-scroll');
    
    if (elements.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          // Once revealed, we can stop observing if we want it to happen only once
          observer.unobserve(entry.target);
        }
      });
    }, options);

    elements.forEach(el => observer.observe(el));

    return () => {
      elements.forEach(el => observer.unobserve(el));
      observer.disconnect();
    };
  }, [options.threshold, options.rootMargin]);

  return containerRef;
}
