'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { pseudoToEmail } from '@/lib/utils';
import Image from 'next/image';

export default function LoginPage() {
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    const result = await supabase.auth.signInWithPassword({
      email: pseudoToEmail(pseudo),
      password,
    });
    if (result.error) {
      setErrorMsg('Pseudo ou mot de passe incorrect.');
      setLoading(false);
    } else {
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center p-4"
         style={{ backgroundColor: '#f5f5f7' }}>
      <div className="ambient-light" />

      <div className="relative z-10 w-full max-w-[420px] animate-slide-up">
        <div className="rounded-3xl p-10"
             style={{
               background: 'rgba(255,255,255,0.85)',
               backdropFilter: 'blur(20px)',
               WebkitBackdropFilter: 'blur(20px)',
               boxShadow: '0 20px 50px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,0.6) inset',
               border: '1px solid rgba(210,210,215,0.6)'
             }}>
          {/* Logo CESI */}
          <div className="text-center mb-8">
            <Image
              src="https://raw.githubusercontent.com/julesh17/cesi-edt/refs/heads/main/static/cesi.png"
              alt="CESI"
              width={90}
              height={36}
              className="mx-auto mb-5 object-contain"
              unoptimized
            />
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#1d1d1f', letterSpacing: '-0.5px' }}>
              Commandes CESI
            </h1>
            <p className="text-sm mt-1" style={{ color: '#6e6e73' }}>Connexion à votre espace</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="form-label">Utilisateur</label>
              <input
                type="text"
                value={pseudo}
                onChange={e => setPseudo(e.target.value)}
                className="form-input"
                placeholder="Votre pseudo"
                required autoFocus autoComplete="username"
              />
            </div>
            <div>
              <label className="form-label">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
                required autoComplete="current-password"
              />
            </div>

            {errorMsg && (
              <div className="rounded-xl px-4 py-3 text-sm"
                   style={{ background: 'rgba(255,59,48,0.08)', color: '#c0392b', border: '1px solid rgba(255,59,48,0.15)' }}>
                {errorMsg}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full btn-primary justify-center py-3 mt-2 text-base font-medium">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Connexion…
                </span>
              ) : 'Se connecter →'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: '#aeaeb2' }}>
          CESI — Usage interne uniquement
        </p>
      </div>
    </div>
  );
}
