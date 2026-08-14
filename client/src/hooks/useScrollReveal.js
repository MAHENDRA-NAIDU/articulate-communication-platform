import { useEffect } from 'react';

/**
 * Custom hook that observes DOM elements with the class 'reveal-on-scroll'
 * and adds 'is-revealed' class when they enter the viewport.
 */
export const useScrollReveal = (deps = []) => {
  useEffect(() => {
    const elements = document.querySelectorAll('.reveal-on-scroll');
    if (!elements || elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            // Optional: unobserve once revealed for one-time performance
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    elements.forEach((el) => {
      // If element is already above viewport, reveal immediately
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        el.classList.add('is-revealed');
      } else {
        observer.observe(el);
      }
    });

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, deps);
};
