// FICHIER : src/app/dashboard/commandes/[id]/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import StatusBadge from '@/components/StatusBadge';
import CommandeActions from './CommandeActions';
import AnnulerCommandeButton from '../AnnulerCommandeButton';
import type { Commande } from '@/types';

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('fr-FR', {
    timeZone: 'Europe/Paris',
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default async function CommandeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) redirect('/login');

  const { data: commande } = await supabase
    .from('commandes')
    .select('*, groupes(id, nom, promotion_id, promotions(id, nom, annee_academique)), fournisseurs(id, nom, site_web)')
    .eq('id', id)
    .single();

  if (!commande) notFound();

  const isAdmin = ['super_admin', 'responsable_pedagogique', 'assistante'].includes(profile.role);
  const isEtudiant = profile.role === 'etudiant_groupe';
  const canSeeRealPrice = isAdmin;

  if (isEtudiant) {
    const { data: groupe } = await supabase.from('groupes').select('id').eq('user_id', user.id).single();
    if (!groupe || groupe.id !== commande.groupe_id) redirect('/dashboard/commandes');
  }

  const { data: historique } = await supabase
    .from('historique_commandes')
    .select('*, profiles(nom, role)')
    .eq('commande_id', id)
    .order('created_at', { ascending: true });

  const cmd = commande as Commande;

  const sujet = 'Commande CESI arrivée';
  const corps = `Bonjour,\n\nVotre commande "${cmd.description}" est arrivée à l'école CESI. Vous pouvez venir la récupérer à l'école.\n\nCordialement`;
  const mailtoLink = `mailto:${cmd.email_referent}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;

  return (
    <div>
      <div className="mb-6">
        <a href="/dashboard/commandes" className="text-sm hover:underline" style={{ color: '#0071e3' }}>
          ← Retour aux commandes
        </a>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#1d1d1f', letterSpacing: '-0.5px' }}>
              Commande #{cmd.id}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#6e6e73' }}>{cmd.description}</p>
          </div>
          <StatusBadge statut={cmd.statut} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Infos produit */}
          <div className="card p-5">
            <h2 className="font-semibold text-sm mb-4" style={{ color: '#1d1d1f' }}>Détails du produit</h2>
            <dl className="space-y-3">
              <div className="flex justify-between text-sm">
                <dt style={{ color: '#6e6e73' }}>Description</dt>
                <dd className="font-medium text-right max-w-64" style={{ color: '#1d1d1f' }}>{cmd.description}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt style={{ color: '#6e6e73' }}>Lien produit</dt>
                <dd>
                  <a href={cmd.lien_produit} target="_blank" rel="noopener noreferrer"
                    className="text-sm hover:underline" style={{ color: '#0071e3' }}>
                    Voir le produit ↗
                  </a>
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt style={{ color: '#6e6e73' }}>Fournisseur</dt>
                <dd style={{ color: '#1d1d1f' }}>{cmd.fournisseurs?.nom || '—'}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt style={{ color: '#6e6e73' }}>Quantité</dt>
                <dd className="font-medium" style={{ color: '#1d1d1f' }}>{cmd.quantite ?? 1}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt style={{ color: '#6e6e73' }}>Prix unitaire TTC</dt>
                <dd className="font-medium" style={{ color: '#1d1d1f' }}>{Number(cmd.prix_unitaire ?? cmd.prix_estime).toFixed(2)} €</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt style={{ color: '#6e6e73' }}>Prix total estimé TTC</dt>
                <dd className="font-medium" style={{ color: '#1d1d1f' }}>{Number(cmd.prix_estime).toFixed(2)} €</dd>
              </div>
              {canSeeRealPrice && cmd.prix_reel && (
                <div className="flex justify-between text-sm">
                  <dt style={{ color: '#6e6e73' }}>Prix réel total payé</dt>
                  <dd className="font-semibold" style={{ color: '#34c759' }}>{Number(cmd.prix_reel).toFixed(2)} €</dd>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <dt style={{ color: '#6e6e73' }}>Référent étudiant</dt>
                <dd style={{ color: '#1d1d1f' }}>{cmd.email_referent}</dd>
              </div>
              {(cmd.statut === 'refusee' || cmd.statut === 'non_commandable') && (cmd as unknown as { motif?: string }).motif && (
                <div className="flex flex-col gap-1 text-sm pt-2" style={{ borderTop: '1px solid #f2f2f7' }}>
                  <dt className="font-medium" style={{ color: '#ff3b30' }}>
                    {cmd.statut === 'refusee' ? 'Motif du refus' : 'Motif'}
                  </dt>
                  <dd className="rounded-xl px-3 py-2 text-sm"
                      style={{ background: 'rgba(255,59,48,0.06)', color: '#c0392b', border: '1px solid rgba(255,59,48,0.12)' }}>
                    {(cmd as unknown as { motif?: string }).motif}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Groupe */}
          <div className="card p-5">
            <h2 className="font-semibold text-sm mb-4" style={{ color: '#1d1d1f' }}>Groupe</h2>
            <dl className="space-y-3">
              <div className="flex justify-between text-sm">
                <dt style={{ color: '#6e6e73' }}>Groupe</dt>
                <dd className="font-medium" style={{ color: '#1d1d1f' }}>{cmd.groupes?.nom}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt style={{ color: '#6e6e73' }}>Promotion</dt>
                <dd style={{ color: '#1d1d1f' }}>{cmd.groupes?.promotions?.nom}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt style={{ color: '#6e6e73' }}>Année académique</dt>
                <dd style={{ color: '#1d1d1f' }}>{cmd.groupes?.promotions?.annee_academique}</dd>
              </div>
            </dl>
          </div>

          {/* Chronologie */}
          <div className="card p-5">
            <h2 className="font-semibold text-sm mb-4" style={{ color: '#1d1d1f' }}>Chronologie</h2>
            <div className="space-y-2">
              {[
                { label: 'Créée le', date: cmd.date_creation },
                { label: 'Validée le', date: cmd.date_validation },
                { label: 'Commandée le', date: cmd.date_commande },
                { label: 'Colis arrivé le', date: cmd.date_colis_arrive },
                { label: 'Réceptionnée par le groupe le', date: cmd.date_reception },
              ].map(({ label, date }) => date && (
                <div key={label} className="flex justify-between text-sm">
                  <span style={{ color: '#6e6e73' }}>{label}</span>
                  <span style={{ color: '#1d1d1f' }}>{formatDate(date)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Historique */}
          {isAdmin && historique && historique.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-sm mb-4" style={{ color: '#1d1d1f' }}>Historique</h2>
              <ol className="space-y-3">
                {historique.map((h: { id: number; action: string; details: string; created_at: string; profiles?: { nom: string } }) => (
                  <li key={h.id} className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#0071e3' }} />
                    <div>
                      <p className="font-medium" style={{ color: '#1d1d1f' }}>{h.action}</p>
                      {h.details && <p className="text-xs mt-0.5" style={{ color: '#6e6e73' }}>{h.details}</p>}
                      <p className="text-xs mt-0.5" style={{ color: '#aeaeb2' }}>
                        {h.profiles?.nom || 'Système'} — {formatDate(h.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-4">
          {isAdmin && (
            <CommandeActions commande={cmd} profile={profile} mailtoLink={mailtoLink} />
          )}
          {isEtudiant && cmd.statut === 'en_attente' && (
            <div className="card p-5 space-y-3">
              <p className="font-semibold text-sm">Annuler cette demande</p>
              <p className="text-sm text-slate-500">La commande peut être annulée avant sa validation.</p>
              <AnnulerCommandeButton commandeId={cmd.id} />
            </div>
          )}
          {isEtudiant && cmd.statut === 'colis_arrive' && (
            <div className="card p-5">
              <p className="font-semibold text-sm mb-2" style={{ color: '#8e44ad' }}>Votre colis est arrivé !</p>
              <p className="text-sm" style={{ color: '#6e6e73' }}>
                Votre commande est disponible à l&apos;école. Vous pouvez venir la récupérer.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
