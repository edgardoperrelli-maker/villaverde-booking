'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    else router.push('/dashboard');
  };

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 p-6 rounded-2xl shadow">
        <h1 className="text-2xl font-bold text-center">Accedi</h1>
        <label className="block text-lg">Email
          <input
            className="mt-1 w-full p-3 text-lg border rounded-xl"
            type="email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block text-lg">Password
          <input
            className="mt-1 w-full p-3 text-lg border rounded-xl"
            type="password"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="text-red-600">{error}</p>}
        <button
          disabled={loading}
          className="w-full p-3 text-lg rounded-2xl bg-slate-900 text-white"
        >
          {loading ? 'Attendere…' : 'Entra'}
        </button>
      </form>
    </main>
  );
}
