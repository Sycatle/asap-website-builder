"use client"

import { useState, useCallback } from 'react';

export function useSoundEffects() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ai-chat-sounds') !== 'false';
    }
    return true;
  });

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const newVal = !prev;
      localStorage.setItem('ai-chat-sounds', String(newVal));
      return newVal;
    });
  }, []);

  const playSound = useCallback((type: 'send' | 'receive' | 'success' | 'error') => {
    if (!enabled || typeof window === 'undefined') return;
    
    // Simple tone generation with Web Audio API
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioContextClass = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      const frequencies = { send: 880, receive: 440, success: 660, error: 220 };
      oscillator.frequency.value = frequencies[type];
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch {
      // Audio not supported, ignore
    }
  }, [enabled]);

  return { enabled, toggle, playSound };
}
