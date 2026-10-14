-- Budget exceptionnel par groupe
-- Le budget de base reste défini sur promotions.budget_par_groupe.
-- budget_ajustement contient uniquement l'écart exceptionnel propre au groupe.

alter table public.groupes
  add column if not exists budget_ajustement numeric(12,2) not null default 0;

comment on column public.groupes.budget_ajustement is
  'Ajustement exceptionnel (+/-) appliqué au budget standard de la promotion pour ce groupe.';

-- Recréation de la vue budgétaire pour intégrer l'ajustement par groupe.
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
  coalesce(
    sum(
      case
        when c.statut not in ('refusee', 'non_commandable')
          then coalesce(c.prix_reel, c.prix_estime, 0)
        else 0
      end
    ),
    0
  )::numeric as budget_consomme,
  (
    p.budget_par_groupe
    + coalesce(g.budget_ajustement, 0)
    - coalesce(
        sum(
          case
            when c.statut not in ('refusee', 'non_commandable')
              then coalesce(c.prix_reel, c.prix_estime, 0)
            else 0
          end
        ),
        0
      )
  )::numeric as budget_restant
from public.groupes g
join public.promotions p on p.id = g.promotion_id
left join public.commandes c on c.groupe_id = g.id
group by
  g.id,
  g.nom,
  g.budget_ajustement,
  p.id,
  p.nom,
  p.budget_par_groupe;

grant select on public.vue_budget_groupes to authenticated;
