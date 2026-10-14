// FICHIER : src/app/dashboard/promotions/[id]/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import NouveauGroupeForm from './NouveauGroupeForm';
import ModifierAssistanteForm from './ModifierAssistanteForm';

export default async function PromotionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile || !['super_admin', 'responsable_pedagogique'].includes(profile.role)) redirect('/dashboard');

  const { data: promotion } = await supabase
    .from('promotions')
    .select('*, assistante:assistante_id(id, nom)')
    .eq('id', id)
    .single();
  if (!promotion) notFound();

  const { data: groupes } = await supabase
    .from('groupes')
    .select('*, responsable:responsable_id(nom)')
    .eq('promotion_id', id)
    .order('nom');

  const { data: budgets } = await supabase
    .from('vue_budget_groupes').select('*').eq('promotion_id', parseInt(id));

  const budgetMap = new Map(budgets?.map(b => [b.groupe_id, b]));

  const isResponsable = profile.role === 'responsable_pedagogique';

  const { data: responsables } = isResponsable
    ? { data: [] }
    : await supabase.from('profiles').select('id, nom').eq('role', 'responsable_pedagogique').order('nom');

  const { data: assistantes } = await supabase
    .from('profiles').select('id, nom').eq('role', 'assistante').order('nom');

  const assistanteActuelle = promotion.assistante as { id: string; nom: string } | null;

  return (
    <div>
      <div className="mb-6">
        <a href="/dashboard/promotions" className="text-sm hover:underline" style={{ color: '#0071e3' }}>
          ← Retour aux promotions
        </a>
        <div className="mt-2">
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#1d1d1f', letterSpacing: '-0.5px' }}>
            {promotion.nom}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#6e6e73' }}>
            {promotion.annee_academique} — Budget par groupe : {Number(promotion.budget_par_groupe).toFixed(2)} €
            {assistanteActuelle && (
              <> — Assistante : <strong style={{ color: '#1d1d1f' }}>{assistanteActuelle.nom}</strong></>
            )}
          </p>
        </div>
      </div>

      {/* Modifier l'assistante */}
      <div className="mb-6">
        <ModifierAssistanteForm
          promotionId={parseInt(id)}
          assistantes={assistantes || []}
          currentAssistanteId={assistanteActuelle?.id || ''}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #f2f2f7' }}>
            <h2 className="font-semibold text-sm" style={{ color: '#1d1d1f' }}>
              {groupes?.length || 0} groupe(s)
            </h2>
          </div>
          <table className="w-full">
            <thead style={{ background: '#fafafa', borderBottom: '1px solid #e5e5ea' }}>
              <tr>
                <th className="table-header">Groupe</th>
                <th className="table-header">Responsable</th>
                <th className="table-header">Budget total</th>
                <th className="table-header">Consommé</th>
                <th className="table-header">Restant</th>
              </tr>
            </thead>
            <tbody>
              {(!groupes || groupes.length === 0) && (
                <tr>
                  <td colSpan={5} className="table-cell text-center py-8" style={{ color: '#aeaeb2' }}>
                    Aucun groupe. Créez-en un ci-contre.
                  </td>
                </tr>
              )}
              {groupes?.map(g => {
                const budget = budgetMap.get(g.id);
                const isOver = budget && Number(budget.budget_restant) <= 0;
                const pct = budget && budget.budget_total > 0
                  ? Math.min(100, (Number(budget.budget_consomme) / Number(budget.budget_total)) * 100)
                  : 0;
                return (
                  <tr key={g.id} style={{ borderTop: '1px solid #f2f2f7' }}>
                    <td className="table-cell font-medium text-sm" style={{ color: '#1d1d1f' }}>{g.nom}</td>
                    <td className="table-cell text-sm" style={{ color: '#6e6e73' }}>
                      {(g.responsable as { nom: string } | null)?.nom || <span style={{ color: '#aeaeb2' }}>—</span>}
                    </td>
                    <td className="table-cell text-sm">{budget ? `${Number(budget.budget_total).toFixed(2)} €` : '—'}</td>
                    <td className="table-cell text-sm" style={{ color: '#f0a500' }}>
                      {budget ? `${Number(budget.budget_consomme).toFixed(2)} €` : '—'}
                    </td>
                    <td className="table-cell">
                      {budget ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" style={{ color: isOver ? '#ff3b30' : '#34c759' }}>
                            {Number(budget.budget_restant).toFixed(2)} €
                          </span>
                          <div className="w-16 h-1.5 rounded-full" style={{ background: '#f2f2f7' }}>
                            <div className="h-1.5 rounded-full"
                                 style={{ width: `${pct}%`, background: isOver ? '#ff3b30' : pct > 80 ? '#ff9500' : '#34c759' }} />
                          </div>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <NouveauGroupeForm
          promotionId={promotion.id}
          responsables={responsables || []}
          fixedResponsableId={isResponsable ? profile.id : undefined}
          fixedResponsableNom={isResponsable ? (profile.nom ?? undefined) : undefined}
        />
      </div>
    </div>
  );
}
