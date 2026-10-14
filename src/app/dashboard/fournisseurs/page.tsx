// FICHIER : src/app/dashboard/fournisseurs/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Fournisseur } from '@/types';

export default function FournisseursPage() {
  const supabase = createClient();
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('');
  const [form, setForm] = useState({ nom: '', site_web: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile) setRole(profile.role);
    }
    const { data } = await supabase.from('fournisseurs').select('*').order('nom');
    setFournisseurs(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.nom.trim()) { setError('Le nom est requis.'); return; }
    setSaving(true);
    const { error: err } = await supabase.from('fournisseurs').insert({
      nom: form.nom.trim(),
      site_web: form.site_web.trim() || null,
      actif: true,
    });
    if (err) setError(err.message);
    else { setSuccess('Fournisseur ajouté.'); setForm({ nom: '', site_web: '' }); load(); }
    setSaving(false);
  };

  const toggleActif = async (id: number, actif: boolean) => {
    const { error } = await supabase.from('fournisseurs').update({ actif: !actif }).eq('id', id);
    if (!error) load();
    else alert('Erreur : ' + error.message);
  };

  const handleDelete = async (id: number, nom: string) => {
    if (!confirm(`Supprimer définitivement "${nom}" ?`)) return;
    const { error } = await supabase.from('fournisseurs').delete().eq('id', id);
    if (!error) load();
    else alert('Impossible de supprimer : ' + error.message);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#1d1d1f', letterSpacing: '-0.5px' }}>Fournisseurs</h1>
        <p className="text-sm mt-0.5" style={{ color: '#6e6e73' }}>Gérez la liste des fournisseurs disponibles.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #f2f2f7' }}>
            <h2 className="font-semibold text-sm" style={{ color: '#1d1d1f' }}>
              {fournisseurs.length} fournisseur{fournisseurs.length > 1 ? 's' : ''}
            </h2>
          </div>
          <table className="w-full">
            <thead style={{ background: '#fafafa', borderBottom: '1px solid #e5e5ea' }}>
              <tr>
                <th className="table-header">Nom</th>
                <th className="table-header">Site web</th>
                <th className="table-header">Statut</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} className="table-cell text-center py-8" style={{ color: '#aeaeb2' }}>Chargement…</td></tr>}
              {!loading && fournisseurs.length === 0 && <tr><td colSpan={4} className="table-cell text-center py-8" style={{ color: '#aeaeb2' }}>Aucun fournisseur.</td></tr>}
              {fournisseurs.map(f => (
                <tr key={f.id} className={!f.actif ? 'opacity-40' : ''}
                    style={{ borderTop: '1px solid #f2f2f7' }}>
                  <td className="table-cell font-medium text-sm" style={{ color: '#1d1d1f' }}>{f.nom}</td>
                  <td className="table-cell">
                    {f.site_web
                      ? <a href={f.site_web} target="_blank" rel="noopener noreferrer"
                           className="text-sm hover:underline" style={{ color: '#0071e3' }}>Voir ↗</a>
                      : <span style={{ color: '#aeaeb2' }}>—</span>}
                  </td>
                  <td className="table-cell">
                    <span className={`status-badge ${f.actif ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                      {f.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleActif(f.id, f.actif)}
                        className="text-xs font-medium hover:underline" style={{ color: '#0071e3' }}>
                        {f.actif ? 'Désactiver' : 'Activer'}
                      </button>
                      {/* Supprimer : super_admin uniquement */}
                      {role === 'super_admin' && (
                        <button onClick={() => handleDelete(f.id, f.nom)}
                          className="text-xs font-medium hover:underline" style={{ color: '#ff3b30' }}>
                          Supprimer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-sm mb-4" style={{ color: '#1d1d1f' }}>Ajouter un fournisseur</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="form-label">Nom *</label>
              <input type="text" value={form.nom}
                onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                className="form-input" placeholder="Ex : Digi-Key" />
            </div>
            <div>
              <label className="form-label">Site web</label>
              <input type="url" value={form.site_web}
                onChange={e => setForm(p => ({ ...p, site_web: e.target.value }))}
                className="form-input" placeholder="https://…" />
            </div>
            {error && <p className="form-error">{error}</p>}
            {success && <p className="text-xs text-emerald-600">{success}</p>}
            <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
              {saving ? 'Ajout…' : 'Ajouter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
