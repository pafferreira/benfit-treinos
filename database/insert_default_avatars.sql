-- ==============================================================================
-- INSERT DEFAULT AVATARS
-- Adiciona os avatares padrão (Masculino e Feminino) à tabela b_avatars.
-- Categoria: 'Avatar' (para filtro correto na UI).
-- ==============================================================================

INSERT INTO public.b_avatars (storage_path, public_url, name, category, gender, is_active)
VALUES 
    ('/avatar-female.png', '/avatar-female.png', 'Avatar Feminino', 'Avatar', 'female', true),
    ('/avatar-male.png', '/avatar-male.png', 'Avatar Masculino', 'Avatar', 'male', true),
    ('/benfit_fem.png', '/benfit_fem.png', 'Benfit Feminino', 'Avatar', 'female', true),
    ('/benfit_mas.png', '/benfit_mas.png', 'Benfit Masculino', 'Avatar', 'male', true)
ON CONFLICT DO NOTHING;
-- Nota: Como b_avatars geralmente usa UUID primary key e não tem unique constraint em public_url por padrão,
-- este INSERT pode duplicar se rodar várias vezes sem checagem.
-- Vamos fazer um INSERT inteligente com WHERE NOT EXISTS.

INSERT INTO public.b_avatars (storage_path, public_url, name, category, gender, is_active)
SELECT '/avatar-female.png', '/avatar-female.png', 'Avatar Feminino', 'Avatar', 'female', true
WHERE NOT EXISTS (SELECT 1 FROM public.b_avatars WHERE public_url = '/avatar-female.png');

INSERT INTO public.b_avatars (storage_path, public_url, name, category, gender, is_active)
SELECT '/avatar-male.png', '/avatar-male.png', 'Avatar Masculino', 'Avatar', 'male', true
WHERE NOT EXISTS (SELECT 1 FROM public.b_avatars WHERE public_url = '/avatar-male.png');

INSERT INTO public.b_avatars (storage_path, public_url, name, category, gender, is_active)
SELECT '/benfit_fem.png', '/benfit_fem.png', 'Benfit Feminino', 'Avatar', 'female', true
WHERE NOT EXISTS (SELECT 1 FROM public.b_avatars WHERE public_url = '/benfit_fem.png');

INSERT INTO public.b_avatars (storage_path, public_url, name, category, gender, is_active)
SELECT '/benfit_mas.png', '/benfit_mas.png', 'Benfit Masculino', 'Avatar', 'male', true
WHERE NOT EXISTS (SELECT 1 FROM public.b_avatars WHERE public_url = '/benfit_mas.png');

INSERT INTO public.b_avatars (storage_path, public_url, name, category, gender, is_active)
SELECT '/Elifit_Coach.png', '/Elifit_Coach.png', 'Coach', 'Avatar', 'neutral', true
WHERE NOT EXISTS (SELECT 1 FROM public.b_avatars WHERE public_url = '/Elifit_Coach.png');
