// src/app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { STATUS_LABELS, STATUS_COLORS } from '@/types';
import type { CommandeStatus } from '@/types';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single();
  if (!profile) redirect('/login');

  const isAdmin = ['super_admin', 'responsable_pedagogique', 'assistante'].includes(profile.role);
  const isEtudiant = profile.role === 'etudiant_groupe';

  // Données pour étudiants
  let groupeData = null;
  let budgetData = null;
  let commandesEtudiant: { statut: CommandeStatus }[] = [];

  if (isEtudiant) {
    const { data: groupe } = await supabase
      .from('groupes').select('*, promotions(*)').eq('user_id', user.id).single();
    groupeData = groupe;

    if (groupe) {
      const { data: budget } = await supabase
        .from('vue_budget_groupes').select('*').eq('groupe_id', groupe.id).single();
      budgetData = budget;

      const { data: commandes } = await supabase
        .from('commandes').select('statut').eq('groupe_id', groupe.id);
      commandesEtudiant = commandes || [];
    }
  }

  // Données pour admins
  let statsAdmin = { total: 0, en_attente: 0, commandee: 0, receptionnee: 0 };
  if (isAdmin) {
    const { data: commandes } = await supabase.from('commandes').select('statut');
    if (commandes) {
      statsAdmin.total = commandes.length;
      statsAdmin.en_attente = commandes.filter(c => c.statut === 'en_attente').length;
      statsAdmin.commandee = commandes.filter(c => c.statut === 'commandee').length;
      statsAdmin.receptionnee = commandes.filter(c => c.statut === 'receptionnee').length;
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Bonjour{profile.nom ? `, ${profile.nom}` : ''} 👋
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Vue Étudiant */}
      {isEtudiant && groupeData && (
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="font-semibold text-slate-900 mb-1">{groupeData.nom}</h2>
            <p className="text-sm text-slate-500">{groupeData.promotions?.nom} — {groupeData.promotions?.annee_academique}</p>
          </div>

          {budgetData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Budget total</p>
                <p className="text-2xl font-bold text-slate-900">{Number(budgetData.budget_total).toFixed(2)} €</p>
              </div>
              <div className="card p-5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Consommé</p>
                <p className="text-2xl font-bold text-amber-600">{Number(budgetData.budget_consomme).toFixed(2)} €</p>
              </div>
              <div className={`card p-5 ${Number(budgetData.budget_restant) <= 0 ? 'border-red-200 bg-red-50' : ''}`}>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Restant</p>
                <p className={`text-2xl font-bold ${Number(budgetData.budget_restant) <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {Number(budgetData.budget_restant).toFixed(2)} €
                </p>
              </div>
            </div>
          )}

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Mes commandes</h3>
              <a href="/dashboard/commandes/nouvelle" className="btn-primary text-xs py-1.5 px-3">
                + Nouvelle commande
              </a>
            </div>
            <div className="flex flex-wrap gap-2">
              {commandesEtudiant.length === 0 ? (
                <p className="text-sm text-slate-400">Aucune commande pour l&apos;instant.</p>
              ) : (
                Object.entries(
                  commandesEtudiant.reduce((acc, c) => {
                    acc[c.statut] = (acc[c.statut] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([statut, count]) => (
                  <span key={statut} className={`status-badge ${STATUS_COLORS[statut as CommandeStatus]}`}>
                    {STATUS_LABELS[statut as CommandeStatus]} ({count})
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vue Admin */}
      {isAdmin && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total commandes', value: statsAdmin.total, color: 'text-slate-900' },
              { label: 'En attente', value: statsAdmin.en_attente, color: 'text-amber-600' },
              { label: 'Commandées', value: statsAdmin.commandee, color: 'text-indigo-600' },
              { label: 'Réceptionnées par les groupes', value: statsAdmin.receptionnee, color: 'text-green-600' },
            ].map(stat => (
              <div key={stat.label} className="card p-5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{stat.label}</p>
                <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-3">Actions rapides</h3>
            <div className="flex flex-wrap gap-3">
              <a href="/dashboard/commandes" className="btn-secondary text-sm">
                Voir toutes les commandes
              </a>
              {profile.role !== 'assistante' && (
                <a href="/dashboard/promotions/nouvelle" className="btn-secondary text-sm">
                  Créer une promotion
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
