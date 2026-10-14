'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Props {
  commandeId: number;
  compact?: boolean;
}

export default function AnnulerCommandeButton({ commandeId, compact = false }: Props) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const annuler = async () => {
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc('annuler_commande_groupe', { p_commande_id: commandeId });

    if (rpcError) {
      setError('Annulation impossible : la commande a peut-être déjà été validée. Actualisez la page et réessayez.');
      setLoading(false);
      return;
    }

    setConfirmation(false);
    setLoading(false);
    router.refresh();
  };

  return (
    <div className={compact ? 'min-w-0' : 'space-y-2'}>
      {!confirmation ? (
        <button type="button" onClick={() => { setConfirmation(true); setError(''); }}
          className={compact ? 'text-xs text-red-600 hover:underline' : 'btn-danger w-full justify-center'}>
          Annuler la commande
        </button>
      ) : (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2 min-w-48">
          <p className="text-xs text-red-800">Confirmer l’annulation ? Cette action est définitive et libérera le budget réservé.</p>
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={annuler} disabled={loading}
              className="btn-danger text-xs px-2 py-1.5">
              {loading ? 'Annulation…' : 'Oui, annuler'}
            </button>
            <button type="button" disabled={loading} onClick={() => { setConfirmation(false); setError(''); }}
              className="btn-secondary text-xs px-2 py-1.5">Retour</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
