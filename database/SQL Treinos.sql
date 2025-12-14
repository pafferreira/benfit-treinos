-- Schema de tabelas para Treinos
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.b_ai_chat_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  role character varying NOT NULL CHECK (role::text = ANY (ARRAY['user'::character varying::text, 'assistant'::character varying::text, 'system'::character varying::text])),
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT b_ai_chat_history_pkey PRIMARY KEY (id),
  CONSTRAINT b_ai_chat_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.b_users(id)
);
CREATE TABLE public.b_exercises (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  exercise_key character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  muscle_group character varying NOT NULL,
  equipment character varying NOT NULL,
  video_url character varying,
  instructions ARRAY,
  tags ARRAY,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT b_exercises_pkey PRIMARY KEY (id)
);
CREATE TABLE public.b_session_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  session_id uuid NOT NULL,
  exercise_id uuid NOT NULL,
  set_number integer NOT NULL,
  weight_kg numeric,
  reps_completed integer NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT b_session_logs_pkey PRIMARY KEY (id),
  CONSTRAINT b_session_logs_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.b_exercises(id),
  CONSTRAINT b_session_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.b_workout_sessions(id)
);
CREATE TABLE public.b_user_assignments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  workout_id uuid NOT NULL,
  assigned_day character varying,
  active boolean DEFAULT true,
  assigned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT b_user_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT b_user_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.b_users(id),
  CONSTRAINT b_user_assignments_workout_id_fkey FOREIGN KEY (workout_id) REFERENCES public.b_workouts(id)
);
CREATE TABLE public.b_user_progress (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  weight_kg numeric,
  body_fat_percentage numeric,
  muscle_mass_kg numeric,
  notes text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT b_user_progress_pkey PRIMARY KEY (id),
  CONSTRAINT b_user_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.b_users(id)
);
CREATE TABLE public.b_users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  password_hash character varying NOT NULL,
  avatar_url character varying,
  plan_type character varying DEFAULT 'FREE'::character varying CHECK (plan_type::text = ANY (ARRAY['FREE'::character varying::text, 'PRO'::character varying::text, 'ELITE'::character varying::text])),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT b_users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.b_workout_days (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  workout_id uuid NOT NULL,
  day_number integer NOT NULL,
  day_name character varying NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT b_workout_days_pkey PRIMARY KEY (id),
  CONSTRAINT b_workout_days_workout_id_fkey FOREIGN KEY (workout_id) REFERENCES public.b_workouts(id)
);
CREATE TABLE public.b_workout_exercises (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  workout_day_id uuid NOT NULL,
  exercise_id uuid NOT NULL,
  order_index integer NOT NULL,
  sets integer NOT NULL,
  reps character varying NOT NULL,
  rest_seconds integer,
  notes text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT b_workout_exercises_pkey PRIMARY KEY (id),
  CONSTRAINT b_workout_exercises_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.b_exercises(id),
  CONSTRAINT b_workout_exercises_workout_day_id_fkey FOREIGN KEY (workout_day_id) REFERENCES public.b_workout_days(id)
);
CREATE TABLE public.b_workout_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  workout_id uuid NOT NULL,
  workout_day_id uuid,
  started_at timestamp with time zone NOT NULL,
  ended_at timestamp with time zone,
  calories_burned integer,
  feeling integer CHECK (feeling >= 1 AND feeling <= 10),
  notes text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT b_workout_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT b_workout_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.b_users(id),
  CONSTRAINT b_workout_sessions_workout_day_id_fkey FOREIGN KEY (workout_day_id) REFERENCES public.b_workout_days(id),
  CONSTRAINT b_workout_sessions_workout_id_fkey FOREIGN KEY (workout_id) REFERENCES public.b_workouts(id)
);
CREATE TABLE public.b_workouts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  workout_key character varying NOT NULL UNIQUE,
  title character varying NOT NULL,
  description text,
  difficulty character varying CHECK (difficulty::text = ANY (ARRAY['Iniciante'::character varying::text, 'Intermediário'::character varying::text, 'Avançado'::character varying::text, 'Iniciante / Intermediário'::character varying::text])),
  estimated_duration integer,
  days_per_week integer,
  cover_image character varying,
  is_public boolean DEFAULT true,
  creator_id uuid,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT b_workouts_pkey PRIMARY KEY (id),
  CONSTRAINT b_workouts_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.b_users(id)
);
CREATE TABLE public.exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  primary_muscles ARRAY NOT NULL,
  machine_img text,
  free_alt_name text,
  free_alt_img text,
  tips text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT exercises_pkey PRIMARY KEY (id),
  CONSTRAINT exercises_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.monthly_progress (
  user_id uuid NOT NULL,
  month date NOT NULL,
  target integer NOT NULL DEFAULT 30,
  done integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT monthly_progress_pkey PRIMARY KEY (user_id, month),
  CONSTRAINT monthly_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  goal USER-DEFINED NOT NULL,
  groups ARRAY NOT NULL,
  frequency integer NOT NULL CHECK (frequency >= 1 AND frequency <= 7),
  month date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT plans_pkey PRIMARY KEY (id),
  CONSTRAINT plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  name text NOT NULL,
  weight_kg numeric,
  height_cm numeric,
  avatar_id text,
  points integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.session_done (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid NOT NULL,
  ymd date NOT NULL,
  items_done integer NOT NULL DEFAULT 0,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT session_done_pkey PRIMARY KEY (id),
  CONSTRAINT session_done_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id),
  CONSTRAINT session_done_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.session_exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  exercise_id uuid NOT NULL,
  sets integer NOT NULL,
  reps text NOT NULL,
  rest text,
  order_index integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT session_exercises_pkey PRIMARY KEY (id),
  CONSTRAINT session_exercises_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.exercises(id),
  CONSTRAINT session_exercises_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id)
);
CREATE TABLE public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL,
  name text NOT NULL,
  order_index integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id)
);