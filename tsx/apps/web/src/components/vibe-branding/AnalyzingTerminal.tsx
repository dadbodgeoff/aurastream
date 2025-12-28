'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TERMINAL_MESSAGES } from './constants';

export function AnalyzingTerminal() {
  const [logs, setLogs] = useState<string[]>([]);
  
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i >= TERMINAL_MESSAGES.length) {
        clearInterval(interval);
        return;
      }
      setLogs(prev => [...prev, TERMINAL_MESSAGES[i]]);
      i++;
    }, 700);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="font-mono text-sm"
    >
      {/* Status header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        <span className="text-interactive-400 font-bold tracking-widest">
          GEMINI VISION ACTIVE
        </span>
      </div>
      
      {/* Terminal logs */}
      <div className="space-y-2 bg-background-surface p-4 rounded-lg border border-border-subtle">
        {logs.map((log, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-green-400/80"
          >
            <span className="text-text-disabled mr-2">{'>'}</span>
            {log}
          </motion.div>
        ))}
        
        {/* Blinking cursor */}
        <motion.div
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="w-2 h-4 bg-green-500 inline-block align-middle ml-4"
        />
      </div>
      
      {/* Progress hint */}
      <p className="text-text-tertiary text-xs mt-4 text-center">
        Analyzing visual patterns and extracting brand identity...
      </p>
    </motion.div>
  );
}
