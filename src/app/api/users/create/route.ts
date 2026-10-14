// FICHIER : src/app/api/users/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { pseudoToEmail } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Réservé au super admin.' }, { status: 403 });
    }

    const { pseudo, password, nom, role } = await request.json();

    if (!pseudo || !password || !nom || !role) {
      return NextResponse.json({ error: 'Tous les champs sont requis.' }, { status: 400 });
    }
    if (!['responsable_pedagogique', 'assistante'].includes(role)) {
      return NextResponse.json({ error: 'Rôle invalide.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Mot de passe trop court (6 caractères min).' }, { status: 400 });
    }

    const email = pseudoToEmail(pseudo);
    const adminClient = createAdminClient();

    const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ error: 'Ce pseudo est déjà pris. Erreur : ' + authError.message }, { status: 400 });
    }

    const { error: profileError } = await adminClient.from('profiles').insert({
      id: newUser.user.id,
      role,
      nom,
    });

    if (profileError) {
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json({ error: 'Erreur profil : ' + profileError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
