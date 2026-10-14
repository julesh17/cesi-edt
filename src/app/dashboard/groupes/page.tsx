import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BudgetEditor from './BudgetEditor';

interface BudgetRow {
  groupe_id: number;
  groupe_nom: string;
  promotion_id: number;
  promotion_nom: string;
  budget_standard?: number;
  budget_ajustement?: number;
  budget_total: number;
  budget_consomme: number;
  budget_restant: number;
}

export default async function GroupesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile || profile.role === 'etudiant_groupe') redirect('/dashboard');

  const canEditBudget = ['super_admin', 'responsable_pedagogique'].includes(profile.role);

  // Déterminer les promotions visibles et récupérer leur budget standard.
  let promotionsQuery = supabase
    .from('promotions')
    .select('id, nom, budget_par_groupe, responsable_id, assistante_id');

  if (profile.role === 'responsable_pedagogique') {
    promotionsQuery = promotionsQuery.eq('responsable_id', user.id);
  } else if (profile.role === 'assistante') {
    promotionsQuery = promotionsQuery.eq('assistante_id', user.id);
  }

  const { data: promotions } = await promotionsQuery;
  const promotionIds = promotions?.map(p => p.id) || [];
  const budgetStandardByPromotion = new Map(
    (promotions || []).map(p => [p.id, Number(p.budget_par_groupe)])
  );

  let budgetsQuery = supabase
    .from('vue_budget_groupes')
    .select('*')
    .order('promotion_nom');

  if (profile.role !== 'super_admin') {
    budgetsQuery = promotionIds.length > 0
      ? budgetsQuery.in('promotion_id', promotionIds)
      : budgetsQuery.eq('promotion_id', -1);
  }

  const { data: budgets } = await budgetsQuery;
  const rows = (budgets || []) as BudgetRow[];

  // Grouper par promotion
  const byPromotion = new Map<string, BudgetRow[]>();
  rows.forEach(b => {
    const key = b.promotion_nom;
    if (!byPromotion.has(key)) byPromotion.set(key, []);
    byPromotion.get(key)!.push(b);
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Groupes & Budgets</h1>
        <p className="text-slate-500 text-sm mt-1">
          Vue d&apos;ensemble des budgets par groupe
          {canEditBudget && ' — le budget d’un groupe peut être ajusté exceptionnellement'}
        </p>
      </div>

      {byPromotion.size === 0 && (
        <div className="card p-10 text-center text-slate-400">
          Aucun groupe trouvé. Créez d&apos;abord une promotion avec des groupes.
        </div>
      )}

      <div className="space-y-6">
        {Array.from(byPromotion.entries()).map(([promoNom, groupes]) => (
          <div key={promoNom} className="card overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">{promoNom}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-100">
                  <tr>
                    <th className="table-header">Groupe</th>
                    <th className="table-header">Budget total</th>
                    <th className="table-header">Consommé</th>
                    <th className="table-header">Restant</th>
                    <th className="table-header">Utilisation</th>
                    {canEditBudget && <th className="table-header">Ajustement exceptionnel</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {groupes.map(g => {
                    const budgetTotal = Number(g.budget_total);
                    const budgetStandard = Number(
                      g.budget_standard ?? budgetStandardByPromotion.get(g.promotion_id) ?? budgetTotal
                    );
                    const adjustment = Number(g.budget_ajustement ?? (budgetTotal - budgetStandard));
                    const pct = budgetTotal > 0
                      ? Math.min(100, (Number(g.budget_consomme) / budgetTotal) * 100)
                      : 0;
                    const isOver = Number(g.budget_restant) <= 0;
                    const hasAdjustment = Math.abs(adjustment) > 0.005;

                    return (
                      <tr key={g.groupe_id} className="hover:bg-slate-50 align-top">
                        <td className="table-cell font-medium text-slate-900">{g.groupe_nom}</td>
                        <td className="table-cell">
                          <div className="font-medium">{budgetTotal.toFixed(2)} €</div>
                          {hasAdjustment && (
                            <div className="text-xs mt-0.5" style={{ color: adjustment > 0 ? '#34c759' : '#ff3b30' }}>
                              Standard {budgetStandard.toFixed(2)} € {adjustment > 0 ? '+' : '−'} {Math.abs(adjustment).toFixed(2)} €
                            </div>
                          )}
                        </td>
                        <td className="table-cell text-amber-600 font-medium">
                          {Number(g.budget_consomme).toFixed(2)} €
                        </td>
                        <td className="table-cell">
                          <span className={`font-semibold ${isOver ? 'text-red-600' : 'text-green-600'}`}>
                            {Number(g.budget_restant).toFixed(2)} €
                          </span>
                        </td>
                        <td className="table-cell w-40">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all ${isOver ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-green-500'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-400 w-8 text-right">{Math.round(pct)}%</span>
                          </div>
                        </td>
                        {canEditBudget && (
                          <td className="table-cell">
                            <BudgetEditor
                              groupeId={g.groupe_id}
                              groupeNom={g.groupe_nom}
                              budgetStandard={budgetStandard}
                              budgetTotal={budgetTotal}
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
