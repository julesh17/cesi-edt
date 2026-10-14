// FICHIER : src/app/dashboard/commandes/[id]/CommandeActions.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Commande, Profile } from '@/types';

interface Props {
  commande: Commande;
  profile: Profile;
  mailtoLink: string;
}

export default function CommandeActions({ commande, profile, mailtoLink }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [prixReel, setPrixReel] = useState('');
  const [showPrixReel, setShowPrixReel] = useState(false);
  const [motif, setMotif] = useState('');
  const [showMotif, setShowMotif] = useState<'refusee' | 'non_commandable' | null>(null);
  const [error, setError] = useState('');

  const canValidate = ['super_admin', 'responsable_pedagogique'].includes(profile.role);
  const canOrder = ['super_admin', 'responsable_pedagogique', 'assistante'].includes(profile.role);

  const updateStatut = async (newStatut: string, extraData: Record<string, unknown> = {}) => {
    setLoading(true);
    setError('');

    const now = new Date().toISOString();
    const dateMap: Record<string, string> = {
      validee: 'date_validation',
      commandee: 'date_commande',
      colis_arrive: 'date_colis_arrive',
      receptionnee: 'date_reception',
    };

    // On stocke le motif directement sur la commande si présent
    const updates: Record<string, unknown> = {
      statut: newStatut,
      date_mise_a_jour: now,
      ...extraData,
    };
    if (dateMap[newStatut]) updates[dateMap[newStatut]] = now;

    const { data: updated, error: updateError } = await supabase
      .from('commandes').update(updates).eq('id', commande.id).eq('statut', commande.statut).select('id');

    if (updateError || !updated?.length) {
      setError(updateError ? 'Erreur : ' + updateError.message : 'La commande a changé de statut. Actualisez la page avant de réessayer.');
    } else {
      const actionLabels: Record<string, string> = {
        validee: 'Commande validée',
        refusee: 'Commande refusée',
        commandee: 'Commande passée',
        non_commandable: 'Marquée non commandable',
        colis_arrive: 'Colis arrivé',
        receptionnee: 'Commande réceptionnée par le groupe',
      };
      await supabase.from('historique_commandes').insert({
        commande_id: commande.id,
        user_id: profile.id,
        action: actionLabels[newStatut] || newStatut,
        details: extraData.motif
          ? `Motif : ${extraData.motif}`
          : extraData.prix_reel
          ? `Prix réel : ${extraData.prix_reel} €`
          : null,
      });
      router.refresh();
    }
    setLoading(false);
  };

  const handleRefusOuNonCommandable = async (statut: 'refusee' | 'non_commandable') => {
    await updateStatut(statut, motif.trim() ? { motif: motif.trim() } : {});
    setShowMotif(null);
    setMotif('');
  };

  const handleCommander = async () => {
    // Prix réel optionnel — si vide on utilise le prix estimé
    const prix = prixReel.trim()
      ? parseFloat(prixReel)
      : commande.prix_estime;

    if (isNaN(prix) || prix <= 0) {
      setError('Le prix saisi est invalide.');
      return;
    }
    await updateStatut('commandee', { prix_reel: prix, ordered_by: profile.id });
    setShowPrixReel(false);
    setPrixReel('');
  };

  const { statut } = commande;

  return (
    <div className="card p-5 space-y-3">
      <h2 className="font-semibold text-sm" style={{ color: '#1d1d1f' }}>Actions</h2>

      {error && (
        <div className="rounded-xl px-3 py-2 text-sm"
             style={{ background: 'rgba(255,59,48,0.08)', color: '#c0392b', border: '1px solid rgba(255,59,48,0.15)' }}>
          {error}
        </div>
      )}

      {/* En attente → Valider / Refuser */}
      {statut === 'en_attente' && canValidate && (
        <div className="space-y-2">
          <button onClick={() => updateStatut('validee', { validated_by: profile.id })}
            disabled={loading} className="btn-success w-full justify-center">
            ✓ Valider la commande
          </button>

          {showMotif === 'refusee' ? (
            <div className="space-y-2">
              <label className="form-label">Motif du refus (optionnel)</label>
              <textarea value={motif} onChange={e => setMotif(e.target.value)}
                className="form-input resize-none text-sm" rows={3}
                placeholder="Expliquez pourquoi cette commande est refusée…" />
              <div className="flex gap-2">
                <button onClick={() => handleRefusOuNonCommandable('refusee')}
                  disabled={loading} className="btn-danger flex-1 justify-center text-sm">
                  Confirmer le refus
                </button>
                <button onClick={() => { setShowMotif(null); setMotif(''); }}
                  className="btn-secondary flex-1 justify-center text-sm">
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowMotif('refusee')}
              disabled={loading} className="btn-danger w-full justify-center">
              ✗ Refuser la commande
            </button>
          )}
        </div>
      )}

      {/* Validée → Commander / Non commandable */}
      {statut === 'validee' && canOrder && (
        <div className="space-y-2">
          {!showPrixReel ? (
            <button onClick={() => setShowPrixReel(true)} className="btn-primary w-full justify-center">
              📦 Commander
            </button>
          ) : (
            <div className="space-y-2">
              <label className="form-label">
                Prix réel payé (€)
                <span className="font-normal ml-1" style={{ color: '#aeaeb2' }}>
                  — optionnel, défaut : {Number(commande.prix_estime).toFixed(2)} €
                </span>
              </label>
              <input type="number" step="0.01" min="0.01"
                value={prixReel} onChange={e => setPrixReel(e.target.value)}
                className="form-input" placeholder={`Laisser vide = ${Number(commande.prix_estime).toFixed(2)} €`}
                autoFocus />
              <div className="flex gap-2">
                <button onClick={handleCommander} disabled={loading}
                  className="btn-primary flex-1 justify-center text-sm">
                  Confirmer
                </button>
                <button onClick={() => { setShowPrixReel(false); setPrixReel(''); }}
                  className="btn-secondary flex-1 justify-center text-sm">
                  Annuler
                </button>
              </div>
            </div>
          )}

          {showMotif === 'non_commandable' ? (
            <div className="space-y-2">
              <label className="form-label">Motif (optionnel)</label>
              <textarea value={motif} onChange={e => setMotif(e.target.value)}
                className="form-input resize-none text-sm" rows={3}
                placeholder="Expliquez pourquoi cette commande ne peut pas être effectuée…" />
              <div className="flex gap-2">
                <button onClick={() => handleRefusOuNonCommandable('non_commandable')}
                  disabled={loading} className="btn-secondary flex-1 justify-center text-sm">
                  Confirmer
                </button>
                <button onClick={() => { setShowMotif(null); setMotif(''); }}
                  className="btn-secondary flex-1 justify-center text-sm">
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowMotif('non_commandable')}
              disabled={loading} className="btn-secondary w-full justify-center text-sm">
              Non commandable
            </button>
          )}
        </div>
      )}

      {/* Commandée → Colis arrivé */}
      {statut === 'commandee' && canOrder && (
        <button onClick={() => updateStatut('colis_arrive')}
          disabled={loading} className="btn-primary w-full justify-center">
          📬 Marquer colis arrivé
        </button>
      )}

      {/* Colis arrivé → Email + Réception par le groupe */}
      {statut === 'colis_arrive' && canOrder && (
        <div className="space-y-2">
          <a href={mailtoLink} className="btn-secondary w-full justify-center text-sm">
            ✉️ Envoyer email au référent
          </a>
          <button onClick={() => updateStatut('receptionnee')}
            disabled={loading} className="btn-success w-full justify-center">
            ✓ Les étudiants ont réceptionné la commande
          </button>
        </div>
      )}

      {['refusee', 'non_commandable', 'receptionnee'].includes(statut) && (
        <p className="text-sm text-center italic" style={{ color: '#aeaeb2' }}>
          Cette commande est clôturée.
        </p>
      )}

      {loading && <p className="text-xs text-center" style={{ color: '#aeaeb2' }}>Mise à jour…</p>}
    </div>
  );
}
