import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <p className="text-6xl font-bold text-cesi-200 mb-4">404</p>
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Page introuvable</h1>
        <p className="text-slate-500 text-sm mb-6">Cette page n&apos;existe pas ou vous n&apos;y avez pas accès.</p>
        <Link href="/dashboard" className="btn-primary">
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}
