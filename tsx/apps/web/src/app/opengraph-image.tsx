import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const alt = 'AuraStream - AI-powered stream assets';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

// Image generation
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0F172A',
          backgroundImage: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
        }}
      >
        {/* Gradient orbs for visual interest */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-150px',
            left: '-100px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)',
          }}
        />

        {/* Logo/Brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '20px',
            }}
          >
            <span style={{ fontSize: '48px' }}>✨</span>
          </div>
          <span
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              background: 'linear-gradient(90deg, #FFFFFF 0%, #A5B4FC 100%)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            AuraStream
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: '36px',
            color: '#94A3B8',
            marginBottom: '40px',
            textAlign: 'center',
          }}
        >
          Your stream. Your brand. Every platform.
        </div>

        {/* Features */}
        <div
          style={{
            display: 'flex',
            gap: '30px',
          }}
        >
          {['Emotes', 'Thumbnails', 'Overlays', 'Banners'].map((feature) => (
            <div
              key={feature}
              style={{
                padding: '12px 24px',
                borderRadius: '30px',
                background: 'rgba(139, 92, 246, 0.2)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                color: '#C4B5FD',
                fontSize: '20px',
              }}
            >
              {feature}
            </div>
          ))}
        </div>

        {/* Bottom tagline */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            fontSize: '24px',
            color: '#64748B',
          }}
        >
          AI-powered graphics • Ready in seconds • No design skills needed
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
