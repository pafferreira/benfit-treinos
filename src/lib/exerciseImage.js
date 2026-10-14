// URL da imagem de um exercício: caminho no bucket "exercises" ou URL completa.
export const exerciseImageUrl = (exercise) => {
    const url = exercise?.image_url;
    if (!url) return exercise?.video_url || null;
    return url.startsWith('http')
        ? url
        : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/exercises/${url}`;
};
