-- Toujours conserver prix_estime comme montant total TTC.
create or replace function public.calculer_prix_total_commande()
returns trigger language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.quantite is null or new.quantite < 1
    or new.prix_unitaire is null or new.prix_unitaire <= 0 then
    raise exception 'Quantite et prix unitaire invalides';
  end if;
  new.prix_estime := round(new.prix_unitaire * new.quantite, 2);
  return new;
end;
$$;

drop trigger if exists calculer_prix_total_commande_trigger on public.commandes;
create trigger calculer_prix_total_commande_trigger
before insert or update of quantite, prix_unitaire, prix_estime
on public.commandes for each row
execute function public.calculer_prix_total_commande();

-- Une annulation est definitive. Un compte groupe ne peut modifier aucun
-- autre champ de sa commande par le biais d'une requete UPDATE directe.
create or replace function public.proteger_annulation_commande()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
begin
  if old.statut::text = 'annulee' and new.statut::text <> 'annulee' then
    raise exception 'Une commande annulee ne peut pas etre reactivee';
  end if;

  if auth.uid() is not null then
    select p.role::text into v_role
    from public.profiles p where p.id = auth.uid();

    if v_role = 'etudiant_groupe' then
      if old.statut::text <> 'en_attente'
        or new.statut::text <> 'annulee'
        or not exists (select 1 from public.groupes g
                       where g.id = old.groupe_id and g.user_id = auth.uid())
        or (to_jsonb(new) - 'statut' - 'date_mise_a_jour')
           is distinct from (to_jsonb(old) - 'statut' - 'date_mise_a_jour') then
        raise exception 'Un groupe ne peut annuler que sa propre commande en attente';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists proteger_annulation_commande_trigger on public.commandes;
create trigger proteger_annulation_commande_trigger
before update on public.commandes for each row
execute function public.proteger_annulation_commande();

-- Conserver la trace de toute annulation, meme si un ancien client utilise
-- UPDATE directement plutot que la RPC.
create or replace function public.historique_annulation_commande()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.historique_commandes (commande_id, user_id, action, details)
  values (new.id, auth.uid(), 'Commande annulée par le groupe', null);
  return new;
end;
$$;

drop trigger if exists historique_annulation_commande_trigger on public.commandes;
create trigger historique_annulation_commande_trigger
after update of statut on public.commandes for each row
when (old.statut is distinct from new.statut and new.statut::text = 'annulee')
execute function public.historique_annulation_commande();

-- L'UPDATE conditionnel rend l'annulation atomique : si une validation est
-- intervenue avant, aucune ligne n'est modifiee.
create or replace function public.annuler_commande_groupe(p_commande_id integer)
returns boolean language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_id integer;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  update public.commandes c
  set statut = 'annulee', date_mise_a_jour = now()
  from public.groupes g
  join public.profiles p on p.id = auth.uid() and p.role::text = 'etudiant_groupe'
  where c.id = p_commande_id
    and c.groupe_id = g.id
    and g.user_id = auth.uid()
    and c.statut = 'en_attente'
  returning c.id into v_id;

  if v_id is null then
    raise exception 'Commande introuvable ou deja validee';
  end if;

  return true;
end;
$$;

revoke all on function public.annuler_commande_groupe(integer) from public;
revoke all on function public.annuler_commande_groupe(integer) from anon;
grant execute on function public.annuler_commande_groupe(integer) to authenticated;

-- Rembourse immediatement les demandes annulees dans les budgets.
drop view if exists public.vue_budget_groupes;
create view public.vue_budget_groupes as
select
  g.id as groupe_id,
  g.nom as groupe_nom,
  p.id as promotion_id,
  p.nom as promotion_nom,
  p.budget_par_groupe::numeric as budget_standard,
  coalesce(g.budget_ajustement, 0)::numeric as budget_ajustement,
  (p.budget_par_groupe + coalesce(g.budget_ajustement, 0))::numeric as budget_total,
  coalesce(sum(case
    when c.statut::text not in ('refusee', 'non_commandable', 'annulee')
    then coalesce(c.prix_reel, c.prix_estime, 0) else 0 end), 0)::numeric as budget_consomme,
  (p.budget_par_groupe + coalesce(g.budget_ajustement, 0)
     - coalesce(sum(case
       when c.statut::text not in ('refusee', 'non_commandable', 'annulee')
       then coalesce(c.prix_reel, c.prix_estime, 0) else 0 end), 0))::numeric as budget_restant
from public.groupes g
join public.promotions p on p.id = g.promotion_id
left join public.commandes c on c.groupe_id = g.id
group by g.id, g.nom, g.budget_ajustement, p.id, p.nom, p.budget_par_groupe;

grant select on public.vue_budget_groupes to authenticated;
