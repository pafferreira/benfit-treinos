// Embedding é sempre Gemini: o banco usa vector(3072) indexado com
// gemini-embedding-2 — outro provedor geraria espaço vetorial incompatível.
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { text } = req.body || {};
    if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Campo "text" é obrigatório' });
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        return res.status(500).json({ error: 'GEMINI_API_KEY não configurada' });
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${key}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: { parts: [{ text }] } }),
            }
        );

        if (!response.ok) {
            const body = await response.text();
            console.error('[api/embedding] Erro Gemini:', response.status, body.slice(0, 300));
            return res.status(502).json({ error: 'Falha ao gerar embedding' });
        }

        const data = await response.json();
        return res.status(200).json({ embedding: data.embedding.values });
    } catch (error) {
        console.error('[api/embedding] Erro de rede:', error.message);
        return res.status(502).json({ error: 'Falha ao gerar embedding' });
    }
}
