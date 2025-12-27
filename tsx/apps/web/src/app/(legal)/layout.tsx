import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | AuraStream',
    default: 'Legal | AuraStream',
  },
  description: 'Legal documents for AuraStream - Terms of Service and Privacy Policy',
};

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
