// FICHIER : src/app/dashboard/commandes/CommandesClient.tsx
'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import GroupedEmails from './GroupedEmails';
import AnnulerCommandeButton from './AnnulerCommandeButton';
import { createClient } from '@/lib/supabase/client';
import type { Commande, Profile, CommandeStatus } from '@/types';

interface Groupe { id: number; nom: string; }
interface Fournisseur { id: number; nom: string; }
interface Params {
  statut?: string;
  groupe?: string;
  fournisseur?: string;
  masquer_terminees?: string;
}

interface Props {
  commandes: Commande[];
  profile: Profile;
  groupes: Groupe[];
  fournisseurs: Fournisseur[];
  params: Params;
  canSeeRealPrice: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isResponsable: boolean;
  isAssistante: boolean;
  isEtudiant: boolean;
}

const STATUTS_TERMINES = ['refusee', 'non_commandable', 'annulee', 'receptionnee'];

// Actions possibles par statut
const ACTIONS_BULK: Record<string, { label: string; newStatut: CommandeStatus; style: string }[]> = {
  en_attente: [{ label: '✓ Valider la sélection', newStatut: 'validee', style: 'btn-success' }],
  validee: [{ label: '📦 Commander la sélection', newStatut: 'commandee', style: 'btn-primary' }],
  commandee: [{ label: '📬 Marquer colis arrivés', newStatut: 'colis_arrive', style: 'btn-primary' }],
  colis_arrive: [{ label: '✓ Les étudiants ont réceptionné les commandes', newStatut: 'receptionnee', style: 'btn-success' }],
};

export default function CommandesClient({
  commandes, profile, groupes, fournisseurs, params,
  canSeeRealPrice, isAdmin, isSuperAdmin, isResponsable, isAssistante, isEtudiant,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'fournisseur' | 'groupe'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [emailCommandes, setEmailCommandes] = useState<Commande[]>([]);

  const canValidate = ['super_admin', 'responsable_pedagogique'].includes(profile.role);
  const canOrder = ['super_admin', 'responsable_pedagogique', 'assistante'].includes(profile.role);
  const canPrepareEmails = isSuperAdmin || isResponsable || isAssistante;

  // Filtres URL
  const updateParam = (key: string, value: string | null) => {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    startTransition(() => router.push(url.toString()));
  };

  const toggleMasquer = () => {
    updateParam('masquer_terminees', params.masquer_terminees === '1' ? null : '1');
  };

  // Tri local
  const sorted = useMemo(() => {
    const arr = [...commandes];
    arr.sort((a, b) => {
      let va = '', vb = '';
      if (sortBy === 'date') {
        va = a.date_creation; vb = b.date_creation;
      } else if (sortBy === 'fournisseur') {
        va = a.fournisseurs?.nom || ''; vb = b.fournisseurs?.nom || '';
      } else if (sortBy === 'groupe') {
        va = a.groupes?.nom || ''; vb = b.groupes?.nom || '';
      }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [commandes, sortBy, sortDir]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  // Sélection
  const toggleOne = (id: number) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };
  const toggleAll = () => {
    if (selected.size === sorted.length) setSelected(new Set());
    else setSelected(new Set(sorted.map(c => c.id)));
  };
  const selectByStatut = (statut: string) => {
    setSelected(new Set(sorted.filter(c => c.statut === statut).map(c => c.id)));
  };

  // Actions en masse
  const selectedCommandes = useMemo(
    () => sorted.filter(c => selected.has(c.id)),
    [selected, sorted]
  );

  const statutsSelected = useMemo(() => {
    const stats = new Set<string>();
    sorted.forEach(c => { if (selected.has(c.id)) stats.add(c.statut); });
    return stats;
  }, [selected, sorted]);

  const bulkActions = useMemo(() => {
    if (selected.size === 0) return [];
    // On ne propose que les actions communes à tous les statuts sélectionnés
    const actions: typeof ACTIONS_BULK[string] = [];
    if (!canValidate && !canOrder) return [];
    for (const [statut, acts] of Object.entries(ACTIONS_BULK)) {
      if (!statutsSelected.has(statut)) continue;
      for (const act of acts) {
        if (act.newStatut === 'validee' && !canValidate) continue;
        if (['commandee', 'colis_arrive', 'receptionnee'].includes(act.newStatut) && !canOrder) continue;
        if (!actions.find(a => a.newStatut === act.newStatut)) actions.push(act);
      }
    }
    return actions;
  }, [selected, statutsSelected, canValidate, canOrder]);

  const executeBulk = async (newStatut: CommandeStatus) => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    setBulkError('');

    const previousStatus: Partial<Record<CommandeStatus, CommandeStatus>> = {
      validee: 'en_attente',
      commandee: 'validee',
      colis_arrive: 'commandee',
      receptionnee: 'colis_arrive',
    };
    const expected = previousStatus[newStatut];
    if (!expected) { setBulkLoading(false); return; }

    const affected = selectedCommandes.filter(c => c.statut === expected);
    const now = new Date().toISOString();
    const dateMap: Partial<Record<CommandeStatus, string>> = {
      validee: 'date_validation',
      commandee: 'date_commande',
      colis_arrive: 'date_colis_arrive',
      receptionnee: 'date_reception',
    };
    const updates: Record<string, unknown> = { statut: newStatut, date_mise_a_jour: now };
    if (dateMap[newStatut]) updates[dateMap[newStatut]!] = now;
    if (newStatut === 'validee') updates.validated_by = profile.id;
    if (newStatut === 'commandee') updates.ordered_by = profile.id;

    let failures = 0;
    if (newStatut === 'commandee') {
      for (const cmd of affected) {
        const { data, error } = await supabase.from('commandes').update({
          ...updates,
          prix_reel: cmd.prix_reel ?? cmd.prix_estime,
        }).eq('id', cmd.id).eq('statut', expected).select('id');
        if (error || !data?.length) failures++;
      }
    } else if (affected.length > 0) {
      const { data, error } = await supabase.from('commandes').update(updates)
        .in('id', affected.map(c => c.id)).eq('statut', expected).select('id');
      failures = error ? affected.length : affected.length - (data?.length ?? 0);
    }

    if (failures > 0) setBulkError(`${failures} commande(s) non mise(s) à jour. Le statut a peut-être changé entre-temps.`);
    setSelected(new Set());
    setBulkLoading(false);
    startTransition(() => router.refresh());
  };

  const sortIcon = (col: typeof sortBy) => {
    if (sortBy !== col) return <span style={{ color: '#d1d5db' }}>↕</span>;
    return <span style={{ color: '#0071e3' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div>
      {/* Barre de filtres */}
      <div className="card p-4 mb-5 space-y-3">
        {/* Ligne 1 : filtres */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Filtre statut */}
          <select
            value={params.statut || ''}
            onChange={e => updateParam('statut', e.target.value || null)}
            className="form-input w-auto"
            style={{ minWidth: 180 }}>
            <option value="">Tous les statuts</option>
            {(['en_attente','validee','commandee','colis_arrive','receptionnee','refusee','non_commandable','annulee'] as CommandeStatus[]).map(s => (
              <option key={s} value={s}>
                {{'en_attente':'En attente','validee':'Validée','commandee':'Commandée','colis_arrive':'Colis arrivé','receptionnee':'Réceptionnée par le groupe','refusee':'Refusée','non_commandable':'Non commandable','annulee':'Annulée'}[s]}
              </option>
            ))}
          </select>

          {/* Filtre fournisseur */}
          <select
            value={params.fournisseur || ''}
            onChange={e => updateParam('fournisseur', e.target.value || null)}
            className="form-input w-auto"
            style={{ minWidth: 160 }}>
            <option value="">Tous les fournisseurs</option>
            {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>

          {/* Filtre groupe */}
          {isAdmin && (
            <select
              value={params.groupe || ''}
              onChange={e => updateParam('groupe', e.target.value || null)}
              className="form-input w-auto"
              style={{ minWidth: 160 }}>
              <option value="">Tous les groupes</option>
              {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
            </select>
          )}

          {/* Masquer terminées */}
          <button
            onClick={toggleMasquer}
            className={`btn-secondary text-xs px-3 py-1.5 ${params.masquer_terminees === '1' ? 'ring-2' : ''}`}
            >
            {params.masquer_terminees === '1' ? '👁 Afficher terminées' : '🙈 Masquer terminées'}
          </button>

          {canPrepareEmails && sorted.length > 0 && (
            <button
              onClick={() => setEmailCommandes(selectedCommandes.length > 0 ? selectedCommandes : sorted)}
              className="btn-secondary text-xs px-3 py-1.5"
              title={selectedCommandes.length > 0 ? 'Prépare les mails pour la sélection' : 'Prépare les mails pour les commandes actuellement affichées'}
            >
              ✉️ Préparer les emails par groupe
              {selectedCommandes.length > 0 ? ` (${selectedCommandes.length})` : ''}
            </button>
          )}

          {/* Réinitialiser */}
          {(params.statut || params.groupe || params.fournisseur || params.masquer_terminees) && (
            <a href="/dashboard/commandes" className="text-xs hover:underline" style={{ color: '#0071e3' }}>
              Réinitialiser
            </a>
          )}
        </div>

        {/* Ligne 2 : sélection rapide + actions bulk */}
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2 pt-2" style={{ borderTop: '1px solid #f2f2f7' }}>
            <span className="text-xs font-medium" style={{ color: '#aeaeb2' }}>Sélection rapide :</span>
            {(['en_attente','validee','commandee','colis_arrive','refusee','non_commandable','annulee','receptionnee'] as CommandeStatus[]).map(s => {
              const count = sorted.filter(c => c.statut === s).length;
              if (count === 0) return null;
              return (
                <button key={s} onClick={() => selectByStatut(s)}
                  className="text-xs px-2.5 py-1 rounded-full border transition-all"
                  style={{ background: '#f5f5f7', color: '#3a3a3c', borderColor: '#e5e5ea' }}>
                  {({'en_attente':'En attente','validee':'Validées','commandee':'Commandées','colis_arrive':'Colis arrivés','refusee':'Refusées','non_commandable':'Non commandables','annulee':'Annulées','receptionnee':'Réceptionnées par le groupe'} as Record<string,string>)[s]} ({count})
                </button>
              );
            })}
            {selected.size > 0 && (
              <button onClick={() => setSelected(new Set())}
                className="text-xs px-2.5 py-1 rounded-full border"
                style={{ background: '#fff1f0', color: '#ff3b30', borderColor: '#fecaca' }}>
                Tout désélectionner ({selected.size})
              </button>
            )}
          </div>
        )}

        {/* Actions bulk */}
        {bulkActions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2" style={{ borderTop: '1px solid #f2f2f7' }}>
            <span className="text-xs font-medium" style={{ color: '#1d1d1f' }}>
              {selected.size} commande{selected.size > 1 ? 's' : ''} sélectionnée{selected.size > 1 ? 's' : ''} :
            </span>
            {bulkActions.map(a => (
              <button key={a.newStatut}
                onClick={() => executeBulk(a.newStatut)}
                disabled={bulkLoading || isPending}
                className={`${a.style} text-xs py-1.5 px-3`}>
                {bulkLoading ? 'En cours…' : a.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {bulkError && <p role="alert" className="text-sm text-red-600 mb-3">{bulkError}</p>}

      {emailCommandes.length > 0 && (
        <GroupedEmails commandes={emailCommandes} onClose={() => setEmailCommandes([])} />
      )}

      {/* Tableau */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: '#fafafa', borderBottom: '1px solid #e5e5ea' }}>
              <tr>
                {isAdmin && (
                  <th className="table-header w-10">
                    <input type="checkbox"
                      checked={sorted.length > 0 && selected.size === sorted.length}
                      onChange={toggleAll}
                      className="rounded" />
                  </th>
                )}
                <th className="table-header">N°</th>
                {isAdmin && (
                  <th className="table-header cursor-pointer select-none" onClick={() => toggleSort('groupe')}>
                    Groupe {sortIcon('groupe')}
                  </th>
                )}
                <th className="table-header">Description</th>
                <th className="table-header cursor-pointer select-none" onClick={() => toggleSort('fournisseur')}>
                  Fournisseur {sortIcon('fournisseur')}
                </th>
                <th className="table-header">Quantité</th>
                <th className="table-header">Prix estimé total</th>
                {canSeeRealPrice && <th className="table-header">Prix réel</th>}
                <th className="table-header">Statut</th>
                <th className="table-header cursor-pointer select-none" onClick={() => toggleSort('date')}>
                  Date {sortIcon('date')}
                </th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 11 : 8} className="table-cell text-center py-12" style={{ color: '#aeaeb2' }}>
                    Aucune commande.
                  </td>
                </tr>
              )}
              {sorted.map((c: Commande) => {
                const isTerminee = STATUTS_TERMINES.includes(c.statut);
                const isSelected = selected.has(c.id);
                return (
                  <tr key={c.id}
                    style={{
                      borderTop: '1px solid #f2f2f7',
                      background: isSelected ? 'rgba(0,113,227,0.04)' : isTerminee ? '#fafafa' : undefined,
                      opacity: isTerminee ? 0.65 : 1,
                    }}>
                    {isAdmin && (
                      <td className="table-cell">
                        <input type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(c.id)}
                          className="rounded" />
                      </td>
                    )}
                    <td className="table-cell font-mono text-xs" style={{ color: '#aeaeb2' }}>#{c.id}</td>
                    {isAdmin && (
                      <td className="table-cell">
                        <p className="font-medium text-sm" style={{ color: '#1d1d1f' }}>{c.groupes?.nom}</p>
                        <p className="text-xs" style={{ color: '#aeaeb2' }}>{c.groupes?.promotions?.nom}</p>
                      </td>
                    )}
                    <td className="table-cell max-w-48">
                      <a href={c.lien_produit} target="_blank" rel="noopener noreferrer"
                        className="font-medium text-sm hover:underline line-clamp-1" style={{ color: '#0071e3' }}>
                        {c.description}
                      </a>
                    </td>
                    <td className="table-cell text-sm" style={{ color: '#3a3a3c' }}>{c.fournisseurs?.nom || '—'}</td>
                    <td className="table-cell text-sm" style={{ color: '#3a3a3c' }}>
                      {c.quantite ?? 1}
                    </td>
                    <td className="table-cell text-sm font-medium" style={{ color: '#1d1d1f' }}>
                      {Number(c.prix_estime).toFixed(2)} €
                      <p className="text-xs font-normal" style={{ color: '#aeaeb2' }}>
                        {Number(c.prix_unitaire ?? c.prix_estime).toFixed(2)} € / unité
                      </p>
                    </td>
                    {canSeeRealPrice && (
                      <td className="table-cell text-sm" style={{ color: '#6e6e73' }}>
                        {c.prix_reel ? `${Number(c.prix_reel).toFixed(2)} €` : '—'}
                      </td>
                    )}
                    <td className="table-cell"><StatusBadge statut={c.statut} /></td>
                    <td className="table-cell text-xs whitespace-nowrap" style={{ color: '#aeaeb2' }}>
                      {new Date(c.date_creation).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/commandes/${c.id}`}
                          className="text-sm font-medium hover:underline" style={{ color: '#0071e3' }}>
                          Voir →
                        </Link>
                        {isEtudiant && c.statut === 'en_attente' && (
                          <AnnulerCommandeButton commandeId={c.id} compact />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
