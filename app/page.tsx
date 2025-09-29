import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: 'calc(100vh - 60px)',
      textAlign: 'center',
      gap: 24
    }}>
      <div>
        <h1 style={{ fontSize: 48, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
          Welcome to Drawly
        </h1>
        <p style={{ fontSize: 20, color: '#6b7280', marginBottom: 32 }}>
          Draw first. Get coached second. Improve always.
        </p>
        <Link
          href="/studio"
          style={{
            background: '#3b82f6',
            color: 'white',
            padding: '12px 24px',
            borderRadius: 8,
            textDecoration: 'none',
            fontSize: 16,
            fontWeight: 600,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            transition: 'all 0.15s ease'
          }}
        >
          Open Studio →
        </Link>
      </div>

      <div style={{ opacity: 0.5, fontSize: 14, color: '#9ca3af' }}>
        Environment: SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing'} ·
        ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'configured' : 'missing'}
      </div>
    </div>
  );
}