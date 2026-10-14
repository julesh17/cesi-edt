// FICHIER : src/app/api/groupes/create/route.ts
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
    if (!profile || !['super_admin', 'responsable_pedagogique'].includes(profile.role)) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    const { promotion_id, nom_groupe, pseudo, password, nom_compte, responsable_id } = await request.json();

    if (!promotion_id || !nom_groupe || !pseudo || !password) {
      return NextResponse.json({ error: 'Champs requis manquants.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Le mot de passe doit faire au moins 6 caractères.' }, { status: 400 });
    }

    const email = pseudoToEmail(pseudo);
    const adminClient = createAdminClient();

    const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
      email, password, email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ error: 'Ce pseudo est peut-être déjà pris : ' + authError.message }, { status: 400 });
    }

    const newUserId = newUser.user.id;

    const { error: profileError } = await adminClient.from('profiles').insert({
      id: newUserId, role: 'etudiant_groupe', nom: nom_compte || nom_groupe,
    });

    if (profileError) {
      await adminClient.auth.admin.deleteUser(newUserId);
      return NextResponse.json({ error: 'Erreur profil : ' + profileError.message }, { status: 400 });
    }

    // responsable_id : si responsable_pedagogique crée le groupe, on le rattache automatiquement
    const finalResponsableId = responsable_id ||
      (profile.role === 'responsable_pedagogique' ? user.id : null);

    const { error: groupeError } = await adminClient.from('groupes').insert({
      promotion_id,
      nom: nom_groupe,
      user_id: newUserId,
      responsable_id: finalResponsableId,
    });

    if (groupeError) {
      await adminClient.from('profiles').delete().eq('id', newUserId);
      await adminClient.auth.admin.deleteUser(newUserId);
      return NextResponse.json({ error: 'Erreur groupe : ' + groupeError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
