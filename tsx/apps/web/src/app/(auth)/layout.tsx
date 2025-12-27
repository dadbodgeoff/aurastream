'use client';

import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-base p-4">
      {/* Background subtle effect */}
      <div className="fixed inset-0 bg-background-base pointer-events-none" />
      
      {/* Subtle decorative elements */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-interactive-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-accent-600/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo and tagline */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-interactive-600">
              Aurastream
            </h1>
          </Link>
          <p className="text-text-secondary mt-2">AI-powered streaming assets</p>
        </div>
        
        {/* Auth card */}
        <div className="bg-background-surface rounded-xl p-8 shadow-lg border border-border-default backdrop-blur-sm">
          {children}
        </div>
        
        {/* Footer */}
        <div className="text-center mt-6 text-text-tertiary text-sm">
          <p>
            © {new Date().getFullYear()} Aurastream. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
