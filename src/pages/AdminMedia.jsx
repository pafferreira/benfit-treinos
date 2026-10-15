import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, CheckCheck, Upload, X, RefreshCw, RotateCcw, Loader2, Image as ImageIcon, Film, Footprints, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useExercises, useUserRole } from '../hooks/useSupabase';
import { exerciseImageUrl, DEFAULT_EXERCISE_IMAGE } from '../lib/exerciseImage';
import { requestMedia, listMedia, reviewMedia, applyMediaToItem, getMediaApproval, setMediaApproval, getDefaultPrompt, MEDIA_CHANGED_EVENT } from '../services/media';
import { listDishes, DISHES_CHANGED_EVENT } from '../services/dishes';
import { useCoach } from '../context/coach';
import SearchableExerciseSelect from '../components/SearchableExerciseSelect';
import ExerciseAnimation from '../components/ExerciseAnimation';
import MediaLibrary from '../components/MediaLibrary';
import './AdminMedia.css';

// Tela "Aprovar mídias" (v2, etapas 2C e 2D), só admin: fila das imagens e
// animações geradas pela IA, a chave da aprovação e o pedido de mídia nova para
// qualquer exercício (imagem, vídeo e duas poses) ou prato (só foto).
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

const SECTIONS = [
    { key: 'biblioteca', label: 'Biblioteca' },
    { key: 'aprovar', label: 'Aprovar' },
    { key: 'gerar', label: 'Gerar' },
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

const ENTITIES = {
    exercise: { label: 'Exercício', pick: 'Escolha o exercício', empty: 'Nenhum exercício encontrado.' },
    dish: { label: 'Prato', pick: 'Escolha o prato', empty: 'Nenhum prato encontrado.' },
};

// A mídia é a que está publicada hoje no exercício ou prato?
const isInUse = (media, item) => {
    if (!item || media.status !== 'aprovada') return false;
    if (media.kind === 'image') return Boolean(media.url) && media.url === item.image_url;
    if (media.kind === 'video') return Boolean(media.url) && media.url === item.animation_url;
    if (media.kind === 'poses') return (media.frames || []).length > 0 && JSON.stringify(media.frames) === JSON.stringify(item.animation_frames || []);
    return false;
};

const MediaCard = ({ media, exercise, busy, onReview, onUse, onRegenerate }) => {
    const isDish = media.entity_type === 'dish';
    const [showPrompt, setShowPrompt] = useState(false);
    const [adjusting, setAdjusting] = useState(false);
    const [draft, setDraft] = useState('');
    const kind = isDish ? { label: 'Foto do prato', icon: KINDS.image.icon } : (KINDS[media.kind] || KINDS.image);
    const KindIcon = kind.icon;
    const current = exercise ? (isDish ? exercise.image_url : exerciseImageUrl(exercise)) : null;
    const canReview = media.status === 'pendente' || media.status === 'aprovada' || media.status === 'rejeitada';
    const inUse = isInUse(media, exercise);
    const itemWord = isDish ? 'prato' : 'exercício';

    return (
        <article className="am-card">
            <header className="am-card-head">
                <div className="min-w-0">
                    <h3 className="am-card-title">{exercise?.name || (isDish ? 'Prato removido' : 'Exercício removido')}</h3>
                    <p className="am-card-meta">
                        <KindIcon size={14} /> {kind.label} · {formatDate(media.created_at)}
                        {exercise?.created_by_ai && <span className="am-chip am-chip-ai">Criado pelo Benfit</span>}
                    </p>
                </div>
                <span className="am-status-stack">
                    <span className={`am-status am-status-${media.status}`}>{STATUS_LABEL[media.status]}</span>
                    {inUse && <span className="am-status am-status-inuse">Em uso</span>}
                </span>
            </header>

            <div className="am-compare">
                <figure>
                    <figcaption>Nova</figcaption>
                    <MediaPreview media={media} exercise={exercise} />
                </figure>
                <figure>
                    <figcaption>No ar hoje</figcaption>
                    {current || !isDish
                        ? <img className="am-preview am-preview-current" src={current || DEFAULT_EXERCISE_IMAGE} alt="" />
                        : <div className="am-preview am-preview-wait am-preview-empty"><span>Sem foto</span></div>}
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
                {canReview && media.status !== 'aprovada' && exercise && (
                    <>
                        <button type="button" className="am-btn am-btn-approve" disabled={busy} onClick={() => onReview(media, 'aprovada', true)}>
                            <CheckCheck size={16} /> Aprovar e usar
                        </button>
                        <button type="button" className="am-btn" disabled={busy} onClick={() => onReview(media, 'aprovada', false)} title={`Aprova sem trocar a mídia do ${itemWord}`}>
                            <Check size={16} /> Só aprovar
                        </button>
                    </>
                )}
                {media.status === 'aprovada' && exercise && !inUse && (
                    <button type="button" className="am-btn am-btn-approve" disabled={busy} onClick={() => onUse(media)}>
                        <Upload size={16} /> Usar no {itemWord}
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
    const { openCoach } = useCoach();
    const { isRealAdmin, loading: roleLoading } = useUserRole();
    const { exercises, reload: reloadExercises } = useExercises();
    const [tab, setTab] = useState('pendente');
    // Abas da tela Mídias Benfit; #biblioteca e #gerar no link abrem direto nelas.
    const [section, setSection] = useState(() => {
        const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
        return SECTIONS.some(s => s.key === hash) ? hash : 'aprovar';
    });
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [approvalOn, setApprovalOn] = useState(true);
    const [busyIds, setBusyIds] = useState(() => new Set());
    const [newExerciseId, setNewExerciseId] = useState('');
    const [newEntity, setNewEntity] = useState('exercise');
    const [dishes, setDishes] = useState([]);
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
    const dishById = useMemo(() => Object.fromEntries(dishes.map(d => [d.id, d])), [dishes]);
    const reloadDishes = useCallback(() => listDishes().then(setDishes).catch(() => {}), []);
    useEffect(() => { if (isRealAdmin) reloadDishes(); }, [isRealAdmin, reloadDishes]);
    const entityOf = (media) => (media.entity_type === 'dish' ? dishById : exerciseById)[media.entity_id];
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

    // O Benfit cadastra pratos e exercícios pelo chat e manda a foto para a fila.
    useEffect(() => {
        if (!isRealAdmin) return undefined;
        const onMedia = () => { load(); reloadDishes(); reloadRef.current?.(); };
        window.addEventListener(MEDIA_CHANGED_EVENT, onMedia);
        window.addEventListener(DISHES_CHANGED_EVENT, reloadDishes);
        return () => {
            window.removeEventListener(MEDIA_CHANGED_EVENT, onMedia);
            window.removeEventListener(DISHES_CHANGED_EVENT, reloadDishes);
        };
    }, [isRealAdmin, load, reloadDishes]);

    // Item que ainda não existe: o Benfit cadastra pelo chat e já gera a foto.
    const createWithBenfit = (name) => {
        const term = name.trim();
        if (!term) return;
        openCoach(newEntity === 'dish'
            ? `Cadastre no catálogo de Dieta o prato "${term}", com ingredientes, modo de preparo e macros.`
            : `Cadastre na base o exercício "${term}", com grupos musculares e instruções.`);
    };

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
                console.warn('[Mídias Benfit] Falha ao conferir vídeo:', err.message);
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

    const handleUse = async (media) => {
        setBusy(media.id, true);
        try {
            await applyMediaToItem(media.id);
            const isDish = media.entity_type === 'dish';
            if (isDish) reloadDishes(); else reloadExercises();
            toast(isDish ? 'Foto publicada no prato.' : 'Mídia publicada no exercício.');
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setBusy(media.id, false);
        }
    };

    const handleReview = async (media, decision, use = true) => {
        setBusy(media.id, true);
        try {
            const updated = await reviewMedia(media.id, decision, use);
            upsertItem(updated);
            if (decision === 'aprovada') {
                const isDish = media.entity_type === 'dish';
                if (isDish) reloadDishes(); else reloadExercises();
                toast(use
                    ? (isDish ? 'Foto aprovada e publicada no prato.' : 'Mídia aprovada e publicada no exercício.')
                    : `Mídia aprovada sem trocar a do ${isDish ? 'prato' : 'exercício'}. Use quando quiser pelo Histórico.`);
            } else {
                toast('Mídia rejeitada.');
            }
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setBusy(media.id, false);
        }
    };

    const generate = async (kind, entityId, prompt, entityType = 'exercise') => {
        const key = `${kind}:${entityId}`;
        setGenerating(key);
        try {
            const media = await requestMedia(kind, { entityType, entityId, prompt });
            upsertItem(media);
            setTab(media.status === 'gerando' ? 'gerando' : media.status === 'pendente' ? 'pendente' : 'historico');
            setSection('aprovar');
            if (media.status === 'aprovada') {
                if (entityType === 'dish') reloadDishes(); else reloadExercises();
            }
            toast(media.status === 'gerando'
                ? 'Vídeo em geração. Ele aparece em "Gerando" e fica pronto em alguns minutos.'
                : media.status === 'aprovada' ? 'Mídia gerada e publicada.' : 'Mídia gerada. Revise em "Pendentes".');
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setGenerating(null);
        }
    };

    const handleRegenerate = (media, prompt) => generate(media.kind, media.entity_id, prompt, media.entity_type);

    const changeEntity = (entity) => {
        setNewEntity(entity);
        setNewExerciseId('');
        setNewKind('image');
    };

    // Descrição padrão do exercício e tipo escolhidos, já em português, para editar.
    useEffect(() => {
        if (!newExerciseId) { setNewPrompt(''); return undefined; }
        let active = true;
        setPromptLoading(true);
        getDefaultPrompt(newExerciseId, newKind, newEntity)
            .then(prompt => { if (active) setNewPrompt(prompt || ''); })
            .catch(err => { if (active) toast(`Não foi possível montar a descrição: ${err.message}`, 'error'); })
            .finally(() => { if (active) setPromptLoading(false); });
        return () => { active = false; };
    }, [newExerciseId, newKind, newEntity, promptVersion]);

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

    const isDishTarget = newEntity === 'dish';
    const selected = (isDishTarget ? dishById : exerciseById)[newExerciseId];
    const kindEntries = Object.entries(KINDS).filter(([kind]) => !isDishTarget || kind === 'image');

    return (
        <div className="am-page">
            <div className="am-header">
                <button type="button" onClick={() => navigate('/perfil')} className="am-back" title="Voltar para Perfil">
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1>Mídias Benfit</h1>
                    <p>Biblioteca de imagens e mídias geradas pela IA.</p>
                </div>
            </div>

            <div className="am-sections" role="tablist" aria-label="Seções">
                {SECTIONS.map(s => (
                    <button
                        key={s.key}
                        type="button"
                        role="tab"
                        aria-selected={section === s.key}
                        className={section === s.key ? 'is-active' : ''}
                        onClick={() => setSection(s.key)}
                    >
                        {s.label}
                        {s.key === 'aprovar' && counts.pendente > 0 && <span className="am-tab-count">{counts.pendente}</span>}
                    </button>
                ))}
            </div>

            {section === 'biblioteca' && <MediaLibrary exercises={exercises || []} dishes={dishes} />}

            {section === 'aprovar' && <>
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
            </>}

            {section === 'gerar' && (
            <section className="am-panel">
                <h2 className="am-panel-title"><Sparkles size={16} /> Gerar mídia</h2>
                <div className="am-kind-tabs am-entity-tabs" role="radiogroup" aria-label="Para o quê">
                    {Object.entries(ENTITIES).map(([entity, { label }]) => (
                        <button
                            key={entity}
                            type="button"
                            role="radio"
                            aria-checked={newEntity === entity}
                            className={newEntity === entity ? 'is-active' : ''}
                            disabled={Boolean(generating)}
                            onClick={() => changeEntity(entity)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <SearchableExerciseSelect
                    key={newEntity}
                    exercises={isDishTarget ? dishes : exercises}
                    value={newExerciseId}
                    onChange={setNewExerciseId}
                    placeholder={ENTITIES[newEntity].pick}
                    emptyLabel={ENTITIES[newEntity].empty}
                    onCreateNew={createWithBenfit}
                    createLabel={(term) => `Criar "${term}" com o Benfit`}
                />
                {!isDishTarget && <div className="am-kind-tabs" role="radiogroup" aria-label="Tipo de mídia">
                    {kindEntries.map(([kind, { label, tab: tabLabel, icon }]) => {
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
                </div>}
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
                    onClick={() => generate(newKind, newExerciseId, newPrompt.trim(), newEntity)}
                >
                    {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {isDishTarget ? 'Gerar foto do prato' : `Gerar ${KINDS[newKind].label.toLowerCase()}`}
                </button>
                <p className="am-hint">
                    A descrição é traduzida para o inglês na hora de gerar.{' '}
                    {isDishTarget ? 'A foto leva uns 20 segundos.' : 'Imagem leva uns 20 segundos; duas poses, um pouco mais; o vídeo segue em "Gerando".'}
                </p>
            </section>
            )}

            {section === 'aprovar' && <>
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
                            exercise={entityOf(media)}
                            busy={busyIds.has(media.id) || Boolean(generating)}
                            onReview={handleReview}
                            onUse={handleUse}
                            onRegenerate={handleRegenerate}
                        />
                    ))}
                </div>
            )}
            </>}
        </div>
    );
};

export default AdminMedia;
