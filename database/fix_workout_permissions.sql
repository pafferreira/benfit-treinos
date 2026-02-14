-- BENFIT TREINOS
-- Regra de acesso:
-- 1) admin: CRUD em todos os planos
-- 2) personal: CRUD somente em planos públicos (is_public = true)
-- 3) demais perfis: leitura de planos públicos
--
-- Inclui políticas para:
-- - b_workouts
-- - b_workout_days
-- - b_workout_exercises

BEGIN;

ALTER TABLE public.b_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b_workout_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b_workout_exercises ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- b_workouts
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "b_workouts_select_public_or_owner" ON public.b_workouts;
DROP POLICY IF EXISTS "b_workouts_insert_owner_or_coach" ON public.b_workouts;
DROP POLICY IF EXISTS "b_workouts_update_owner_or_coach" ON public.b_workouts;
DROP POLICY IF EXISTS "b_workouts_delete_owner_or_coach" ON public.b_workouts;
DROP POLICY IF EXISTS "Workouts_Public" ON public.b_workouts;
DROP POLICY IF EXISTS "Workouts_Creator" ON public.b_workouts;
DROP POLICY IF EXISTS "Anyone can view public workouts" ON public.b_workouts;

CREATE POLICY "b_workouts_select_public_or_owner"
ON public.b_workouts
FOR SELECT
USING (
    is_public = true
    OR EXISTS (
        SELECT 1
        FROM public.b_users bu
        WHERE bu.id = auth.uid()
          AND bu.role = 'admin'
    )
);

CREATE POLICY "b_workouts_insert_owner_or_coach"
ON public.b_workouts
FOR INSERT
WITH CHECK (
    creator_id = auth.uid()
    AND (
        EXISTS (
            SELECT 1
            FROM public.b_users bu
            WHERE bu.id = auth.uid()
              AND bu.role = 'admin'
        )
        OR (
            is_public = true
            AND EXISTS (
                SELECT 1
                FROM public.b_users bu
                WHERE bu.id = auth.uid()
                  AND bu.role = 'personal'
            )
        )
    )
);

CREATE POLICY "b_workouts_update_owner_or_coach"
ON public.b_workouts
FOR UPDATE
USING (
    EXISTS (
        SELECT 1
        FROM public.b_users bu
        WHERE bu.id = auth.uid()
          AND bu.role = 'admin'
    )
    OR (
        is_public = true
        AND EXISTS (
            SELECT 1
            FROM public.b_users bu
            WHERE bu.id = auth.uid()
              AND bu.role = 'personal'
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.b_users bu
        WHERE bu.id = auth.uid()
          AND bu.role = 'admin'
    )
    OR (
        is_public = true
        AND EXISTS (
            SELECT 1
            FROM public.b_users bu
            WHERE bu.id = auth.uid()
              AND bu.role = 'personal'
        )
    )
);

CREATE POLICY "b_workouts_delete_owner_or_coach"
ON public.b_workouts
FOR DELETE
USING (
    EXISTS (
        SELECT 1
        FROM public.b_users bu
        WHERE bu.id = auth.uid()
          AND bu.role = 'admin'
    )
    OR (
        is_public = true
        AND EXISTS (
            SELECT 1
            FROM public.b_users bu
            WHERE bu.id = auth.uid()
              AND bu.role = 'personal'
        )
    )
);

-- ---------------------------------------------------------------------------
-- b_workout_days
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "b_workout_days_select_visible_workouts" ON public.b_workout_days;
DROP POLICY IF EXISTS "b_workout_days_insert_owner_or_coach" ON public.b_workout_days;
DROP POLICY IF EXISTS "b_workout_days_update_owner_or_coach" ON public.b_workout_days;
DROP POLICY IF EXISTS "b_workout_days_delete_owner_or_coach" ON public.b_workout_days;
DROP POLICY IF EXISTS "Anyone can view workout days" ON public.b_workout_days;

CREATE POLICY "b_workout_days_select_visible_workouts"
ON public.b_workout_days
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.b_workouts w
        WHERE w.id = b_workout_days.workout_id
          AND (
              w.is_public = true
              OR EXISTS (
                  SELECT 1
                  FROM public.b_users bu
                  WHERE bu.id = auth.uid()
                    AND bu.role = 'admin'
              )
          )
    )
);

CREATE POLICY "b_workout_days_insert_owner_or_coach"
ON public.b_workout_days
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.b_workouts w
        WHERE w.id = b_workout_days.workout_id
          AND (
              EXISTS (
                  SELECT 1
                  FROM public.b_users bu
                  WHERE bu.id = auth.uid()
                    AND bu.role = 'admin'
              )
              OR (
                  w.is_public = true
                  AND EXISTS (
                      SELECT 1
                      FROM public.b_users bu
                      WHERE bu.id = auth.uid()
                        AND bu.role = 'personal'
                  )
              )
          )
    )
);

CREATE POLICY "b_workout_days_update_owner_or_coach"
ON public.b_workout_days
FOR UPDATE
USING (
    EXISTS (
        SELECT 1
        FROM public.b_workouts w
        WHERE w.id = b_workout_days.workout_id
          AND (
              EXISTS (
                  SELECT 1
                  FROM public.b_users bu
                  WHERE bu.id = auth.uid()
                    AND bu.role = 'admin'
              )
              OR (
                  w.is_public = true
                  AND EXISTS (
                      SELECT 1
                      FROM public.b_users bu
                      WHERE bu.id = auth.uid()
                        AND bu.role = 'personal'
                  )
              )
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.b_workouts w
        WHERE w.id = b_workout_days.workout_id
          AND (
              EXISTS (
                  SELECT 1
                  FROM public.b_users bu
                  WHERE bu.id = auth.uid()
                    AND bu.role = 'admin'
              )
              OR (
                  w.is_public = true
                  AND EXISTS (
                      SELECT 1
                      FROM public.b_users bu
                      WHERE bu.id = auth.uid()
                        AND bu.role = 'personal'
                  )
              )
          )
    )
);

CREATE POLICY "b_workout_days_delete_owner_or_coach"
ON public.b_workout_days
FOR DELETE
USING (
    EXISTS (
        SELECT 1
        FROM public.b_workouts w
        WHERE w.id = b_workout_days.workout_id
          AND (
              EXISTS (
                  SELECT 1
                  FROM public.b_users bu
                  WHERE bu.id = auth.uid()
                    AND bu.role = 'admin'
              )
              OR (
                  w.is_public = true
                  AND EXISTS (
                      SELECT 1
                      FROM public.b_users bu
                      WHERE bu.id = auth.uid()
                        AND bu.role = 'personal'
                  )
              )
          )
    )
);

-- ---------------------------------------------------------------------------
-- b_workout_exercises
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "b_workout_exercises_select_visible_workouts" ON public.b_workout_exercises;
DROP POLICY IF EXISTS "b_workout_exercises_insert_owner_or_coach" ON public.b_workout_exercises;
DROP POLICY IF EXISTS "b_workout_exercises_update_owner_or_coach" ON public.b_workout_exercises;
DROP POLICY IF EXISTS "b_workout_exercises_delete_owner_or_coach" ON public.b_workout_exercises;
DROP POLICY IF EXISTS "Anyone can view workout exercises" ON public.b_workout_exercises;

CREATE POLICY "b_workout_exercises_select_visible_workouts"
ON public.b_workout_exercises
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.b_workout_days wd
        JOIN public.b_workouts w ON w.id = wd.workout_id
        WHERE wd.id = b_workout_exercises.workout_day_id
          AND (
              w.is_public = true
              OR EXISTS (
                  SELECT 1
                  FROM public.b_users bu
                  WHERE bu.id = auth.uid()
                    AND bu.role = 'admin'
              )
          )
    )
);

CREATE POLICY "b_workout_exercises_insert_owner_or_coach"
ON public.b_workout_exercises
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.b_workout_days wd
        JOIN public.b_workouts w ON w.id = wd.workout_id
        WHERE wd.id = b_workout_exercises.workout_day_id
          AND (
              EXISTS (
                  SELECT 1
                  FROM public.b_users bu
                  WHERE bu.id = auth.uid()
                    AND bu.role = 'admin'
              )
              OR (
                  w.is_public = true
                  AND EXISTS (
                      SELECT 1
                      FROM public.b_users bu
                      WHERE bu.id = auth.uid()
                        AND bu.role = 'personal'
                  )
              )
          )
    )
);

CREATE POLICY "b_workout_exercises_update_owner_or_coach"
ON public.b_workout_exercises
FOR UPDATE
USING (
    EXISTS (
        SELECT 1
        FROM public.b_workout_days wd
        JOIN public.b_workouts w ON w.id = wd.workout_id
        WHERE wd.id = b_workout_exercises.workout_day_id
          AND (
              EXISTS (
                  SELECT 1
                  FROM public.b_users bu
                  WHERE bu.id = auth.uid()
                    AND bu.role = 'admin'
              )
              OR (
                  w.is_public = true
                  AND EXISTS (
                      SELECT 1
                      FROM public.b_users bu
                      WHERE bu.id = auth.uid()
                        AND bu.role = 'personal'
                  )
              )
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.b_workout_days wd
        JOIN public.b_workouts w ON w.id = wd.workout_id
        WHERE wd.id = b_workout_exercises.workout_day_id
          AND (
              EXISTS (
                  SELECT 1
                  FROM public.b_users bu
                  WHERE bu.id = auth.uid()
                    AND bu.role = 'admin'
              )
              OR (
                  w.is_public = true
                  AND EXISTS (
                      SELECT 1
                      FROM public.b_users bu
                      WHERE bu.id = auth.uid()
                        AND bu.role = 'personal'
                  )
              )
          )
    )
);

CREATE POLICY "b_workout_exercises_delete_owner_or_coach"
ON public.b_workout_exercises
FOR DELETE
USING (
    EXISTS (
        SELECT 1
        FROM public.b_workout_days wd
        JOIN public.b_workouts w ON w.id = wd.workout_id
        WHERE wd.id = b_workout_exercises.workout_day_id
          AND (
              EXISTS (
                  SELECT 1
                  FROM public.b_users bu
                  WHERE bu.id = auth.uid()
                    AND bu.role = 'admin'
              )
              OR (
                  w.is_public = true
                  AND EXISTS (
                      SELECT 1
                      FROM public.b_users bu
                      WHERE bu.id = auth.uid()
                        AND bu.role = 'personal'
                  )
              )
          )
    )
);

COMMIT;
