'use client';

import { useMemo } from 'react';
import type { Commande } from '@/types';

interface Props {
  commandes: Commande[];
  onClose: () => void;
}

const STATUS_TEXT: Record<string, string> = {
  en_attente: 'En attente de validation',
  validee: 'Validée',
  commandee: 'Commandée',
  colis_arrive: 'Colis arrivé à CESI',
  receptionnee: 'Réceptionnée par le groupe',
  refusee: 'Refusée',
  non_commandable: 'Non commandable',
  annulee: 'Annulée par le groupe',
};

function ligneCommande(c: Commande) {
  const lignes = [
    `• Commande #${c.id} — ${c.description}`,
    `  Fournisseur : ${c.fournisseurs?.nom || 'Non renseigné'}`,
    `  Quantité : ${c.quantite ?? 1}`, 
    `  Lien : ${c.lien_produit}`,
  ];
  return lignes.join('\n');
}

function buildMail(commandes: Commande[]) {
  const first = commandes[0];
  const groupe = first.groupes?.nom || `Groupe ${first.groupe_id}`;
  const promotion = first.groupes?.promotions?.nom;
  const destinataires = Array.from(
    new Set(commandes.map(c => c.email_referent).filter(Boolean))
  );

  const aRemplacer = commandes.filter(c => ['refusee', 'non_commandable'].includes(c.statut));
  const arrives = commandes.filter(c => c.statut === 'colis_arrive');
  const autres = commandes.filter(c => !['refusee', 'non_commandable', 'annulee', 'colis_arrive'].includes(c.statut));
  const annulees = commandes.filter(c => c.statut === 'annulee');

  const sections: string[] = [];

  if (arrives.length > 0) {
    sections.push(
      `Les produits suivants sont arrivés à CESI et sont disponibles pour votre groupe :\n\n${arrives.map(ligneCommande).join('\n\n')}`
    );
  }

  if (aRemplacer.length > 0) {
    const details = aRemplacer.map(c => {
      const motif = (c as Commande & { motif?: string | null }).motif?.trim();
      return [
        ligneCommande(c),
        `  Statut : ${STATUS_TEXT[c.statut] || c.statut}`,
        `  Motif : ${motif || 'Aucun motif précisé'}`,
      ].join('\n');
    }).join('\n\n');

    sections.push(
      `Les produits suivants ne peuvent pas être retenus en l'état :\n\n${details}\n\nMerci de rechercher un produit équivalent correspondant au besoin et de déposer une nouvelle demande de commande avec la nouvelle référence.`
    );
  }

  if (autres.length > 0) {
    sections.push(
      `Voici également les commandes concernées par ce message :\n\n${autres.map(c => `${ligneCommande(c)}\n  Statut : ${STATUS_TEXT[c.statut] || c.statut}`).join('\n\n')}`
    );
  }

  if (annulees.length > 0) {
    sections.push(`Commandes annulées par le groupe :\n\n${annulees.map(ligneCommande).join('\n\n')}`);
  }

  const sujet = aRemplacer.length > 0
    ? `Commandes CESI — produits à remplacer — ${groupe}`
    : arrives.length > 0
      ? `Commandes CESI disponibles — ${groupe}`
      : `Suivi des commandes CESI — ${groupe}`;

  const contexteGroupe = promotion ? `${groupe} — ${promotion}` : groupe;
  const corps = [
    'Bonjour,',
    '',
    `Voici un point concernant les commandes du groupe ${contexteGroupe}.`,
    '',
    sections.join('\n\n'),
    '',
    'Cordialement',
  ].join('\n');

  const mailto = `mailto:${destinataires.join(',')}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;

  return { groupeId: first.groupe_id, groupe, promotion, destinataires, sujet, corps, mailto };
}

export default function GroupedEmails({ commandes, onClose }: Props) {
  const mails = useMemo(() => {
    const byGroupe = new Map<number, Commande[]>();
    commandes.forEach(c => {
      const liste = byGroupe.get(c.groupe_id) || [];
      liste.push(c);
      byGroupe.set(c.groupe_id, liste);
    });
    return Array.from(byGroupe.values()).map(buildMail);
  }, [commandes]);

  return (
    <div className="card p-5 mb-5" style={{ borderColor: '#bfdbfe', background: '#f8fbff' }}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="font-semibold text-sm" style={{ color: '#1d1d1f' }}>
            Emails préparés par groupe
          </h2>
          <p className="text-xs mt-1" style={{ color: '#6e6e73' }}>
            {mails.length} mail{mails.length > 1 ? 's' : ''} prêt{mails.length > 1 ? 's' : ''} à ouvrir dans votre messagerie.
          </p>
        </div>
        <button onClick={onClose} className="btn-secondary text-xs py-1.5 px-3">Fermer</button>
      </div>

      <div className="space-y-3">
        {mails.map(mail => (
          <div key={mail.groupeId} className="rounded-xl p-4" style={{ background: 'white', border: '1px solid #e5e5ea' }}>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-sm" style={{ color: '#1d1d1f' }}>
                  {mail.groupe}{mail.promotion ? ` — ${mail.promotion}` : ''}
                </p>
                <p className="text-xs mt-1 break-all" style={{ color: '#6e6e73' }}>
                  <span className="font-medium">À :</span> {mail.destinataires.join(', ') || 'Aucun référent renseigné'}
                </p>
                <p className="text-xs mt-1" style={{ color: '#6e6e73' }}>
                  <span className="font-medium">Objet :</span> {mail.sujet}
                </p>
              </div>
              <a
                href={mail.mailto}
                className="btn-primary text-xs py-1.5 px-3 whitespace-nowrap"
                aria-disabled={mail.destinataires.length === 0}
                style={mail.destinataires.length === 0 ? { pointerEvents: 'none', opacity: 0.5 } : undefined}
              >
                ✉️ Ouvrir le mail
              </a>
            </div>
            <details className="mt-3">
              <summary className="text-xs cursor-pointer select-none" style={{ color: '#0071e3' }}>
                Prévisualiser le message
              </summary>
              <pre className="mt-2 whitespace-pre-wrap text-xs leading-5 rounded-lg p-3 overflow-x-auto"
                   style={{ background: '#f5f5f7', color: '#3a3a3c' }}>
                {mail.corps}
              </pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
