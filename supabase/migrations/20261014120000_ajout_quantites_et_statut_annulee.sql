-- Les anciennes commandes correspondent a une unite au prix total deja enregistre.
alter table public.commandes
  add column if not exists quantite integer not null default 1,
  add column if not exists prix_unitaire numeric(12,2);

update public.commandes
set prix_unitaire = prix_estime
where prix_unitaire is null;

alter table public.commandes
  alter column prix_unitaire set not null;

alter table public.commandes
  add constraint commandes_quantite_positive check (quantite >= 1),
  add constraint commandes_prix_unitaire_positif check (prix_unitaire > 0);

-- Accepte un enum PostgreSQL, ou une colonne text/varchar avec une contrainte
-- de liste de statuts. Ne modifie pas les autres types de contraintes.
do $$
declare
  v_type oid;
  v_kind char;
  v_base text;
  v_constraint record;
begin
  select a.atttypid, t.typtype, t.typname
    into v_type, v_kind, v_base
  from pg_attribute a
  join pg_type t on t.oid = a.atttypid
  where a.attrelid = 'public.commandes'::regclass
    and a.attname = 'statut' and not a.attisdropped;

  if v_kind = 'e' then
    execute format('alter type %s add value if not exists %L', v_type::regtype, 'annulee');
  elsif v_base in ('text', 'varchar') then
    for v_constraint in
      select con.conname
      from pg_constraint con
      where con.conrelid = 'public.commandes'::regclass
        and con.contype = 'c'
        and pg_get_constraintdef(con.oid) ilike '%statut%'
    loop
      execute format('alter table public.commandes drop constraint %I', v_constraint.conname);
    end loop;
    alter table public.commandes add constraint commandes_statut_autorise
      check (statut in ('en_attente', 'validee', 'refusee', 'annulee',
                        'commandee', 'non_commandable', 'colis_arrive', 'receptionnee'));
  else
    raise exception 'Type de statut non gere : %', v_base;
  end if;
end;
$$;
