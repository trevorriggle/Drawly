import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ padding: 20 }}>
      <h1>Welcome to Drawly</h1>
      <p>Draw first. Get coached second. Improve always.</p>
      <p>
        <Link className="kbd" href="/studio">Open Studio →</Link>
      </p>
      <p style={{ opacity: 0.7, marginTop: 20 }}>
        Env present? SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'yes' : 'no'} ·
        ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'yes' : 'no'}
      </p>
    </div>
  );
}
