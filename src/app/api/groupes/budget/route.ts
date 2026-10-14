import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['super_admin', 'responsable_pedagogique'].includes(profile.role)) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    const body = await request.json();
    const groupeId = Number(body.groupe_id);
    const budgetTotal = Number(body.budget_total);

    if (!Number.isInteger(groupeId) || groupeId <= 0 || !Number.isFinite(budgetTotal) || budgetTotal < 0) {
      return NextResponse.json({ error: 'Budget ou groupe invalide.' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: groupe, error: groupeError } = await admin
      .from('groupes')
      .select('id, promotion_id, promotions(id, budget_par_groupe, responsable_id)')
      .eq('id', groupeId)
      .single();

    if (groupeError || !groupe) {
      return NextResponse.json({ error: 'Groupe introuvable.' }, { status: 404 });
    }

    const promotion = groupe.promotions as unknown as {
      id: number;
      budget_par_groupe: number;
      responsable_id: string | null;
    } | null;

    if (!promotion) {
      return NextResponse.json({ error: 'Promotion introuvable.' }, { status: 404 });
    }

    if (profile.role === 'responsable_pedagogique' && promotion.responsable_id !== user.id) {
      return NextResponse.json({ error: 'Vous ne pouvez modifier que les budgets de vos promotions.' }, { status: 403 });
    }

    const budgetStandard = Number(promotion.budget_par_groupe);
    const ajustement = Math.round((budgetTotal - budgetStandard) * 100) / 100;

    const { error: updateError } = await admin
      .from('groupes')
      .update({ budget_ajustement: ajustement })
      .eq('id', groupeId);

    if (updateError) {
      return NextResponse.json({
        error: updateError.message.includes('budget_ajustement')
          ? 'La migration Supabase du budget exceptionnel doit être appliquée.'
          : updateError.message,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      budget_standard: budgetStandard,
      budget_ajustement: ajustement,
      budget_total: budgetStandard + ajustement,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
