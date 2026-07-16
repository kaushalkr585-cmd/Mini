import { useEffect, useRef } from 'react';

export function useRingtone(play: boolean, type: 'calling' | 'ringing' = 'ringing') {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!play) {
      stopRingtone();
      return;
    }

    // Play ringing sound
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    audioCtxRef.current = new AudioContext();
    const ctx = audioCtxRef.current;

    const gainNode = ctx.createGain();
    gainNode.gain.value = 0; // Start silent
    gainNode.connect(ctx.destination);
    gainNodeRef.current = gainNode;

    const playRing = () => {
      // US Ring tone (440Hz + 480Hz)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      
      osc1.frequency.value = 440;
      osc2.frequency.value = 480;
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      
      osc1.start();
      osc2.start();

      // Fade in/out to avoid clicks
      gainNode.gain.setTargetAtTime(0.1, ctx.currentTime, 0.05);
      
      // Stop after 2 seconds
      setTimeout(() => {
        gainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        setTimeout(() => {
          osc1.stop();
          osc2.stop();
          osc1.disconnect();
          osc2.disconnect();
        }, 100);
      }, 2000);
    };

    // Initial ring
    playRing();
    
    // Repeat every 4 seconds
    intervalRef.current = setInterval(playRing, 4000);

    return () => {
      stopRingtone();
    };
  }, [play, type]);

  const stopRingtone = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.05);
    }
    if (audioCtxRef.current?.state === 'running') {
      setTimeout(() => {
        audioCtxRef.current?.close().catch(() => {});
      }, 100);
    }
  };
}
