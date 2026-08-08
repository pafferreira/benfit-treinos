/**
 * Cache em memória com stale-while-revalidate.
 *
 * Motivação: navegar Planos → Dias → Detalhe do dia e voltar refazia todas as
 * queries do zero, exibindo skeleton mesmo com os dados praticamente inalterados.
 * Aqui guardamos o último resultado por chave: a volta renderiza instantaneamente
 * a partir do cache enquanto uma revalidação silenciosa roda em background.
 *
 * O cache vive apenas na memória do tab (some no reload), o que é suficiente —
 * o objetivo é a transição entre telas, não persistência offline.
 */

const store = new Map();

// Após esse tempo o valor ainda é servido, mas a revalidação vira prioridade.
const DEFAULT_MAX_AGE = 60_000;

export const cacheGet = (key, maxAge = DEFAULT_MAX_AGE) => {
    const entry = store.get(key);
    if (!entry) return null;
    return {
        value: entry.value,
        stale: Date.now() - entry.at > maxAge,
    };
};

export const cacheSet = (key, value) => {
    store.set(key, { value, at: Date.now() });
    return value;
};

/** Invalida uma chave exata ou todas que começam com o prefixo. */
export const cacheInvalidate = (keyOrPrefix, { prefix = false } = {}) => {
    if (!prefix) {
        store.delete(keyOrPrefix);
        return;
    }
    for (const key of store.keys()) {
        if (key.startsWith(keyOrPrefix)) store.delete(key);
    }
};

export const cacheClear = () => store.clear();

/**
 * Deduplica chamadas simultâneas para a mesma chave — evita que dois efeitos
 * disparem a mesma query em paralelo durante a revalidação.
 */
const inFlight = new Map();

export const dedupe = (key, fn) => {
    const running = inFlight.get(key);
    if (running) return running;

    const promise = Promise.resolve()
        .then(fn)
        .finally(() => inFlight.delete(key));

    inFlight.set(key, promise);
    return promise;
};

/**
 * Padrão SWR: entrega o cache (se houver) via `onData` de imediato e revalida.
 * Retorna a promise da revalidação para quem quiser aguardar.
 */
export const swr = async (key, fetcher, { maxAge = DEFAULT_MAX_AGE, onData } = {}) => {
    const cached = cacheGet(key, maxAge);
    if (cached && onData) onData(cached.value, { fromCache: true });

    try {
        const fresh = await dedupe(key, fetcher);
        cacheSet(key, fresh);
        if (onData) onData(fresh, { fromCache: false });
        return fresh;
    } catch (err) {
        // Com cache válido, um erro de rede não deve quebrar a tela.
        if (cached) return cached.value;
        throw err;
    }
};
