// FICHIER : src/app/dashboard/promotions/[id]/ModifierAssistanteForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Assistante {
  id: string;
  nom: string;
}

interface Props {
  promotionId: number;
  assistantes: Assistante[];
  currentAssistanteId: string;
}

export default function ModifierAssistanteForm({ promotionId, assistantes, currentAssistanteId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [assistanteId, setAssistanteId] = useState(currentAssistanteId);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!assistanteId) { setError("Sélectionnez une assistante."); return; }
    setSaving(true); setError(''); setSuccess('');
    const { error: err } = await supabase
      .from('promotions')
      .update({ assistante_id: assistanteId })
      .eq('id', promotionId);
    if (err) setError(err.message);
    else { setSuccess('Assistante mise à jour.'); router.refresh(); }
    setSaving(false);
  };

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-48">
          <label className="form-label">Assistante de la promotion</label>
          {assistantes.length === 0 ? (
            <p className="text-sm" style={{ color: '#aeaeb2' }}>Aucune assistante disponible.</p>
          ) : (
            <select value={assistanteId} onChange={e => setAssistanteId(e.target.value)} className="form-input">
              <option value="">— Sélectionner —</option>
              {assistantes.map(a => (
                <option key={a.id} value={a.id}>{a.nom}</option>
              ))}
            </select>
          )}
        </div>
        <button onClick={handleSave} disabled={saving || assistantes.length === 0}
          className="btn-primary">
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {success && <p className="text-xs text-emerald-600 self-center">{success}</p>}
        {error && <p className="text-xs self-center" style={{ color: '#ff3b30' }}>{error}</p>}
      </div>
    </div>
  );
}
