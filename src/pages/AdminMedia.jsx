import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, RefreshCw, RotateCcw, Loader2, Image as ImageIcon, Film, Footprints, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useExercises, useUserRole } from '../hooks/useSupabase';
import { exerciseImageUrl, DEFAULT_EXERCISE_IMAGE } from '../lib/exerciseImage';
import { requestMedia, listMedia, reviewMedia, getMediaApproval, setMediaApproval, getDefaultPrompt } from '../services/media';
import SearchableExerciseSelect from '../components/SearchableExerciseSelect';
import ExerciseAnimation from '../components/ExerciseAnimation';
import './AdminMedia.css';

// Tela "Aprovar mídias" (v2, etapa 2C), só admin: fila das imagens e animações
// geradas pela IA, a chave da aprovação e o pedido de mídia nova para qualquer
// exercício (inclusive o piloto de animação: vídeo e duas poses).
const KINDS = {
    image: { label: 'Imagem', icon: ImageIcon },
    poses: { label: 'Duas poses', tab: '2 poses', icon: Footprints },
    video: { label: 'Vídeo', icon: Film },
};

const TABS = [
    { key: 'pendente', label: 'Pendentes', statuses: ['pendente'] },
    { key: 'gerando', label: 'Gerando', statuses: ['gerando'] },
    { key: 'historico', label: 'Histórico', statuses: ['aprovada', 'rejeitada', 'falhou'] },
];

const STATUS_LABEL = {
    gerando: 'Gerando',
    pendente: 'Pendente',
    aprovada: 'Aprovada',
    rejeitada: 'Rejeitada',
    falhou: 'Falhou',
};

const PROMPT_MAX = 4000;
const POSES_HINT = 'Mantenha a linha com --- separando a pose inicial (acima) da final (abaixo).';

const toast = (message, type = 'success') => window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type } }));

const formatDate = (value) => new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const MediaPreview = ({ media, exercise }) => {
    if (media.status === 'gerando') {
        return (
            <div className="am-preview am-preview-wait">
                <Loader2 size={22} className="animate-spin" />
                <span>{media.kind === 'video' ? 'Gerando o vídeo. Pode levar alguns minutos.' : 'Gerando…'}</span>
            </div>
        );
    }
    if (media.kind === 'image' && media.url) {
        return <img className="am-preview" src={media.url} alt={`Nova imagem de ${exercise?.name || 'exercício'}`} />;
    }
    const hasFile = media.kind === 'video' ? Boolean(media.url) : (media.frames || []).length >= 2;
    if ((media.kind === 'video' || media.kind === 'poses') && hasFile) {
        return (
            <ExerciseAnimation
                videoUrl={media.kind === 'video' ? media.url : null}
                frames={media.kind === 'poses' ? media.frames : null}
                poster={exercise ? exerciseImageUrl(exercise) : null}
                alt={exercise?.name || ''}
                className="am-preview"
            />
        );
    }
    return <div className="am-preview am-preview-wait am-preview-empty"><span>Sem arquivo gerado</span></div>;
};

const MediaCard = ({ media, exercise, busy, onReview, onRegenerate }) => {
    const [showPrompt, setShowPrompt] = useState(false);
    const [adjusting, setAdjusting] = useState(false);
    const [draft, setDraft] = useState('');
    const kind = KINDS[media.kind] || KINDS.image;
    const KindIcon = kind.icon;
    const current = exercise ? exerciseImageUrl(exercise) : null;
    const canReview = media.status === 'pendente' || media.status === 'aprovada' || media.status === 'rejeitada';

    return (
        <article className="am-card">
            <header className="am-card-head">
                <div className="min-w-0">
                    <h3 className="am-card-title">{exercise?.name || 'Exercício removido'}</h3>
                    <p className="am-card-meta">
                        <KindIcon size={14} /> {kind.label} · {formatDate(media.created_at)}
                        {exercise?.created_by_ai && <span className="am-chip am-chip-ai">Criado pelo Coach</span>}
                    </p>
                </div>
                <span className={`am-status am-status-${media.status}`}>{STATUS_LABEL[media.status]}</span>
            </header>

            <div className="am-compare">
                <figure>
                    <figcaption>Nova</figcaption>
                    <MediaPreview media={media} exercise={exercise} />
                </figure>
                <figure>
                    <figcaption>No ar hoje</figcaption>
                    <img className="am-preview am-preview-current" src={current || DEFAULT_EXERCISE_IMAGE} alt="" />
                </figure>
            </div>

            {media.status === 'falhou' && media.error && <p className="am-error">{media.error}</p>}

            {media.prompt && (
                <button type="button" className="am-link" onClick={() => setShowPrompt(v => !v)}>
                    {showPrompt ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Texto usado na geração
                </button>
            )}
            {showPrompt && <pre className="am-prompt">{media.prompt}</pre>}

            {adjusting && (
                <div className="am-adjust">
                    <label htmlFor={`adj-${media.id}`}>Descrição para a nova versão (edite o que quiser)</label>
                    <textarea
                        id={`adj-${media.id}`}
                        rows={8}
                        maxLength={PROMPT_MAX}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                    />
                    {media.kind === 'poses' && <p className="am-hint">{POSES_HINT}</p>}
                </div>
            )}

            <div className="am-actions">
                {canReview && media.status !== 'aprovada' && (
                    <button type="button" className="am-btn am-btn-approve" disabled={busy} onClick={() => onReview(media, 'aprovada')}>
                        <Check size={16} /> Aprovar
                    </button>
                )}
                {exercise && media.status !== 'gerando' && (
                    adjusting ? (
                        <button
                            type="button"
                            className="am-btn am-btn-primary"
                            disabled={busy || !draft.trim()}
                            onClick={() => { onRegenerate(media, draft.trim()); setAdjusting(false); }}
                        >
                            <Sparkles size={16} /> Gerar
                        </button>
                    ) : (
                        <button type="button" className="am-btn" disabled={busy} onClick={() => { setDraft(media.prompt || ''); setAdjusting(true); }}>
                            <RefreshCw size={16} /> Gerar de novo
                        </button>
                    )
                )}
                {canReview && media.status === 'pendente' && (
                    <button type="button" className="am-btn am-btn-reject" disabled={busy} onClick={() => onReview(media, 'rejeitada')}>
                        <X size={16} /> Rejeitar
                    </button>
                )}
            </div>
        </article>
    );
};

const AdminMedia = () => {
    const navigate = useNavigate();
    const { isRealAdmin, loading: roleLoading } = useUserRole();
    const { exercises, reload: reloadExercises } = useExercises();
    const [tab, setTab] = useState('pendente');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [approvalOn, setApprovalOn] = useState(true);
    const [busyIds, setBusyIds] = useState(() => new Set());
    const [newExerciseId, setNewExerciseId] = useState('');
    const [newKind, setNewKind] = useState('image');
    const [newPrompt, setNewPrompt] = useState('');
    const [promptLoading, setPromptLoading] = useState(false);
    const [promptVersion, setPromptVersion] = useState(0);
    const [generating, setGenerating] = useState(null);
    const pollingRef = useRef(false);
    // reload muda a cada render; o ref evita reiniciar a consulta dos vídeos.
    const reloadRef = useRef(reloadExercises);
    useEffect(() => { reloadRef.current = reloadExercises; }, [reloadExercises]);

    const exerciseById = useMemo(() => Object.fromEntries((exercises || []).map(ex => [ex.id, ex])), [exercises]);
    const counts = useMemo(() => TABS.reduce((acc, t) => ({
        ...acc, [t.key]: items.filter(m => t.statuses.includes(m.status)).length,
    }), {}), [items]);
    const visible = useMemo(() => items.filter(m => TABS.find(t => t.key === tab).statuses.includes(m.status)), [items, tab]);

    const load = useCallback(async () => {
        try {
            const [media, approval] = await Promise.all([listMedia({ limit: 100 }), getMediaApproval()]);
            setItems(media);
            setApprovalOn(approval);
        } catch (err) {
            toast(`Não foi possível carregar a fila: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isRealAdmin) load();
    }, [isRealAdmin, load]);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') navigate('/perfil'); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [navigate]);

    const upsertItem = (media) => setItems(prev => [media, ...prev.filter(m => m.id !== media.id)]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));

    // Vídeos em geração: confere a cada 15 s enquanto a tela está aberta.
    const generatingIds = items.filter(m => m.status === 'gerando' && m.kind === 'video').map(m => m.id).join(',');
    useEffect(() => {
        if (!generatingIds) return undefined;
        const tick = async () => {
            if (pollingRef.current) return;
            pollingRef.current = true;
            try {
                for (const id of generatingIds.split(',')) {
                    const media = await requestMedia('video-status', { mediaId: id });
                    if (media) upsertItem(media);
                    if (media && media.status !== 'gerando') {
                        toast(media.status === 'falhou' ? 'O vídeo não foi gerado.' : 'Vídeo pronto para revisar.',
                            media.status === 'falhou' ? 'error' : 'success');
                        if (media.status === 'aprovada') reloadRef.current();
                    }
                }
            } catch (err) {
                console.warn('[Aprovar mídias] Falha ao conferir vídeo:', err.message);
            } finally {
                pollingRef.current = false;
            }
        };
        tick();
        const timer = setInterval(tick, 15000);
        return () => clearInterval(timer);
    }, [generatingIds]);

    const setBusy = (id, on) => setBusyIds(prev => {
        const next = new Set(prev);
        if (on) next.add(id); else next.delete(id);
        return next;
    });

    const handleReview = async (media, decision) => {
        setBusy(media.id, true);
        try {
            const updated = await reviewMedia(media.id, decision);
            upsertItem(updated);
            if (decision === 'aprovada') {
                reloadExercises();
                toast('Mídia aprovada e publicada no exercício.');
            } else {
                toast('Mídia rejeitada.');
            }
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setBusy(media.id, false);
        }
    };

    const generate = async (kind, exerciseId, prompt) => {
        const key = `${kind}:${exerciseId}`;
        setGenerating(key);
        try {
            const media = await requestMedia(kind, { exerciseId, prompt });
            upsertItem(media);
            setTab(media.status === 'gerando' ? 'gerando' : media.status === 'pendente' ? 'pendente' : 'historico');
            if (media.status === 'aprovada') reloadExercises();
            toast(media.status === 'gerando'
                ? 'Vídeo em geração. Ele aparece em "Gerando" e fica pronto em alguns minutos.'
                : media.status === 'aprovada' ? 'Mídia gerada e publicada.' : 'Mídia gerada. Revise em "Pendentes".');
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setGenerating(null);
        }
    };

    const handleRegenerate = (media, prompt) => generate(media.kind, media.entity_id, prompt);

    // Descrição padrão do exercício e tipo escolhidos, já em português, para editar.
    useEffect(() => {
        if (!newExerciseId) { setNewPrompt(''); return undefined; }
        let active = true;
        setPromptLoading(true);
        getDefaultPrompt(newExerciseId, newKind)
            .then(prompt => { if (active) setNewPrompt(prompt || ''); })
            .catch(err => { if (active) toast(`Não foi possível montar a descrição: ${err.message}`, 'error'); })
            .finally(() => { if (active) setPromptLoading(false); });
        return () => { active = false; };
    }, [newExerciseId, newKind, promptVersion]);

    const toggleApproval = async () => {
        const next = !approvalOn;
        setApprovalOn(next);
        try {
            await setMediaApproval(next);
            toast(next ? 'Aprovação ligada: mídias novas esperam sua revisão.' : 'Aprovação desligada: mídias novas entram no ar na hora.');
        } catch (err) {
            setApprovalOn(!next);
            toast(err.message, 'error');
        }
    };

    if (!roleLoading && !isRealAdmin) {
        return (
            <div className="p-4 pb-24">
                <p className="text-gray-600">Esta tela é só para administradores.</p>
            </div>
        );
    }

    const selected = exerciseById[newExerciseId];

    return (
        <div className="am-page">
            <div className="am-header">
                <button type="button" onClick={() => navigate('/perfil')} className="am-back" title="Voltar para Perfil">
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1>Aprovar mídias</h1>
                    <p>Imagens e animações geradas pela IA.</p>
                </div>
            </div>

            <section className="am-panel am-switch-row">
                <div>
                    <strong>Revisar antes de publicar</strong>
                    <p>{approvalOn
                        ? 'Ligada: nada gerado pela IA aparece no app sem a sua aprovação.'
                        : 'Desligada: o que a IA gera entra no ar na hora.'}</p>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={approvalOn}
                    aria-label="Revisar antes de publicar"
                    className={`am-switch ${approvalOn ? 'is-on' : ''}`}
                    onClick={toggleApproval}
                >
                    <span />
                </button>
            </section>

            <section className="am-panel">
                <h2 className="am-panel-title"><Sparkles size={16} /> Gerar mídia para um exercício</h2>
                <SearchableExerciseSelect
                    exercises={exercises}
                    value={newExerciseId}
                    onChange={setNewExerciseId}
                    placeholder="Escolha o exercício"
                />
                <div className="am-kind-tabs" role="radiogroup" aria-label="Tipo de mídia">
                    {Object.entries(KINDS).map(([kind, { label, tab: tabLabel, icon }]) => {
                        const KindIcon = icon;
                        const needsImage = kind !== 'image' && selected && !exerciseImageUrl(selected);
                        return (
                            <button
                                key={kind}
                                type="button"
                                role="radio"
                                aria-checked={newKind === kind}
                                className={newKind === kind ? 'is-active' : ''}
                                disabled={Boolean(generating) || needsImage}
                                title={needsImage ? 'Precisa de uma imagem aprovada antes' : undefined}
                                onClick={() => setNewKind(kind)}
                            >
                                <KindIcon size={15} /> {tabLabel || label}
                            </button>
                        );
                    })}
                </div>
                {selected && (
                    <div className="am-adjust">
                        <div className="am-prompt-head">
                            <label htmlFor="am-new-prompt">Descrição para a IA (edite o que quiser)</label>
                            <button type="button" className="am-link" disabled={promptLoading} onClick={() => setPromptVersion(v => v + 1)}>
                                <RotateCcw size={13} /> Restaurar
                            </button>
                        </div>
                        <textarea
                            id="am-new-prompt"
                            rows={9}
                            maxLength={PROMPT_MAX}
                            value={promptLoading ? 'Montando a descrição…' : newPrompt}
                            disabled={promptLoading}
                            onChange={(e) => setNewPrompt(e.target.value)}
                        />
                        {newKind === 'poses' && <p className="am-hint">{POSES_HINT}</p>}
                    </div>
                )}
                <button
                    type="button"
                    className="am-btn am-btn-primary am-gen-submit"
                    disabled={!selected || Boolean(generating) || promptLoading || !newPrompt.trim()
                        || (newKind !== 'image' && !exerciseImageUrl(selected))}
                    onClick={() => generate(newKind, newExerciseId, newPrompt.trim())}
                >
                    {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    Gerar {KINDS[newKind].label.toLowerCase()}
                </button>
                <p className="am-hint">A descrição é traduzida para o inglês na hora de gerar. Imagem leva uns 20 segundos; duas poses, um pouco mais; o vídeo segue em "Gerando".</p>
            </section>

            <div className="am-tabs" role="tablist">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.key}
                        className={tab === t.key ? 'is-active' : ''}
                        onClick={() => setTab(t.key)}
                    >
                        {t.label}
                        {counts[t.key] > 0 && <span className="am-tab-count">{counts[t.key]}</span>}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="am-empty"><Loader2 size={20} className="animate-spin" /> Carregando…</div>
            ) : visible.length === 0 ? (
                <div className="am-empty">
                    {tab === 'pendente' ? 'Nada esperando aprovação.' : tab === 'gerando' ? 'Nenhum vídeo em geração.' : 'Nada por aqui ainda.'}
                </div>
            ) : (
                <div className="am-list">
                    {visible.map(media => (
                        <MediaCard
                            key={media.id}
                            media={media}
                            exercise={exerciseById[media.entity_id]}
                            busy={busyIds.has(media.id) || Boolean(generating)}
                            onReview={handleReview}
                            onRegenerate={handleRegenerate}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminMedia;
