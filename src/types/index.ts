// src/types/index.ts

export type UserRole = 'super_admin' | 'responsable_pedagogique' | 'assistante' | 'etudiant_groupe';

export type CommandeStatus =
  | 'en_attente'
  | 'refusee'
  | 'annulee'
  | 'validee'
  | 'commandee'
  | 'non_commandable'
  | 'colis_arrive'
  | 'receptionnee';

export interface Profile {
  id: string;
  role: UserRole;
  nom: string | null;
}

export interface Fournisseur {
  id: number;
  nom: string;
  site_web: string | null;
  actif: boolean;
}

export interface Promotion {
  id: number;
  nom: string;
  annee_academique: string;
  budget_par_groupe: number;
  created_at: string;
}

export interface Groupe {
  id: number;
  promotion_id: number;
  nom: string;
  user_id: string | null;
  created_at: string;
  budget_ajustement?: number;
  promotions?: Promotion;
}

export interface Commande {
  id: number;
  groupe_id: number;
  lien_produit: string;
  description: string;
  fournisseur_id: number | null;
  quantite: number;
  prix_unitaire: number;
  prix_estime: number;
  prix_reel: number | null;
  email_referent: string;
  statut: CommandeStatus;
  date_creation: string;
  date_validation: string | null;
  date_commande: string | null;
  date_colis_arrive: string | null;
  date_reception: string | null;
  date_mise_a_jour: string;
  validated_by: string | null;
  ordered_by: string | null;
  // Joined
  groupes?: Groupe & { promotions?: Promotion };
  fournisseurs?: Fournisseur;
}

export interface BudgetGroupe {
  groupe_id: number;
  groupe_nom: string;
  promotion_id: number;
  promotion_nom: string;
  budget_total: number;
  budget_consomme: number;
  budget_restant: number;
}

export const STATUS_LABELS: Record<CommandeStatus, string> = {
  en_attente: 'En attente de validation',
  refusee: 'Refusée',
  annulee: 'Annulée par le groupe',
  validee: 'Validée — en attente de commande',
  commandee: 'Commandée',
  non_commandable: 'Non commandable',
  colis_arrive: 'Colis arrivé',
  receptionnee: 'Réceptionnée par le groupe',
};

export const STATUS_COLORS: Record<CommandeStatus, string> = {
  en_attente:      'bg-amber-50 text-amber-700 border-amber-300',
  refusee:         'bg-red-50 text-red-700 border-red-300',
  annulee:         'bg-slate-100 text-slate-600 border-slate-300',
  validee:         'bg-blue-50 text-blue-700 border-blue-300',
  commandee:       'bg-violet-50 text-violet-700 border-violet-300',
  non_commandable: 'bg-slate-100 text-slate-500 border-slate-200',
  colis_arrive:    'bg-orange-50 text-orange-700 border-orange-300',
  receptionnee:    'bg-emerald-50 text-emerald-700 border-emerald-300',
};

export const STATUS_DOT: Record<CommandeStatus, string> = {
  en_attente:      '#f59e0b',
  refusee:         '#ef4444',
  annulee:         '#64748b',
  validee:         '#3b82f6',
  commandee:       '#7c3aed',
  non_commandable: '#94a3b8',
  colis_arrive:    '#f97316',
  receptionnee:    '#10b981',
};
