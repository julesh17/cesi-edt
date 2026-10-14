// FICHIER : src/app/dashboard/budget/BudgetCharts.tsx
'use client';

import { useEffect, useRef } from 'react';

interface StatPromo {
  id: number;
  nom: string;
  budget_total: number;
  budget_consomme: number;
  budget_restant: number;
  pct: number;
  nb_commandes: number;
  par_fournisseur: Record<string, number>;
}

interface Props {
  statsParPromo: StatPromo[];
  parFournisseurGlobal: Record<string, number>;
  totalGlobal: number;
  consommeGlobal: number;
}

const COLORS = ['#0071e3', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#5ac8fa', '#ffcc00', '#ff6b6b', '#a8e063'];

function PieChart({ data, size = 180 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) return;

    const cx = size / 2, cy = size / 2, r = size / 2 - 10;
    let startAngle = -Math.PI / 2;

    ctx.clearRect(0, 0, size, size);

    data.forEach(d => {
      const slice = (d.value / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fillStyle = d.color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      startAngle += slice;
    });

    // Cercle central (donut)
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }, [data, size]);

  return <canvas ref={canvasRef} width={size} height={size} />;
}

function BarChart({ data }: { data: { label: string; value: number; max: number; color: string }[] }) {
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs mb-1" style={{ color: '#6e6e73' }}>
            <span className="truncate max-w-40">{d.label}</span>
            <span className="font-medium ml-2 flex-shrink-0" style={{ color: '#1d1d1f' }}>{d.value.toFixed(2)} €</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: '#f2f2f7' }}>
            <div className="h-2 rounded-full transition-all duration-500"
                 style={{ width: `${d.max > 0 ? Math.min(100, (d.value / d.max) * 100) : 0}%`, background: d.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BudgetCharts({ statsParPromo, parFournisseurGlobal, totalGlobal, consommeGlobal }: Props) {
  // Données camembert global
  const pieGlobal = [
    { label: 'Consommé', value: consommeGlobal, color: '#0071e3' },
    { label: 'Restant', value: Math.max(0, totalGlobal - consommeGlobal), color: '#e5e5ea' },
  ];

  // Données camembert par fournisseur
  const fournisseurEntries = Object.entries(parFournisseurGlobal).sort((a, b) => b[1] - a[1]);
  const pieFournisseur = fournisseurEntries.map((([label, value], i) => ({
    label, value, color: COLORS[i % COLORS.length]
  })));

  // Données camembert par promotion
  const piePromo = statsParPromo.map((p, i) => ({
    label: p.nom,
    value: p.budget_consomme,
    color: COLORS[i % COLORS.length],
  }));

  // Bar chart par promotion
  const maxBudget = Math.max(...statsParPromo.map(p => p.budget_total));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

      {/* Camembert global */}
      <div className="card p-5">
        <h3 className="font-semibold text-sm mb-4" style={{ color: '#1d1d1f' }}>Budget global</h3>
        <div className="flex items-center gap-5">
          <div className="flex-shrink-0">
            <PieChart data={pieGlobal} size={140} />
          </div>
          <div className="space-y-2 flex-1">
            {pieGlobal.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                <span style={{ color: '#6e6e73' }}>{d.label}</span>
                <span className="ml-auto font-medium" style={{ color: '#1d1d1f' }}>{d.value.toFixed(0)} €</span>
              </div>
            ))}
            <div className="pt-2 mt-2" style={{ borderTop: '1px solid #f2f2f7' }}>
              <p className="text-xs font-semibold" style={{ color: '#1d1d1f' }}>
                {totalGlobal > 0 ? Math.round((consommeGlobal / totalGlobal) * 100) : 0}% utilisé
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Camembert par fournisseur */}
      {pieFournisseur.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-sm mb-4" style={{ color: '#1d1d1f' }}>Répartition par fournisseur</h3>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <PieChart data={pieFournisseur} size={140} />
            </div>
            <div className="space-y-1.5 flex-1 overflow-hidden">
              {pieFournisseur.slice(0, 6).map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                  <span className="truncate" style={{ color: '#6e6e73' }}>{d.label}</span>
                  <span className="ml-auto font-medium flex-shrink-0" style={{ color: '#1d1d1f' }}>
                    {d.value.toFixed(0)} €
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Camembert consommation par promotion */}
      {piePromo.length > 1 && (
        <div className="card p-5">
          <h3 className="font-semibold text-sm mb-4" style={{ color: '#1d1d1f' }}>Consommation par promotion</h3>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <PieChart data={piePromo} size={140} />
            </div>
            <div className="space-y-1.5 flex-1 overflow-hidden">
              {piePromo.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                  <span className="truncate" style={{ color: '#6e6e73' }}>{d.label}</span>
                  <span className="ml-auto font-medium flex-shrink-0" style={{ color: '#1d1d1f' }}>
                    {d.value.toFixed(0)} €
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bar chart budgets par promotion */}
      <div className="card p-5 md:col-span-2 xl:col-span-2">
        <h3 className="font-semibold text-sm mb-4" style={{ color: '#1d1d1f' }}>Budget alloué vs consommé par promotion</h3>
        <div className="space-y-4">
          {statsParPromo.map((p, i) => (
            <div key={p.id}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium" style={{ color: '#1d1d1f' }}>{p.nom}</span>
                <span style={{ color: '#6e6e73' }}>{p.budget_consomme.toFixed(0)} € / {p.budget_total.toFixed(0)} €</span>
              </div>
              <div className="relative h-3 rounded-full" style={{ background: '#f2f2f7' }}>
                {/* Budget total */}
                <div className="absolute inset-0 rounded-full" style={{ background: '#e5e5ea' }} />
                {/* Consommé */}
                <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                     style={{
                       width: `${p.pct}%`,
                       background: COLORS[i % COLORS.length],
                       opacity: 0.85
                     }} />
              </div>
              <div className="flex justify-between text-xs mt-0.5">
                <span style={{ color: '#aeaeb2' }}>{p.nb_commandes} commande{p.nb_commandes > 1 ? 's' : ''}</span>
                <span style={{ color: p.budget_restant < 0 ? '#ff3b30' : '#34c759' }}>
                  {p.budget_restant.toFixed(0)} € restant{p.budget_restant < 0 ? ' (dépassé)' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bar chart fournisseurs */}
      {fournisseurEntries.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-sm mb-4" style={{ color: '#1d1d1f' }}>Dépenses par fournisseur</h3>
          <BarChart
            data={fournisseurEntries.map(([label, value], i) => ({
              label,
              value,
              max: fournisseurEntries[0][1],
              color: COLORS[i % COLORS.length],
            }))}
          />
        </div>
      )}
    </div>
  );
}
