import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildConversationMessages,
    CHAT_HISTORY_LIMIT,
    getBearerToken,
    normalizeHistoryRows,
} from '../api/_conversation-history.js';
import chatHandler from '../api/chat.js';
import {
    parseGeminiResponse,
    toGeminiContents,
    toOpenAIMessages,
} from '../api/_providers.js';

test('usa uma janela de doze mensagens', () => {
    assert.equal(CHAT_HISTORY_LIMIT, 12);
});

test('extrai o bearer token sem aceitar outros esquemas de autenticação', () => {
    assert.equal(getBearerToken({ headers: { authorization: 'Bearer token-do-aluno' } }), 'token-do-aluno');
    assert.equal(getBearerToken({ headers: { authorization: 'Basic credenciais' } }), null);
});

test('exige sessão autenticada no chat multiturno', async () => {
    let statusCode = null;
    let responseBody = null;
    const response = {
        status(code) {
            statusCode = code;
            return this;
        },
        json(body) {
            responseBody = body;
            return this;
        },
    };

    await chatHandler({
        method: 'POST',
        headers: {},
        body: {
            message: 'Qual foi o segundo exercício?',
            conversationId: '11111111-1111-4111-8111-111111111111',
        },
    }, response);

    assert.equal(statusCode, 401);
    assert.match(responseBody.error, /Sessão expirada/);
});

test('substitui a mensagem recém-persistida pelo conteúdo enriquecido sem duplicar', () => {
    const messages = buildConversationMessages({
        history: [
            { role: 'user', content: 'Fale do supino' },
            { role: 'assistant', content: 'O supino trabalha peitoral.', provider: 'gemini' },
            { role: 'user', content: 'E o segundo exercício?' },
        ],
        message: 'E o segundo exercício?',
        context: 'Catálogo e perfil atualizados',
    });

    assert.equal(messages.length, 3);
    assert.match(messages.at(-1).content, /CONTEXTO ATUAL DO ALUNO/);
    assert.match(messages.at(-1).content, /E o segundo exercício\?/);
});

test('preserva parts e thoughtSignature somente para respostas do Gemini', () => {
    const signaturePart = { text: 'Primeiro, faça supino.', thoughtSignature: 'assinatura-opaca' };
    const contents = toGeminiContents([
        { role: 'user', content: 'Monte uma sequência.' },
        {
            role: 'assistant',
            content: 'Primeiro, faça supino.',
            provider: 'gemini',
            providerParts: [signaturePart],
        },
        {
            role: 'assistant',
            content: 'Resposta do fallback.',
            provider: 'openai',
            providerParts: [{ text: 'não deve ser reutilizada' }],
        },
    ]);

    assert.deepEqual(contents[1].parts, [signaturePart]);
    assert.deepEqual(contents[2].parts, [{ text: 'Resposta do fallback.' }]);
});

test('degrada o histórico para texto nos provedores OpenAI-compatible', () => {
    const messages = toOpenAIMessages([
        { role: 'user', content: 'Qual foi o primeiro?' },
        {
            role: 'assistant',
            content: 'Supino.',
            provider: 'gemini',
            providerParts: [{ text: 'Supino.', thoughtSignature: 'sig' }],
        },
    ], 'Sistema');

    assert.deepEqual(messages, [
        { role: 'system', content: 'Sistema' },
        { role: 'user', content: 'Qual foi o primeiro?' },
        { role: 'assistant', content: 'Supino.' },
    ]);
});

test('mantém as parts cruas do Gemini sem expor partes marcadas como pensamento', () => {
    const providerParts = [
        { thought: true, text: 'resumo interno' },
        { text: 'Resposta visível.', thoughtSignature: 'sig-final' },
    ];
    const parsed = parseGeminiResponse({
        candidates: [{ content: { role: 'model', parts: providerParts } }],
    });

    assert.equal(parsed.text, 'Resposta visível.');
    assert.deepEqual(parsed.providerParts, providerParts);
});

test('preserva providerParts ao normalizar uma segunda vez', () => {
    const parts = [{ text: 'Resposta.', thoughtSignature: 'sig' }];
    assert.deepEqual(normalizeHistoryRows(normalizeHistoryRows([
        { role: 'assistant', content: 'Resposta.', provider: 'gemini', provider_parts: parts },
    ])), [{ role: 'assistant', content: 'Resposta.', provider: 'gemini', providerParts: parts }]);
});

test('ignora linhas inválidas do histórico', () => {
    assert.deepEqual(normalizeHistoryRows([
        { role: 'system', content: 'não entra' },
        { role: 'user', content: 'entra', provider_parts: { text: 'formato inválido' } },
        { role: 'assistant', content: null },
    ]), [{ role: 'user', content: 'entra', provider: null, providerParts: null }]);
});
