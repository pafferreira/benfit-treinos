import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Sparkles, Loader2, RotateCcw, Image as ImageIcon, ChevronDown, X } from 'lucide-react';
import { supabase, supabaseHelpers } from '../lib/supabase';
import { resizeImageFile } from '../lib/imageResize';
import { getDefaultPrompt, getFreePrompt, generateFreeImage } from '../services/media';
import { exerciseImageUrl } from '../lib/exerciseImage';
import { MEAL_TYPES } from '../services/dishes';
import Modal from './Modal';
import SearchableExerciseSelect from './SearchableExerciseSelect';
import './ImageFormModal.css';

// Tela "Nova imagem" / "Editar imagem" de Mídias Benfit (aberta pelo "+ Novo"
// da aba Gerar e pelos cartões da Biblioteca). O tipo escolhido no topo decide
// os campos: exercício e avatar têm Tipo (Masculino/Feminino); prato tem a
// refeição, guardada no mesmo campo gender de b_avatars (cafe, almoco, lanche...).
// Gerar com IA vale para todas as categorias: exercício e prato vão para a fila
// Aprovar; avatar e outro voltam para esta tela, que mostra a prévia antes de salvar.
const TARGETS = [
    { key: 'exercicio', label: 'Exercício' },
    { key: 'prato', label: 'Prato' },
    { key: 'Avatar', label: 'Avatar' },
    { key: 'Outro', label: 'Outro' },
];
// Pessoas: só Masculino ou Feminino (decisão do PAF). "neutral" fica só para a categoria Outro.
const GENDERS = [
    { key: 'male', label: 'Masculino' },
    { key: 'female', label: 'Feminino' },
];
const STYLES = [{ key: '3d', label: '3D' }, { key: 'real', label: 'Real' }];
const PROMPT_MAX = 4000;

const toast = (message, type = 'success') => window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type } }));
const targetOf = (category) => (TARGETS.some(t => t.key === category) ? category : category === '3D' ? 'Avatar' : 'Outro');

const ImageFormModal = ({ isOpen, onClose, image = null, exercises = [], dishes = [], onSaved, onGenerate, onCreateWithBenfit }) => {
    const editing = Boolean(image?.id);
    const [target, setTarget] = useState('exercicio');
    const [itemId, setItemId] = useState('');
    const [name, setName] = useState('');
    const [gender, setGender] = useState('');
    const [mealType, setMealType] = useState('');
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [active, setActive] = useState(true);
    const [source, setSource] = useState('ia');
    const [file, setFile] = useState({ url: '', path: '' });
    const [uploading, setUploading] = useState(false);
    const [useOnItem, setUseOnItem] = useState(true);
    const [prompt, setPrompt] = useState('');
    const [promptLoading, setPromptLoading] = useState(false);
    const [promptVersion, setPromptVersion] = useState(0);
    const [saving, setSaving] = useState(false);
    const [generatingFree, setGeneratingFree] = useState(false);
    const freeRunRef = useRef(0);

    useEffect(() => {
        if (!isOpen) return;
        setTarget(image ? targetOf(image.category) : 'exercicio');
        setItemId('');
        setName(image?.name || '');
        const isMeal = MEAL_TYPES.some(m => m.key === image?.gender);
        setGender(GENDERS.some(g => g.key === image?.gender) ? image.gender : '');
        setMealType(isMeal ? image.gender : '');
        setTags(image?.tags || []);
        setTagInput('');
        setActive(image ? image.is_active !== false : true);
        setSource(image ? 'arquivo' : 'ia');
        setFile({ url: image?.public_url || '', path: image?.storage_path || '' });
        setUseOnItem(true);
        setPrompt('');
        setGeneratingFree(false);
        freeRunRef.current += 1;
    }, [isOpen, image]);

    const isItem = target === 'exercicio' || target === 'prato';
    const isDish = target === 'prato';
    const entityType = isDish ? 'dish' : 'exercise';
    const items = isDish ? dishes : exercises;
    const item = useMemo(() => items.find(i => i.id === itemId), [items, itemId]);
    const canGenerate = !editing;
    const usingAi = canGenerate && isItem && source === 'ia';
    const freeAi = canGenerate && !isItem && source === 'ia';
    const freeEntity = target === 'Avatar' ? 'avatar' : 'other';
    const style = STYLES.find(s => tags.includes(s.key))?.key || '';

    const changeTarget = (key) => {
        setTarget(key);
        setItemId('');
        setFile({ url: '', path: '' });
    };

    // Escolher o item preenche o nome e, no prato, a refeição.
    const pickItem = (id) => {
        setItemId(id);
        const picked = items.find(i => i.id === id);
        if (picked) {
            setName(picked.name);
            if (isDish && picked.meal_type) setMealType(picked.meal_type);
        }
    };

    // Descrição padrão da IA para o item escolhido, já em português, para editar.
    useEffect(() => {
        if (!usingAi || !itemId) { setPrompt(''); return undefined; }
        let alive = true;
        setPromptLoading(true);
        // Sem resposta do servidor, fica ao menos um texto básico para revisar.
        const fallback = () => {
            const picked = items.find(i => i.id === itemId);
            return isDish
                ? `Foto de comida do prato "${picked?.name || ''}", no mesmo estilo das outras fotos de pratos do Benfit: prato bem servido, vista de cima em ângulo de 45 graus, fundo claro, luz natural suave. Sem texto, sem logotipos.`
                : `Imagem do exercício "${picked?.name || ''}", no mesmo estilo das outras imagens de exercícios do Benfit: render 3D realista, fundo branco puro, músculos trabalhados em vermelho, corpo inteiro no quadro. Sem texto, sem logotipos.`;
        };
        getDefaultPrompt(itemId, 'image', entityType)
            .then(text => { if (alive) setPrompt(text || fallback()); })
            .catch(() => { if (alive) setPrompt(fallback()); })
            .finally(() => { if (alive) setPromptLoading(false); });
        return () => { alive = false; };
        // items fica fora: a lista recarrega e não deve apagar o texto editado.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [usingAi, itemId, entityType, promptVersion]);

    // Avatar: descrição a partir dos outros avatares (gênero e estilo). Outro: exemplo para trocar.
    useEffect(() => {
        if (!freeAi) return undefined;
        let alive = true;
        setPromptLoading(true);
        getFreePrompt(freeEntity, { gender: gender || 'female', style: style || '3d' })
            .then(text => { if (alive) setPrompt(text || ''); })
            .catch(err => { if (alive) toast(`Não foi possível montar a descrição: ${err.message}`, 'error'); })
            .finally(() => { if (alive) setPromptLoading(false); });
        return () => { alive = false; };
    }, [freeAi, freeEntity, gender, style, promptVersion]);

    const generateFree = async () => {
        const run = ++freeRunRef.current;
        setGeneratingFree(true);
        try {
            const result = await generateFreeImage(freeEntity, prompt.trim(), { gender: gender || 'female', style: style || '3d' });
            if (run !== freeRunRef.current) {
                // Cancelada: o arquivo gerado não fica sobrando no Storage.
                await supabase.storage.from('benfit-assets').remove([result.path]).catch(() => {});
                return;
            }
            setFile({ url: result.url, path: result.path });
            setTags(prev => (prev.includes('ia') ? prev : [...prev, 'ia']));
            if (target === 'Avatar' && !style) setStyle('3d');
        } catch (err) {
            if (run === freeRunRef.current) toast(err.message, 'error');
        } finally {
            if (run === freeRunRef.current) setGeneratingFree(false);
        }
    };

    const close = () => {
        if (generatingFree) {
            freeRunRef.current += 1;
            setGeneratingFree(false);
            toast('Geração cancelada.');
        }
        onClose();
    };

    const upload = async (e) => {
        const picked = e.target.files?.[0];
        e.target.value = '';
        if (!picked) return;
        if (!['image/png', 'image/jpeg', 'image/jpg'].includes(picked.type)) {
            toast('Escolha um arquivo PNG ou JPG.', 'error');
            return;
        }
        setUploading(true);
        try {
            const resized = await resizeImageFile(picked);
            if (resized.size > 5 * 1024 * 1024) throw new Error('A imagem passa de 5 MB mesmo depois de reduzida.');
            const ext = resized.name.split('.').pop();
            const path = `avatars/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
            const { error } = await supabase.storage.from('benfit-assets').upload(path, resized, { cacheControl: '3600', upsert: false });
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('benfit-assets').getPublicUrl(path);
            setFile({ url: publicUrl, path });
        } catch (err) {
            toast(`Não foi possível enviar: ${err.message}`, 'error');
        } finally {
            setUploading(false);
        }
    };

    const addTag = (e) => {
        if (e.key !== 'Enter' || !tagInput.trim()) return;
        e.preventDefault();
        const tag = tagInput.trim();
        setTags(prev => (prev.includes(tag) ? prev : [...prev, tag]));
        setTagInput('');
    };
    const setStyle = (key) => setTags(prev => [...prev.filter(t => !STYLES.some(s => s.key === t)), ...(key && key !== style ? [key] : [])]);

    const save = async () => {
        if (freeAi && !file.url) {
            generateFree();
            return;
        }
        if (usingAi) {
            onGenerate?.('image', itemId, prompt.trim(), entityType);
            onClose();
            return;
        }
        setSaving(true);
        try {
            const data = {
                name: name.trim(),
                // Na edição, categoria antiga (3D, Hero...) fica como está se o tipo não mudou.
                category: editing && targetOf(image.category) === target ? image.category : target,
                gender: isDish ? (mealType || null) : target === 'Outro' ? 'neutral' : gender,
                tags,
                is_active: active,
                public_url: file.url,
                storage_path: file.path,
            };
            if (editing) await supabaseHelpers.updateAvatar(image.id, data);
            else await supabaseHelpers.createAvatar(data);
            if (!editing && item && useOnItem) {
                const { error } = await supabase.from(isDish ? 'b_dishes' : 'b_exercises').update({ image_url: file.url }).eq('id', item.id);
                if (error) throw error;
            }
            window.dispatchEvent(new Event('avatars-updated'));
            toast(editing ? 'Imagem atualizada.' : 'Imagem adicionada à Biblioteca.');
            onSaved?.();
            onClose();
        } catch (err) {
            toast(`Não foi possível salvar: ${err.message}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    const needsGender = !isDish && target !== 'Outro';
    const ready = usingAi
        ? Boolean(itemId) && !promptLoading && prompt.trim().length > 0
        : freeAi && !file.url
            ? !promptLoading && !generatingFree && prompt.trim().length > 0 && (!needsGender || Boolean(gender))
        : Boolean(name.trim() && file.url) && !uploading && (!isItem || editing || Boolean(itemId))
            && (isDish || target === 'Outro' || Boolean(gender));

    return (
        <Modal isOpen={isOpen} onClose={close} title={editing ? 'Editar imagem' : 'Nova imagem'} size="full">
            <div className="imf">
                <section className="imf-block">
                    <span className="imf-label">Categoria</span>
                    <div className="am-kind-tabs imf-targets" role="radiogroup" aria-label="Categoria">
                        {TARGETS.map(t => (
                            <button key={t.key} type="button" role="radio" aria-checked={target === t.key}
                                className={target === t.key ? 'is-active' : ''} onClick={() => changeTarget(t.key)}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                </section>

                {isItem && !editing && (
                    <section className="imf-block">
                        <span className="imf-label">{isDish ? 'Prato' : 'Exercício'}</span>
                        <SearchableExerciseSelect
                            key={target}
                            exercises={items}
                            value={itemId}
                            onChange={pickItem}
                            placeholder={isDish ? 'Escolha o prato' : 'Escolha o exercício'}
                            emptyLabel={isDish ? 'Nenhum prato encontrado.' : 'Nenhum exercício encontrado.'}
                            onCreateNew={(term) => { onCreateWithBenfit?.(term, entityType); close(); }}
                            createLabel={(term) => `Criar "${term}" com o Benfit`}
                        />
                        <p className="am-hint">Não achou? Digite o nome e toque em "Criar com o Benfit": ele cadastra e já gera a imagem.</p>
                    </section>
                )}

                {!usingAi && (
                    <section className="imf-block">
                        <label className="imf-label" htmlFor="imf-name">Nome da imagem</label>
                        <input id="imf-name" className="imf-input" value={name} maxLength={120} onChange={(e) => setName(e.target.value)}
                            placeholder={isDish ? 'Ex.: Wrap de atum' : target === 'Avatar' ? 'Ex.: Ana sorrindo' : target === 'Outro' ? 'Ex.: Garrafa de água' : 'Ex.: Agachamento livre'} />
                    </section>
                )}

                {isDish ? (
                    <section className="imf-block">
                        <span className="imf-label">Tipo</span>
                        <div className="imf-chips" role="radiogroup" aria-label="Tipo">
                            {MEAL_TYPES.map(m => (
                                <button key={m.key} type="button" role="radio" aria-checked={mealType === m.key}
                                    className={mealType === m.key ? 'is-active' : ''} onClick={() => setMealType(m.key)}>
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </section>
                ) : target !== 'Outro' && !usingAi && (
                    <section className="imf-block">
                        <span className="imf-label">Tipo</span>
                        <div className="imf-chips" role="radiogroup" aria-label="Tipo">
                            {GENDERS.map(g => (
                                <button key={g.key} type="button" role="radio" aria-checked={gender === g.key}
                                    className={gender === g.key ? 'is-active' : ''} onClick={() => setGender(g.key)}>
                                    {g.label}
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {target === 'Avatar' && (
                    <section className="imf-block">
                        <span className="imf-label">Estilo</span>
                        <div className="imf-chips" role="radiogroup" aria-label="Estilo">
                            {STYLES.map(s => (
                                <button key={s.key} type="button" role="radio" aria-checked={style === s.key}
                                    className={style === s.key ? 'is-active' : ''} onClick={() => setStyle(s.key)}>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {canGenerate && (
                    <section className="imf-block">
                        <span className="imf-label">De onde vem a imagem</span>
                        <div className="am-kind-tabs imf-source" role="radiogroup" aria-label="Origem">
                            <button type="button" role="radio" aria-checked={source === 'ia'} className={source === 'ia' ? 'is-active' : ''} onClick={() => setSource('ia')}>
                                <Sparkles size={15} /> Gerar com IA
                            </button>
                            <button type="button" role="radio" aria-checked={source === 'arquivo'} className={source === 'arquivo' ? 'is-active' : ''} onClick={() => setSource('arquivo')}>
                                <Upload size={15} /> Enviar arquivo
                            </button>
                        </div>
                    </section>
                )}

                {item && (
                    <figure className={`am-current${(isDish ? item.image_url : exerciseImageUrl(item)) ? ' is-large' : ''}`}>
                        {(isDish ? item.image_url : exerciseImageUrl(item))
                            ? <img src={isDish ? item.image_url : exerciseImageUrl(item)} alt="" />
                            : <span className="am-current-empty"><ImageIcon size={22} /></span>}
                        <figcaption>
                            <strong>Imagem atual</strong>
                            <span>{(isDish ? item.image_url : exerciseImageUrl(item)) ? item.name : 'Ainda sem imagem'}</span>
                        </figcaption>
                    </figure>
                )}

                {(usingAi || freeAi) && (
                    usingAi && !itemId ? (
                        <p className="am-hint imf-pick-hint">
                            Escolha o {isDish ? 'prato' : 'exercício'} acima para montar a descrição da IA, que você revisa antes de gerar.
                        </p>
                    ) : (
                        <section className="am-adjust">
                            <div className="am-prompt-head">
                                <label htmlFor="imf-prompt">
                                    {freeAi && target === 'Outro' ? 'Descreva a imagem (troque o exemplo)' : 'Descrição para a IA (edite o que quiser)'}
                                </label>
                                <button type="button" className="am-link" disabled={promptLoading || generatingFree} onClick={() => setPromptVersion(v => v + 1)}>
                                    <RotateCcw size={13} /> Restaurar
                                </button>
                            </div>
                            <textarea id="imf-prompt" rows={8} maxLength={PROMPT_MAX} disabled={promptLoading || generatingFree}
                                value={promptLoading ? 'Montando a descrição…' : prompt} onChange={(e) => setPrompt(e.target.value)} />
                            <p className="am-hint">
                                A descrição é traduzida para o inglês na hora de gerar.{' '}
                                {usingAi ? 'A imagem entra em Aprovar.'
                                    : target === 'Avatar' ? 'Os outros avatares do mesmo tipo e estilo vão como referência. A prévia aparece aqui antes de salvar.'
                                        : 'A prévia aparece aqui antes de salvar.'}
                            </p>
                        </section>
                    )
                )}

                {freeAi && (generatingFree || file.url) && (
                    <section className="imf-block">
                        <span className="imf-label">Prévia</span>
                        <div className={`imf-drop imf-preview ${generatingFree ? 'is-busy' : ''}`}>
                            {generatingFree
                                ? <span className="imf-drop-empty"><Loader2 size={22} className="animate-spin" /></span>
                                : <img src={file.url} alt="" />}
                            <span className="imf-drop-text">{generatingFree ? 'Gerando a imagem… leva uns 20 segundos.' : 'Gostou? Salve na Biblioteca.'}</span>
                        </div>
                        {!generatingFree && (
                            <button type="button" className="am-link imf-regen" onClick={generateFree} disabled={!prompt.trim()}>
                                <Sparkles size={13} /> Gerar novamente
                            </button>
                        )}
                    </section>
                )}

                {!usingAi && !freeAi && (
                    <section className="imf-block">
                        <span className="imf-label">Arquivo</span>
                        <label className={`imf-drop ${uploading ? 'is-busy' : ''}`}>
                            <input type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" onChange={upload} disabled={uploading} />
                            {file.url
                                ? <img src={file.url} alt="" />
                                : <span className="imf-drop-empty">{uploading ? <Loader2 size={22} className="animate-spin" /> : <ImageIcon size={26} />}</span>}
                            <span className="imf-drop-text">{uploading ? 'Enviando…' : file.url ? 'Trocar arquivo' : 'Escolher PNG ou JPG'}</span>
                        </label>
                        <label className="imf-label imf-url-label" htmlFor="imf-url">Ou cole o link (URL) da imagem</label>
                        <input id="imf-url" type="url" className="imf-input" placeholder="https://..." value={file.url}
                            onChange={(e) => setFile({ url: e.target.value.trim(), path: '' })} />
                        {!editing && item && (
                            <label className="imf-check">
                                <input type="checkbox" checked={useOnItem} onChange={(e) => setUseOnItem(e.target.checked)} />
                                Usar no {isDish ? 'prato' : 'exercício'} "{item.name}"
                            </label>
                        )}
                    </section>
                )}

                {!usingAi && (
                    <details className="imf-more">
                        <summary><ChevronDown size={14} /> Mais opções</summary>
                        <div className="imf-block">
                            <span className="imf-label">Tags</span>
                            <div className="imf-tags">
                                {tags.map(tag => (
                                    <span key={tag} className="imf-tag">
                                        {tag}
                                        <button type="button" onClick={() => setTags(prev => prev.filter(t => t !== tag))} aria-label={`Tirar ${tag}`}><X size={12} /></button>
                                    </span>
                                ))}
                                <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={addTag} placeholder="Digite e tecle Enter" />
                            </div>
                        </div>
                        <div className="am-switch-row imf-active">
                            <div>
                                <strong>Ativa</strong>
                                <p>Imagens inativas não aparecem para escolher.</p>
                            </div>
                            <button type="button" role="switch" aria-checked={active} aria-label="Ativa"
                                className={`am-switch ${active ? 'is-on' : ''}`} onClick={() => setActive(v => !v)}>
                                <span />
                            </button>
                        </div>
                    </details>
                )}

                <div className="imf-footer">
                    <button type="button" className="am-btn" onClick={close} disabled={saving}>Cancelar</button>
                    <button type="button" className="am-btn am-btn-primary" onClick={save} disabled={!ready || saving}>
                        {saving || generatingFree ? <Loader2 size={16} className="animate-spin" /> : usingAi || (freeAi && !file.url) ? <Sparkles size={16} /> : null}
                        {usingAi || (freeAi && !file.url) ? (generatingFree ? 'Gerando…' : 'Gerar imagem') : editing ? 'Salvar' : 'Adicionar à Biblioteca'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ImageFormModal;
