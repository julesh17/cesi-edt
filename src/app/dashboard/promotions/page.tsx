// src/app/dashboard/promotions/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function PromotionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile || profile.role === 'assistante' || profile.role === 'etudiant_groupe') {
    redirect('/dashboard');
  }

  const { data: promotions } = await supabase
    .from('promotions')
    .select('*, groupes(id)')
    .order('annee_academique', { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Promotions</h1>
          <p className="text-slate-500 text-sm mt-1">{promotions?.length || 0} promotion(s)</p>
        </div>
        <Link href="/dashboard/promotions/nouvelle" className="btn-primary">
          + Nouvelle promotion
        </Link>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="table-header">Nom</th>
              <th className="table-header">Année académique</th>
              <th className="table-header">Budget / groupe</th>
              <th className="table-header">Groupes</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {promotions?.length === 0 && (
              <tr>
                <td colSpan={5} className="table-cell text-center text-slate-400 py-10">
                  Aucune promotion. Créez-en une !
                </td>
              </tr>
            )}
            {promotions?.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="table-cell font-medium text-slate-900">{p.nom}</td>
                <td className="table-cell text-slate-600">{p.annee_academique}</td>
                <td className="table-cell font-medium">{Number(p.budget_par_groupe).toFixed(2)} €</td>
                <td className="table-cell">
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                    {p.groupes?.length || 0} groupe(s)
                  </span>
                </td>
                <td className="table-cell">
                  <div className="flex gap-3">
                    <Link href={`/dashboard/promotions/${p.id}`} className="text-cesi-600 hover:text-cesi-800 text-sm font-medium">
                      Gérer →
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
