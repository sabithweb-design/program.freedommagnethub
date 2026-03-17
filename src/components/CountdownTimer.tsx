
'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  targetDate: Date;
  className?: string;
}

export function CountdownTimer({ targetDate, className }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft(null);
      }
    };

    const timer = setInterval(calculateTimeLeft, 1000);
    calculateTimeLeft(); // Initial call

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) return null;

  return (
    <div className={cn("flex items-center gap-2 font-mono tabular-nums", className)}>
      <TimeUnit value={timeLeft.days} label="d" />
      <span className="opacity-30 font-bold">:</span>
      <TimeUnit value={timeLeft.hours} label="h" />
      <span className="opacity-30 font-bold">:</span>
      <TimeUnit value={timeLeft.minutes} label="m" />
      <span className="opacity-30 font-bold">:</span>
      <TimeUnit value={timeLeft.seconds} label="s" />
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-0.5">
      <span className="text-lg font-black">{value.toString().padStart(2, '0')}</span>
      <span className="text-[10px] font-black uppercase tracking-tighter opacity-50">{label}</span>
    </div>
  );
}
