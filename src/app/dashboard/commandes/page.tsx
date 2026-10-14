// FICHIER : src/app/dashboard/commandes/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CommandesClient from './CommandesClient';
import type { Commande } from '@/types';

export default async function CommandesPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; groupe?: string; fournisseur?: string; masquer_terminees?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) redirect('/login');

  const isAdmin = ['super_admin', 'responsable_pedagogique', 'assistante'].includes(profile.role);
  const isSuperAdmin = profile.role === 'super_admin';
  const isResponsable = profile.role === 'responsable_pedagogique';
  const isAssistante = profile.role === 'assistante';
  const isEtudiant = profile.role === 'etudiant_groupe';

  let query = supabase
    .from('commandes')
    .select('*, groupes(id, nom, promotion_id, promotions(id, nom, annee_academique, responsable_id, assistante_id)), fournisseurs(id, nom)')
    .order('date_creation', { ascending: false });

  if (isEtudiant) {
    const { data: groupe } = await supabase.from('groupes').select('id').eq('user_id', user.id).single();
    if (groupe) query = query.eq('groupe_id', groupe.id);
  } else if (isResponsable) {
    const { data: promos } = await supabase.from('promotions').select('id').eq('responsable_id', user.id);
    const promoIds = promos?.map(p => p.id) || [];
    if (promoIds.length === 0) { query = query.eq('groupe_id', -1); }
    else {
      const { data: groupes } = await supabase.from('groupes').select('id').in('promotion_id', promoIds);
      const gIds = groupes?.map(g => g.id) || [];
      query = gIds.length === 0 ? query.eq('groupe_id', -1) : query.in('groupe_id', gIds);
    }
  } else if (isAssistante) {
    const { data: promos } = await supabase.from('promotions').select('id').eq('assistante_id', user.id);
    const promoIds = promos?.map(p => p.id) || [];
    if (promoIds.length === 0) { query = query.eq('groupe_id', -1); }
    else {
      const { data: groupes } = await supabase.from('groupes').select('id').in('promotion_id', promoIds);
      const gIds = groupes?.map(g => g.id) || [];
      query = gIds.length === 0 ? query.eq('groupe_id', -1) : query.in('groupe_id', gIds);
      query = query.in('statut', ['validee', 'commandee', 'non_commandable', 'colis_arrive', 'receptionnee']);
    }
  }

  // Masquer les terminées
  if (params.masquer_terminees === '1') {
    query = query.not('statut', 'in', '("refusee","non_commandable","annulee","receptionnee")');
  }
  if (params.statut) query = query.eq('statut', params.statut);
  if (params.groupe) query = query.eq('groupe_id', params.groupe);
  if (params.fournisseur) query = query.eq('fournisseur_id', params.fournisseur);

  const { data: commandes, error } = await query;
  if (error) throw new Error(error.message);

  // Listes pour les filtres
  const { data: groupes } = isAdmin
    ? await supabase.from('groupes').select('id, nom').order('nom')
    : { data: [] };
  const { data: fournisseurs } = await supabase.from('fournisseurs').select('id, nom').eq('actif', true).order('nom');

  const canSeeRealPrice = !isEtudiant;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#1d1d1f', letterSpacing: '-0.5px' }}>
            Commandes
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#6e6e73' }}>
            {commandes?.length || 0} commande{(commandes?.length || 0) > 1 ? 's' : ''}
            {isAssistante && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: '#f2f2f7', color: '#6e6e73' }}>
                Commandes validées uniquement
              </span>
            )}
          </p>
        </div>
        {isEtudiant && (
          <Link href="/dashboard/commandes/nouvelle" className="btn-primary">+ Nouvelle commande</Link>
        )}
      </div>

      <CommandesClient
        commandes={(commandes || []) as unknown as Commande[]}
        profile={profile}
        groupes={isAdmin ? (groupes || []) : []}
        fournisseurs={fournisseurs || []}
        params={params}
        canSeeRealPrice={canSeeRealPrice}
        isAdmin={isAdmin}
        isSuperAdmin={isSuperAdmin}
        isResponsable={isResponsable}
        isAssistante={isAssistante}
        isEtudiant={isEtudiant}
      />
    </div>
  );
}
