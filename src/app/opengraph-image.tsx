import { ImageResponse } from 'next/og';

// The Edge Runtime is deprecated as of Next.js 16; omitting `runtime` uses the
// default Node.js runtime, which supports ImageResponse.

export const alt = 'RHS Coding Club';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '60px 80px',
            border: '2px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          {/* Logo/Icon */}
          <div
            style={{
              width: '120px',
              height: '120px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '30px',
              fontSize: '60px',
            }}
          >
            💻
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: '64px',
              fontWeight: 'bold',
              color: 'white',
              textAlign: 'center',
              marginBottom: '20px',
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
            }}
          >
            RHS Coding Club
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: '28px',
              color: 'rgba(255, 255, 255, 0.9)',
              textAlign: 'center',
              maxWidth: '800px',
              lineHeight: 1.4,
              textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)',
            }}
          >
            Learn programming, participate in challenges, build projects, and
            connect with fellow developers
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            right: '40px',
            fontSize: '20px',
            color: 'rgba(255, 255, 255, 0.8)',
            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)',
          }}
        >
          rhscoding.club
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
