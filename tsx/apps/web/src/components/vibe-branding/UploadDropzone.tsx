'use client';

import { motion } from 'framer-motion';
import { Upload, Image as ImageIcon } from 'lucide-react';

interface UploadDropzoneProps {
  getRootProps: () => any;
  getInputProps: () => any;
  isDragActive: boolean;
}

export function UploadDropzone({
  getRootProps,
  getInputProps,
  isDragActive,
}: UploadDropzoneProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      {...getRootProps()}
      className={`
        relative cursor-pointer rounded-xl border-2 border-dashed p-12
        transition-all duration-200 ease-out
        ${isDragActive 
          ? 'border-interactive-500 bg-interactive-500/10 scale-[1.02]' 
          : 'border-border-default hover:border-border-strong hover:bg-background-elevated/50'
        }
      `}
    >
      <input {...getInputProps()} />
      
      <div className="flex flex-col items-center gap-4 text-center">
        {/* Icon */}
        <div className={`
          p-4 rounded-full transition-colors duration-200
          ${isDragActive ? 'bg-interactive-500/20' : 'bg-background-elevated'}
        `}>
          {isDragActive ? (
            <ImageIcon className="w-8 h-8 text-interactive-400" />
          ) : (
            <Upload className="w-8 h-8 text-text-secondary" />
          )}
        </div>
        
        {/* Text */}
        <div>
          <p className={`text-lg font-medium transition-colors ${
            isDragActive ? 'text-interactive-300' : 'text-text-primary'
          }`}>
            {isDragActive ? 'Drop it like it\'s hot' : 'Drop your inspiration here'}
          </p>
          <p className="text-sm text-text-tertiary mt-1">
            or click to browse
          </p>
        </div>
        
        {/* File type hints */}
        <div className="flex gap-2 mt-2">
          {['PNG', 'JPG', 'WebP'].map((type) => (
            <span
              key={type}
              className="px-2 py-1 text-xs font-mono text-text-tertiary bg-background-elevated/50 rounded"
            >
              {type}
            </span>
          ))}
          <span className="px-2 py-1 text-xs text-text-tertiary">
            Max 10MB
          </span>
        </div>
      </div>
      
      {/* Animated border glow on drag */}
      {isDragActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)',
          }}
        />
      )}
    </motion.div>
  );
}
