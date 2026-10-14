// src/app/dashboard/export/page.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ExportPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: commandes, error: err } = await supabase
        .from('commandes')
        .select(`
          id, description, lien_produit, quantite, prix_unitaire, prix_estime, prix_reel, email_referent, statut,
          date_creation, date_validation, date_commande, date_colis_arrive, date_reception,
          groupes(nom, promotions(nom, annee_academique)),
          fournisseurs(nom)
        `)
        .order('date_creation', { ascending: false });

      if (err) throw err;

      // Construire le CSV
      const headers = [
        'N°', 'Description', 'Lien produit', 'Fournisseur',
        'Groupe', 'Promotion', 'Année académique',
        'Quantité', 'Prix unitaire TTC (€)', 'Prix estimé total (€)', 'Prix réel total (€)', 'Email référent', 'Statut',
        'Date création', 'Date validation', 'Date commande',
        'Date arrivée colis', 'Date réception'
      ];

      const STATUS_FR: Record<string, string> = {
        en_attente: 'En attente de validation',
        refusee: 'Refusée',
        annulee: 'Annulée par le groupe',
        validee: 'Validée — en attente de commande',
        commandee: 'Commandée',
        non_commandable: 'Non commandable',
        colis_arrive: 'Colis arrivé',
        receptionnee: 'Réceptionnée par le groupe',
      };

      const formatDate = (d: string | null) =>
        d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

      const rows = commandes?.map(c => [
        c.id,
        c.description,
        c.lien_produit,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (c.fournisseurs as any)?.nom || '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (c.groupes as any)?.nom || '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (c.groupes as any)?.promotions?.nom || '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (c.groupes as any)?.promotions?.annee_academique || '',
        c.quantite ?? 1,
        Number(c.prix_unitaire ?? c.prix_estime).toFixed(2),
        Number(c.prix_estime).toFixed(2),
        c.prix_reel ? Number(c.prix_reel).toFixed(2) : '',
        c.email_referent,
        STATUS_FR[c.statut] || c.statut,
        formatDate(c.date_creation),
        formatDate(c.date_validation),
        formatDate(c.date_commande),
        formatDate(c.date_colis_arrive),
        formatDate(c.date_reception),
      ]) || [];

      // Créer CSV avec BOM UTF-8 pour Excel
      const csvContent = '\uFEFF' + [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';'))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `commandes-cesi-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError('Erreur lors de l\'export : ' + (e instanceof Error ? e.message : 'Inconnue'));
    }

    setLoading(false);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Export</h1>
        <p className="text-slate-500 text-sm mt-1">Exportez les données de commandes au format CSV (compatible Excel).</p>
      </div>

      <div className="max-w-lg card p-6 space-y-4">
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Export complet</p>
            <p>Le fichier inclut toutes les commandes avec les prix réels, les dates et les informations de groupe. Ce fichier est réservé aux responsables pédagogiques et administrateurs.</p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-2">Colonnes exportées :</h3>
          <ul className="text-sm text-slate-500 space-y-1 list-disc list-inside">
            <li>N° commande, description, lien produit, fournisseur</li>
            <li>Groupe, promotion, année académique</li>
            <li>Quantité, prix unitaire TTC, prix total estimé et prix réel payé</li>
            <li>Email référent, statut</li>
            <li>Toutes les dates (création, validation, commande, arrivée, réception)</li>
          </ul>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <button onClick={handleExport} disabled={loading} className="btn-primary w-full justify-center">
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Export en cours…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Télécharger le CSV
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
