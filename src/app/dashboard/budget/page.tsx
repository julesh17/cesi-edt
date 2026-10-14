// FICHIER : src/app/dashboard/budget/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BudgetCharts from './BudgetCharts';

export default async function BudgetPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile || !['super_admin', 'responsable_pedagogique'].includes(profile.role)) redirect('/dashboard');

  // Charger toutes les promotions avec leurs groupes et commandes
  let promosQuery = supabase
    .from('promotions')
    .select('id, nom, annee_academique, budget_par_groupe')
    .order('annee_academique', { ascending: false });

  // Responsable : seulement ses promotions
  if (profile.role === 'responsable_pedagogique') {
    promosQuery = promosQuery.eq('responsable_id', user.id);
  }

  const { data: promotions } = await promosQuery;

  if (!promotions || promotions.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-6" style={{ color: '#1d1d1f', letterSpacing: '-0.5px' }}>
          Budget
        </h1>
        <div className="card p-10 text-center" style={{ color: '#aeaeb2' }}>
          Aucune promotion trouvée.
        </div>
      </div>
    );
  }

  const promoIds = promotions.map(p => p.id);

  // Groupes de ces promotions
  const { data: groupes } = await supabase
    .from('groupes').select('*').in('promotion_id', promoIds);

  const groupeIds = groupes?.map(g => g.id) || [];

  // Commandes actives (hors refusées et non commandables)
  const { data: commandes } = groupeIds.length > 0
    ? await supabase
        .from('commandes')
        .select('id, groupe_id, prix_estime, prix_reel, statut, fournisseur_id, fournisseurs(nom)')
        .in('groupe_id', groupeIds)
        .not('statut', 'in', '("refusee","non_commandable","annulee")')
    : { data: [] };

  // Fournisseurs pour les graphiques
  const { data: fournisseurs } = await supabase.from('fournisseurs').select('id, nom');

  // Calcul par promotion
  const statsParPromo = promotions.map(promo => {
    const groupesPromo = groupes?.filter(g => g.promotion_id === promo.id) || [];
    const groupeIdsPromo = groupesPromo.map(g => g.id);
    const commandesPromo = commandes?.filter(c => groupeIdsPromo.includes(c.groupe_id)) || [];

    const nbGroupes = groupesPromo.length;
    const budgetTotal = groupesPromo.reduce((sum, g) => {
      const ajustement = Number((g as { budget_ajustement?: number }).budget_ajustement || 0);
      return sum + Number(promo.budget_par_groupe) + ajustement;
    }, 0);
    const budgetConsomme = commandesPromo.reduce((sum, c) => {
      const prix = c.prix_reel ? Number(c.prix_reel) : Number(c.prix_estime);
      return sum + prix;
    }, 0);

    // Budget par fournisseur
    const parFournisseur: Record<string, number> = {};
    commandesPromo.forEach(c => {
      const nomF = (c.fournisseurs as unknown as { nom: string } | null)?.nom || 'Inconnu';
      parFournisseur[nomF] = (parFournisseur[nomF] || 0) + (c.prix_reel ? Number(c.prix_reel) : Number(c.prix_estime));
    });

    return {
      id: promo.id,
      nom: promo.nom,
      annee_academique: promo.annee_academique,
      budget_par_groupe: promo.budget_par_groupe,
      nb_groupes: nbGroupes,
      budget_total: budgetTotal,
      budget_consomme: budgetConsomme,
      budget_restant: budgetTotal - budgetConsomme,
      pct: budgetTotal > 0 ? Math.min(100, (budgetConsomme / budgetTotal) * 100) : 0,
      nb_commandes: commandesPromo.length,
      par_fournisseur: parFournisseur,
    };
  });

  const totalGlobal = statsParPromo.reduce((s, p) => s + p.budget_total, 0);
  const consommeGlobal = statsParPromo.reduce((s, p) => s + p.budget_consomme, 0);

  // Budget global par fournisseur
  const parFournisseurGlobal: Record<string, number> = {};
  statsParPromo.forEach(p => {
    Object.entries(p.par_fournisseur).forEach(([nom, val]) => {
      parFournisseurGlobal[nom] = (parFournisseurGlobal[nom] || 0) + val;
    });
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#1d1d1f', letterSpacing: '-0.5px' }}>
          Budget
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#6e6e73' }}>
          Vue d&apos;ensemble des budgets par promotion
        </p>
      </div>

      {/* Résumé global */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#aeaeb2' }}>Budget total alloué</p>
          <p className="text-2xl font-bold" style={{ color: '#1d1d1f' }}>{totalGlobal.toFixed(2)} €</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#aeaeb2' }}>Consommé à date</p>
          <p className="text-2xl font-bold" style={{ color: '#f0a500' }}>{consommeGlobal.toFixed(2)} €</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#aeaeb2' }}>Restant</p>
          <p className="text-2xl font-bold" style={{ color: (totalGlobal - consommeGlobal) < 0 ? '#ff3b30' : '#34c759' }}>
            {(totalGlobal - consommeGlobal).toFixed(2)} €
          </p>
        </div>
      </div>

      {/* Tableau récapitulatif */}
      <div className="card overflow-hidden mb-6">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #f2f2f7' }}>
          <h2 className="font-semibold text-sm" style={{ color: '#1d1d1f' }}>Récapitulatif par promotion</h2>
        </div>
        <table className="w-full">
          <thead style={{ background: '#fafafa', borderBottom: '1px solid #e5e5ea' }}>
            <tr>
              <th className="table-header">Promotion</th>
              <th className="table-header">Année</th>
              <th className="table-header">Groupes</th>
              <th className="table-header">Budget alloué</th>
              <th className="table-header">Consommé</th>
              <th className="table-header">Restant</th>
              <th className="table-header">Utilisation</th>
            </tr>
          </thead>
          <tbody>
            {statsParPromo.map(p => (
              <tr key={p.id} style={{ borderTop: '1px solid #f2f2f7' }}>
                <td className="table-cell font-medium text-sm" style={{ color: '#1d1d1f' }}>{p.nom}</td>
                <td className="table-cell text-sm" style={{ color: '#6e6e73' }}>{p.annee_academique}</td>
                <td className="table-cell text-sm" style={{ color: '#6e6e73' }}>{p.nb_groupes}</td>
                <td className="table-cell text-sm font-medium" style={{ color: '#1d1d1f' }}>{p.budget_total.toFixed(2)} €</td>
                <td className="table-cell text-sm font-medium" style={{ color: '#f0a500' }}>{p.budget_consomme.toFixed(2)} €</td>
                <td className="table-cell text-sm font-semibold" style={{ color: p.budget_restant < 0 ? '#ff3b30' : '#34c759' }}>
                  {p.budget_restant.toFixed(2)} €
                </td>
                <td className="table-cell w-40">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: '#f2f2f7' }}>
                      <div className="h-1.5 rounded-full transition-all"
                           style={{
                             width: `${p.pct}%`,
                             background: p.pct > 90 ? '#ff3b30' : p.pct > 70 ? '#ff9500' : '#34c759'
                           }} />
                    </div>
                    <span className="text-xs w-8 text-right" style={{ color: '#aeaeb2' }}>{Math.round(p.pct)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Graphiques côté client */}
      <BudgetCharts
        statsParPromo={statsParPromo}
        parFournisseurGlobal={parFournisseurGlobal}
        totalGlobal={totalGlobal}
        consommeGlobal={consommeGlobal}
      />
    </div>
  );
}
