ALTER TABLE public.b_users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

comment on column public.b_users.active is 'Indicates if the user account is active. Defaults to true.';
