'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  groupeId: number;
  groupeNom: string;
  budgetStandard: number;
  budgetTotal: number;
}

export default function BudgetEditor({ groupeId, groupeNom, budgetStandard, budgetTotal }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(budgetTotal.toFixed(2));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const save = async (newBudget?: number) => {
    const parsed = newBudget ?? Number(value.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError('Le budget doit être un nombre positif ou nul.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/groupes/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupe_id: groupeId, budget_total: parsed }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Impossible de modifier le budget.');
        return;
      }
      setOpen(false);
      setValue(parsed.toFixed(2));
      router.refresh();
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  };

  const hasAdjustment = Math.abs(budgetTotal - budgetStandard) > 0.005;

  if (!open) {
    return (
      <div className="flex flex-col items-start gap-1">
        <button onClick={() => { setValue(budgetTotal.toFixed(2)); setOpen(true); }} className="btn-secondary text-xs py-1.5 px-3">
          Modifier le budget
        </button>
        {hasAdjustment && (
          <span className="text-[11px]" style={{ color: '#ff9500' }}>
            Budget exceptionnel
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="min-w-64 rounded-xl p-3 space-y-2" style={{ background: '#fafafa', border: '1px solid #e5e5ea' }}>
      <div>
        <p className="text-xs font-semibold" style={{ color: '#1d1d1f' }}>{groupeNom}</p>
        <p className="text-[11px] mt-0.5" style={{ color: '#6e6e73' }}>
          Budget standard : {budgetStandard.toFixed(2)} €
        </p>
      </div>
      <label className="form-label">Nouveau budget total (€)</label>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={e => setValue(e.target.value)}
        className="form-input"
        autoFocus
      />
      {error && <p className="text-xs" style={{ color: '#ff3b30' }}>{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => save()} disabled={loading} className="btn-primary text-xs py-1.5 px-3">
          {loading ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {hasAdjustment && (
          <button onClick={() => save(budgetStandard)} disabled={loading} className="btn-secondary text-xs py-1.5 px-3">
            Revenir au budget standard
          </button>
        )}
        <button onClick={() => { setOpen(false); setError(''); }} disabled={loading} className="btn-secondary text-xs py-1.5 px-3">
          Annuler
        </button>
      </div>
    </div>
  );
}
