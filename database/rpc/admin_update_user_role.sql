-- RPC: admin_update_user_role
-- Allows an authenticated admin to change another user's role in b_users
-- This function checks the caller's role and then updates the target user's role.
-- The function is SECURITY DEFINER so it can perform the update even when RLS would block direct client updates.
-- AFTER deploying, grant EXECUTE on the function to the "authenticated" role.

CREATE OR REPLACE FUNCTION public.admin_update_user_role(target_user_id uuid, new_role text)
RETURNS public.b_users AS $$
DECLARE
  caller_role text;
  updated_row public.b_users%ROWTYPE;
BEGIN
  -- Determine caller's role from the b_users table using the authenticated user's id
  SELECT role INTO caller_role FROM public.b_users WHERE id = auth.uid();

  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'Chamada inválida: perfil do chamador não encontrado.';
  END IF;

  IF caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Permissão negada: apenas administradores podem alterar papéis.';
  END IF;

  UPDATE public.b_users
  SET role = new_role,
      updated_at = now()
  WHERE id = target_user_id
  RETURNING * INTO updated_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado ou atualização falhou.';
  END IF;

  RETURN updated_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated role so logged-in users can call the RPC (the function itself enforces admin-only rules)
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(uuid, text) TO authenticated;
