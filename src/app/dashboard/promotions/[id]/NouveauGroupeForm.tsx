// FICHIER : src/app/dashboard/promotions/[id]/NouveauGroupeForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Responsable {
  id: string;
  nom: string;
}

interface Props {
  promotionId: number;
  // super_admin : liste de responsables à choisir (obligatoire)
  // responsable_pedagogique : fixedResponsableId + fixedResponsableNom renseignés, pas de liste
  responsables: Responsable[];
  fixedResponsableId?: string;
  fixedResponsableNom?: string;
}

export default function NouveauGroupeForm({ promotionId, responsables, fixedResponsableId, fixedResponsableNom }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [nom, setNom] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [responsableId, setResponsableId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!nom.trim()) { setError('Le nom du groupe est requis.'); return; }
    if (!pseudo.trim()) { setError('Le pseudo est requis.'); return; }
    if (!/^[a-z0-9_-]+$/i.test(pseudo.trim())) {
      setError('Le pseudo ne peut contenir que des lettres, chiffres, tirets et underscores.'); return;
    }
    if (password.length < 6) { setError('Le mot de passe doit faire au moins 6 caractères.'); return; }

    // Responsable : soit fixé (responsable pédagogique), soit choisi (super admin)
    const finalResponsableId = fixedResponsableId || responsableId;
    if (!finalResponsableId) {
      setError('Vous devez sélectionner un responsable pédagogique.'); return;
    }

    setLoading(true);
    const res = await fetch('/api/groupes/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        promotion_id: promotionId,
        nom_groupe: nom.trim(),
        pseudo: pseudo.trim(),
        password,
        nom_compte: nom.trim(),
        responsable_id: finalResponsableId,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Une erreur est survenue.');
    } else {
      setSuccess(`Groupe "${nom}" créé ! Pseudo : ${pseudo}`);
      setNom(''); setPseudo(''); setPassword(''); setResponsableId('');
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-sm mb-4" style={{ color: '#1d1d1f' }}>Créer un groupe</h2>
      <form onSubmit={handleSubmit} className="space-y-4">

        <div>
          <label className="form-label">Nom du groupe *</label>
          <input type="text" value={nom} onChange={e => setNom(e.target.value)}
            className="form-input" placeholder="Ex : Groupe A, Équipe 1…" />
        </div>

        {fixedResponsableId ? (
          /* Responsable pédagogique : son nom en lecture seule, non modifiable */
          <div>
            <label className="form-label">Responsable pédagogique</label>
            <div className="form-input text-sm" style={{ background: '#f5f5f7', color: '#6e6e73', cursor: 'not-allowed' }}>
              {fixedResponsableNom}
            </div>
            <p className="text-xs mt-1" style={{ color: '#aeaeb2' }}>
              Vous êtes automatiquement désigné responsable de ce groupe.
            </p>
          </div>
        ) : (
          /* Super admin : liste déroulante obligatoire */
          <div>
            <label className="form-label">Responsable pédagogique *</label>
            {responsables.length === 0 ? (
              <div className="rounded-xl px-3 py-2 text-sm"
                   style={{ background: 'rgba(255,59,48,0.08)', color: '#c0392b', border: '1px solid rgba(255,59,48,0.15)' }}>
                Aucun responsable pédagogique disponible. Créez-en un d&apos;abord dans la section Utilisateurs.
              </div>
            ) : (
              <select value={responsableId} onChange={e => setResponsableId(e.target.value)} className="form-input">
                <option value="">— Sélectionner un responsable —</option>
                {responsables.map(r => (
                  <option key={r.id} value={r.id}>{r.nom}</option>
                ))}
              </select>
            )}
          </div>
        )}

        <div style={{ borderTop: '1px solid #f2f2f7', paddingTop: '1rem' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#aeaeb2' }}>
            Compte de connexion
          </p>
          <div className="space-y-3">
            <div>
              <label className="form-label">Pseudo *</label>
              <input type="text" value={pseudo} onChange={e => setPseudo(e.target.value)}
                className="form-input" placeholder="Ex : groupe-a" />
              <p className="text-xs mt-1" style={{ color: '#aeaeb2' }}>
                Les étudiants tapent ce pseudo pour se connecter.
              </p>
            </div>
            <div>
              <label className="form-label">Mot de passe *</label>
              <input type="text" value={password} onChange={e => setPassword(e.target.value)}
                className="form-input" placeholder="Minimum 6 caractères" />
              <p className="text-xs mt-1" style={{ color: '#aeaeb2' }}>À transmettre au groupe.</p>
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

        <button
          type="submit"
          disabled={loading || (!fixedResponsableId && responsables.length === 0)}
          className="btn-primary w-full justify-center">
          {loading ? 'Création…' : 'Créer le groupe'}
        </button>
      </form>
    </div>
  );
}
