// FICHIER : src/app/dashboard/promotions/nouvelle/NouvellePromotionForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Person { id: string; nom: string; }

interface Props {
  assistantes: Person[];
  responsables: Person[];
  fixedResponsableId?: string;
  fixedResponsableNom?: string;
}

export default function NouvellePromotionForm({ assistantes, responsables, fixedResponsableId, fixedResponsableNom }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    nom: '',
    annee_academique: '',
    budget_par_groupe: '150',
    assistante_id: '',
    responsable_id: '',
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.nom.trim()) { setError('Le nom est requis.'); return; }
    if (!/^\d{4}-\d{4}$/.test(form.annee_academique)) {
      setError("L'année académique doit être au format YYYY-YYYY (ex : 2025-2026)."); return;
    }
    if (isNaN(Number(form.budget_par_groupe)) || Number(form.budget_par_groupe) <= 0) {
      setError('Le budget doit être un nombre positif.'); return;
    }
    if (!form.assistante_id) { setError('Vous devez assigner une assistante.'); return; }

    const finalResponsableId = fixedResponsableId || form.responsable_id;
    if (!finalResponsableId) { setError('Vous devez assigner un responsable pédagogique.'); return; }

    setLoading(true);
    const { error: err } = await supabase.from('promotions').insert({
      nom: form.nom.trim(),
      annee_academique: form.annee_academique.trim(),
      budget_par_groupe: parseFloat(form.budget_par_groupe),
      assistante_id: form.assistante_id,
      responsable_id: finalResponsableId,
    });

    if (err) { setError('Erreur : ' + err.message); setLoading(false); }
    else { router.push('/dashboard/promotions'); router.refresh(); }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-5">
      <div>
        <label className="form-label">Nom de la promotion *</label>
        <input type="text" value={form.nom} onChange={set('nom')}
          className="form-input" placeholder="Ex : Bachelor Informatique" />
      </div>

      <div>
        <label className="form-label">Année académique *</label>
        <input type="text" value={form.annee_academique} onChange={set('annee_academique')}
          className="form-input" placeholder="2025-2026" />
        <p className="text-xs mt-1" style={{ color: '#aeaeb2' }}>Format : YYYY-YYYY</p>
      </div>

      <div>
        <label className="form-label">Budget par groupe (€) *</label>
        <input type="number" step="0.01" min="1" value={form.budget_par_groupe}
          onChange={set('budget_par_groupe')} className="form-input" />
      </div>

      {/* Responsable pédagogique */}
      <div>
        <label className="form-label">Responsable pédagogique *</label>
        {fixedResponsableId ? (
          <div className="form-input text-sm" style={{ background: '#f5f5f7', color: '#6e6e73', cursor: 'not-allowed' }}>
            {fixedResponsableNom}
          </div>
        ) : responsables.length === 0 ? (
          <div className="rounded-xl px-3 py-2 text-sm"
               style={{ background: 'rgba(255,59,48,0.08)', color: '#c0392b', border: '1px solid rgba(255,59,48,0.15)' }}>
            Aucun responsable disponible. Créez-en un dans la section Utilisateurs.
          </div>
        ) : (
          <select value={form.responsable_id} onChange={set('responsable_id')} className="form-input">
            <option value="">— Sélectionner un responsable —</option>
            {responsables.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
          </select>
        )}
      </div>

      {/* Assistante */}
      <div>
        <label className="form-label">Assistante *</label>
        {assistantes.length === 0 ? (
          <div className="rounded-xl px-3 py-2 text-sm"
               style={{ background: 'rgba(255,59,48,0.08)', color: '#c0392b', border: '1px solid rgba(255,59,48,0.15)' }}>
            Aucune assistante disponible. Créez-en une dans la section Utilisateurs.
          </div>
        ) : (
          <select value={form.assistante_id} onChange={set('assistante_id')} className="form-input">
            <option value="">— Sélectionner une assistante —</option>
            {assistantes.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
          </select>
        )}
      </div>

      {error && (
        <div className="rounded-xl px-3 py-2 text-sm"
             style={{ background: 'rgba(255,59,48,0.08)', color: '#c0392b', border: '1px solid rgba(255,59,48,0.15)' }}>
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit"
          disabled={loading || assistantes.length === 0 || (!fixedResponsableId && responsables.length === 0)}
          className="btn-primary">
          {loading ? 'Création…' : 'Créer la promotion'}
        </button>
        <a href="/dashboard/promotions" className="btn-secondary">Annuler</a>
      </div>
    </form>
  );
}
