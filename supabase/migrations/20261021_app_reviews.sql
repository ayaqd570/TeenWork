-- App feedback is private unless the author explicitly chooses to share it.
create table if not exists public.app_reviews (
  user_id uuid primary key references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 1 and 2000),
  public_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.app_reviews enable row level security;
revoke all on public.app_reviews from public, anon, authenticated;

create or replace function public.tw_submit_app_review(p_rating integer, p_body text, p_public boolean default false)
returns boolean language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
 if uid is null then raise exception 'Sign in to leave a review' using errcode='42501'; end if;
 if p_rating is null or p_rating not between 1 and 5 or p_body is null or char_length(trim(p_body)) not between 1 and 2000 then
  raise exception 'A rating and a comment of 1–2000 characters are required' using errcode='22023';
 end if;
 insert into public.app_reviews(user_id,rating,body,public_consent)
 values(uid,p_rating,trim(p_body),coalesce(p_public,false))
 on conflict(user_id) do update set rating=excluded.rating,body=excluded.body,public_consent=excluded.public_consent,updated_at=now();
 return true;
end $$;
revoke all on function public.tw_submit_app_review(integer,text,boolean) from public,anon,authenticated;
grant execute on function public.tw_submit_app_review(integer,text,boolean) to authenticated;

create or replace function public.tw_public_app_reviews()
returns table(rating integer,body text,created_at timestamptz)
language sql stable security definer set search_path = '' as $$
 select r.rating,r.body,r.created_at from public.app_reviews r
 where r.public_consent order by r.created_at desc limit 30;
$$;
revoke all on function public.tw_public_app_reviews() from public,anon,authenticated;
grant execute on function public.tw_public_app_reviews() to anon,authenticated;
