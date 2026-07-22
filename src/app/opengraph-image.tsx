import { ImageResponse } from 'next/og';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/seo';

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #020408 0%, #1e1b4b 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #6366f1, #0ea5e9)',
              display: 'flex',
            }}
          />
          <div style={{ fontSize: 40, fontWeight: 700 }}>{SITE_NAME}</div>
        </div>
        <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.1, maxWidth: 900 }}>
          Discover & win life-changing opportunities
        </div>
        <div style={{ fontSize: 32, color: '#94a3b8', marginTop: 28, maxWidth: 900 }}>
          Scholarships · Fellowships · Grants · Hackathons · Remote Jobs · Accelerators
        </div>
      </div>
    ),
    { ...size }
  );
}
