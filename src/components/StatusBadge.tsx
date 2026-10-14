// FICHIER : src/components/StatusBadge.tsx
import { STATUS_LABELS, STATUS_COLORS, STATUS_DOT } from '@/types';
import type { CommandeStatus } from '@/types';

export default function StatusBadge({ statut }: { statut: CommandeStatus }) {
  return (
    <span className={`status-badge ${STATUS_COLORS[statut]}`}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0 inline-block"
            style={{ backgroundColor: STATUS_DOT[statut] }} />
      {STATUS_LABELS[statut]}
    </span>
  );
}
