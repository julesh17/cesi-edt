import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import NouvelleCommandeForm from './NouvelleCommandeForm';

export default async function NouvelleCommandePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) redirect('/login');

  // Récupérer le groupe de l'étudiant connecté (ou sélection pour admin)
  let groupeActuel = null;
  let budgetRestant = 999999;

  if (profile.role === 'etudiant_groupe') {
    const { data: groupe } = await supabase
      .from('groupes').select('*, promotions(*)').eq('user_id', user.id).single();
    groupeActuel = groupe;

    if (groupe) {
      const { data: budget } = await supabase
        .from('vue_budget_groupes').select('*').eq('groupe_id', groupe.id).single();
      budgetRestant = budget ? Number(budget.budget_restant) : 0;
    }
  }

  const { data: fournisseurs } = await supabase
    .from('fournisseurs').select('*').eq('actif', true).order('nom');

  // Pour les admins, charger les groupes disponibles
  let groupes = null;
  if (profile.role !== 'etudiant_groupe') {
    const { data } = await supabase
      .from('groupes').select('*, promotions(nom, annee_academique)').order('nom');
    groupes = data;
  }

  return (
    <div>
      <div className="mb-6">
        <a href="/dashboard/commandes" className="text-sm text-slate-500 hover:text-slate-700">
          ← Retour aux commandes
        </a>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Nouvelle commande</h1>
        {groupeActuel && (
          <p className="text-slate-500 text-sm mt-1">
            Groupe : {groupeActuel.nom} — Budget restant :{' '}
            <span className={budgetRestant <= 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
              {budgetRestant.toFixed(2)} €
            </span>
          </p>
        )}
      </div>

      {budgetRestant <= 0 && profile.role === 'etudiant_groupe' ? (
        <div className="card p-8 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Budget épuisé</h2>
          <p className="text-slate-500 text-sm">
            Le budget de votre groupe est épuisé. Aucune nouvelle commande ne peut être soumise.
          </p>
        </div>
      ) : (
        <NouvelleCommandeForm
          fournisseurs={fournisseurs || []}
          groupeId={groupeActuel?.id || null}
          groupes={groupes}
          budgetRestant={budgetRestant}
          isAdmin={profile.role !== 'etudiant_groupe'}
        />
      )}
    </div>
  );
}
