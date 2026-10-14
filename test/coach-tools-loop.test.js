import assert from 'node:assert/strict';
import test from 'node:test';

import { chatWithFallback } from '../api/_providers.js';
import { COACH_TOOLS } from '../api/_coach-tools.js';

const claudeReply = (content, stopReason) => new Response(JSON.stringify({
    id: 'msg', type: 'message', role: 'assistant', model: 'claude-haiku-5-5',
    content, stop_reason: stopReason, stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 5 },
}), { status: 200, headers: { 'content-type': 'application/json' } });

test('Claude roda a ferramenta e devolve o texto final com a ação', async () => {
    const originalFetch = globalThis.fetch;
    const originalKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'teste';
    const bodies = [];
    globalThis.fetch = async (url, init) => {
        bodies.push(JSON.parse(init.body));
        return bodies.length === 1
            ? claudeReply([
                { type: 'text', text: 'Vou cadastrar.' },
                { type: 'tool_use', id: 'tu1', name: 'propor_exercicio_novo', input: { name: 'Ponte' } },
            ], 'tool_use')
            : claudeReply([{ type: 'text', text: 'Pronto, cadastrei a Ponte.' }], 'end_turn');
    };
    try {
        const ran = [];
        const result = await chatWithFallback({
            messages: [{ role: 'user', content: 'cria a ponte' }],
            systemPrompt: 'teste',
            tools: COACH_TOOLS,
            runTool: async (name, input) => {
                ran.push({ name, input });
                return { content: 'ok', action: { type: 'exercise_created', exerciseId: 'x', name: 'Ponte', existing: false } };
            },
        });
        assert.equal(result.text, 'Pronto, cadastrei a Ponte.');
        assert.deepEqual(ran, [{ name: 'propor_exercicio_novo', input: { name: 'Ponte' } }]);
        assert.equal(result.actions.length, 1);
        assert.equal(result.usage.input_tokens, 20);
        assert.equal(bodies[0].tools[0].name, 'propor_exercicio_novo');
        const last = bodies[1].messages.at(-1);
        assert.equal(last.role, 'user');
        assert.deepEqual(last.content[0], { type: 'tool_result', tool_use_id: 'tu1', content: 'ok' });
    } finally {
        globalThis.fetch = originalFetch;
        if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
        else process.env.ANTHROPIC_API_KEY = originalKey;
    }
});
