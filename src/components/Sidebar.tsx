// FICHIER : src/components/Sidebar.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import type { Profile } from '@/types';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  responsable_pedagogique: 'Responsable Péd.',
  assistante: 'Assistante',
  etudiant_groupe: 'Groupe Étudiant',
};

const navItems = [
  {
    href: '/dashboard', label: 'Tableau de bord',
    roles: ['super_admin','responsable_pedagogique','assistante','etudiant_groupe'],
    icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
  },
  {
    href: '/dashboard/commandes', label: 'Commandes',
    roles: ['super_admin','responsable_pedagogique','assistante','etudiant_groupe'],
    icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
  },
  {
    href: '/dashboard/promotions', label: 'Promotions',
    roles: ['super_admin','responsable_pedagogique'],
    icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
  },
  {
    href: '/dashboard/groupes', label: 'Groupes',
    roles: ['super_admin','responsable_pedagogique','assistante'],
    icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  },
  {
    href: '/dashboard/fournisseurs', label: 'Fournisseurs',
    roles: ['super_admin','responsable_pedagogique'],
    icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
  },
  {
    href: '/dashboard/utilisateurs', label: 'Utilisateurs',
    roles: ['super_admin'],
    icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
  },
  {
    href: '/dashboard/budget', label: 'Budget',
    roles: ['super_admin','responsable_pedagogique'],
    icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
  },
  {
    href: '/dashboard/export', label: 'Export Excel',
    roles: ['super_admin','responsable_pedagogique'],
    icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
  },
];

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();

  const handleLogout = async () => {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col h-screen"
           style={{ background: '#fff', borderRight: '1px solid #e5e5ea' }}>
      <div className="px-5 py-5" style={{ borderBottom: '1px solid #f2f2f7' }}>
        <div className="flex items-center gap-2.5">
          <Image src="https://raw.githubusercontent.com/julesh17/cesi-edt/refs/heads/main/static/cesi.png"
            alt="CESI" width={52} height={20} className="object-contain" unoptimized />
          <span className="text-sm font-semibold" style={{ color: '#1d1d1f', letterSpacing: '-0.2px' }}>
            Commandes
          </span>
        </div>
      </div>

      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        {navItems.filter(i => i.roles.includes(profile.role)).map(item => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-100"
              style={isActive
                ? { backgroundColor: '#0071e3', color: '#fff' }
                : { color: '#3a3a3c' }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f5f5f7'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = ''; }}>
              <span style={isActive ? { color: '#fff' } : { color: '#aeaeb2' }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-2.5 py-3" style={{ borderTop: '1px solid #f2f2f7' }}>
        <div className="px-3 py-2 mb-1">
          <p className="text-sm font-medium truncate" style={{ color: '#1d1d1f' }}>{profile.nom || 'Utilisateur'}</p>
          <p className="text-xs" style={{ color: '#aeaeb2' }}>{ROLE_LABELS[profile.role] || profile.role}</p>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors"
          style={{ color: '#aeaeb2' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ff3b30'; e.currentTarget.style.background = '#fff1f0'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#aeaeb2'; e.currentTarget.style.background = ''; }}>
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
