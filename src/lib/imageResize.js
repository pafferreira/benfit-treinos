/**
 * Redimensiona/comprime uma imagem no navegador antes do upload (Canvas API,
 * sem dependência externa). Fotos de celular chegam com 3000-4000px e vários MB —
 * isso limita a maior dimensão e reencoda em qualidade menor, cortando o peso
 * bem antes de subir pro Supabase Storage.
 */
export async function resizeImageFile(file, { maxDimension = 800, quality = 0.82 } = {}) {
    if (!file.type.startsWith('image/')) return file;

    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    // PNG mantém transparência; qualquer outro formato vira JPEG (bem mais leve pra fotos).
    const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, outType, quality));

    // Se por algum motivo o resultado não ficou menor, mantém o original.
    if (!blob || blob.size >= file.size) return file;

    const ext = outType === 'image/png' ? 'png' : 'jpg';
    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.${ext}`, { type: outType });
}
