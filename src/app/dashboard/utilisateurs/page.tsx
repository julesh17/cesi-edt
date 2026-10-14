// FICHIER : src/app/dashboard/utilisateurs/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CreerUtilisateurForm from './CreerUtilisateurForm';

const ROLE_LABELS: Record<string, string> = {
  responsable_pedagogique: 'Responsable pédagogique',
  assistante: 'Assistante',
};

export default async function UtilisateursPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile || profile.role !== 'super_admin') redirect('/dashboard');

  const { data: users, error } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['responsable_pedagogique', 'assistante'])
    .order('nom');

  if (error) console.error('Erreur chargement users:', error.message);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#1d1d1f', letterSpacing: '-0.5px' }}>
          Utilisateurs
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#6e6e73' }}>
          Créez et gérez les comptes responsables et assistantes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #f2f2f7' }}>
            <h2 className="font-semibold text-sm" style={{ color: '#1d1d1f' }}>
              {users?.length || 0} compte(s)
            </h2>
          </div>
          <table className="w-full">
            <thead style={{ background: '#fafafa', borderBottom: '1px solid #e5e5ea' }}>
              <tr>
                <th className="table-header">Nom</th>
                <th className="table-header">Rôle</th>
                <th className="table-header">Pseudo</th>
              </tr>
            </thead>
            <tbody>
              {(!users || users.length === 0) && (
                <tr>
                  <td colSpan={3} className="table-cell text-center py-10" style={{ color: '#aeaeb2' }}>
                    Aucun utilisateur. Créez-en un ci-contre.
                  </td>
                </tr>
              )}
              {users?.map(u => (
                <tr key={u.id} style={{ borderTop: '1px solid #f2f2f7' }}>
                  <td className="table-cell font-medium text-sm" style={{ color: '#1d1d1f' }}>{u.nom}</td>
                  <td className="table-cell">
                    <span className={`status-badge ${
                      u.role === 'responsable_pedagogique'
                        ? 'bg-blue-50 text-blue-700 border-blue-100'
                        : 'bg-purple-50 text-purple-700 border-purple-100'
                    }`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="table-cell text-xs" style={{ color: '#6e6e73' }}>
                    Voir dans Supabase Auth
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <CreerUtilisateurForm />
      </div>
    </div>
  );
}
