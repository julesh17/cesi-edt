// FICHIER : src/app/dashboard/utilisateurs/CreerUtilisateurForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreerUtilisateurForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [nom, setNom] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('responsable_pedagogique');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!nom.trim() || !pseudo.trim() || !password) {
      setError('Tous les champs sont requis.'); return;
    }
    if (password.length < 6) {
      setError('Mot de passe trop court (6 caractères min).'); return;
    }

    setLoading(true);
    const res = await fetch('/api/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pseudo: pseudo.trim(), password, nom: nom.trim(), role }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Erreur inconnue.');
    } else {
      setSuccess(`Compte "${nom}" créé ! Pseudo : ${pseudo}`);
      setNom(''); setPseudo(''); setPassword('');
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-sm mb-4" style={{ color: '#1d1d1f' }}>Créer un compte</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="form-label">Nom complet *</label>
          <input type="text" value={nom} onChange={e => setNom(e.target.value)}
            className="form-input" placeholder="Ex : Marie Dupont" />
        </div>

        <div>
          <label className="form-label">Rôle *</label>
          <select value={role} onChange={e => setRole(e.target.value)} className="form-input">
            <option value="responsable_pedagogique">Responsable pédagogique</option>
            <option value="assistante">Assistante</option>
          </select>
        </div>

        <div style={{ borderTop: '1px solid #f2f2f7', paddingTop: '1rem' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#aeaeb2' }}>
            Identifiants de connexion
          </p>
          <div className="space-y-3">
            <div>
              <label className="form-label">Pseudo *</label>
              <input type="text" value={pseudo} onChange={e => setPseudo(e.target.value)}
                className="form-input" placeholder="Ex : marie.dupont" />
              <p className="text-xs mt-1" style={{ color: '#aeaeb2' }}>
                Utilisé pour se connecter à l'application.
              </p>
            </div>
            <div>
              <label className="form-label">Mot de passe *</label>
              <input type="text" value={password} onChange={e => setPassword(e.target.value)}
                className="form-input" placeholder="Minimum 6 caractères" />
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl px-3 py-2 text-sm"
               style={{ background: 'rgba(255,59,48,0.08)', color: '#c0392b', border: '1px solid rgba(255,59,48,0.15)' }}>
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl px-3 py-2 text-sm"
               style={{ background: 'rgba(52,199,89,0.08)', color: '#1e7e34', border: '1px solid rgba(52,199,89,0.2)' }}>
            {success}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
          {loading ? 'Création…' : 'Créer le compte'}
        </button>
      </form>
    </div>
  );
}
