'use client';

import { useEffect } from 'react';

export default function ButtonFeedback() {
  useEffect(() => {
    const animate = (event: PointerEvent) => {
      const button = (event.target as Element | null)?.closest('button');
      if (!button || button.disabled) return;
      const bounds = button.getBoundingClientRect();
      button.style.setProperty('--tap-x', `${event.clientX - bounds.left}px`);
      button.style.setProperty('--tap-y', `${event.clientY - bounds.top}px`);
      button.classList.remove('tap-feedback');
      void button.offsetWidth;
      button.classList.add('tap-feedback');
      window.setTimeout(() => button.classList.remove('tap-feedback'), 520);
    };
    document.addEventListener('pointerdown', animate);
    return () => document.removeEventListener('pointerdown', animate);
  }, []);
  return null;
}
