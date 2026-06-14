import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Trash2, Plus, BookOpen, Filter, X, ChevronDown, Pencil, Check } from 'lucide-react';
import { supabaseHelpers } from '../lib/supabase';
import { generateEmbedding } from '../services/ai';
import { useUserRole } from '../hooks/useSupabase';
import './SharedKnowledge.css';

// Renderiza markdown simples (igual ao AICoach)
const renderText = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
        const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('• ');
        const content = isBullet ? line.trim().substring(2) : line;
        if (!content.trim()) return <div key={i} style={{ height: '0.3rem' }} />;
        return (
            <div key={i} style={{ marginBottom: isBullet ? '0.15rem' : '0.25rem', display: 'flex', alignItems: 'flex-start' }}>
                {isBullet && <span style={{ marginRight: '0.4rem', color: 'var(--color-primary)', flexShrink: 0 }}>•</span>}
                <span>
                    {content.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                        part.startsWith('**') && part.endsWith('**')
                            ? <strong key={j}>{part.slice(2, -2)}</strong>
                            : part
                    )}
                </span>
            </div>
        );
    });
};

const KNOWLEDGE_TYPES = [
    { value: '', label: 'Todos os tipos' },
    { value: 'exercise', label: 'Exercício' },
    { value: 'fitness_tip', label: 'Dica fitness' },
    { value: 'workout_template', label: 'Template de treino' },
    { value: 'faq', label: 'FAQ' },
];

const TYPE_LABELS = {
    exercise: 'Exercício',
    fitness_tip: 'Dica fitness',
    workout_template: 'Template de treino',
    faq: 'FAQ',
};

const TYPE_COLORS = {
    exercise:         { bg: 'rgba(3, 78, 162, 0.08)', color: 'var(--color-primary)', border: 'rgba(3, 78, 162, 0.2)' },
    fitness_tip:      { bg: '#F0FDF4', color: '#16A34A', border: '#86EFAC' },
    workout_template: { bg: '#FFF7ED', color: '#EA580C', border: '#FED7AA' },
    faq:              { bg: 'rgba(0, 138, 207, 0.08)', color: 'var(--color-secondary)', border: 'rgba(0, 138, 207, 0.2)' },
};

const SharedKnowledge = () => {
    const navigate = useNavigate();
    const { role, isAdmin, isPersonal, loading: roleLoading } = useUserRole();
    const canAccess = isAdmin || isPersonal;

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [saving, setSaving] = useState(false);

    // Estado de edição inline
    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [editType, setEditType] = useState('');
    const [editSaving, setEditSaving] = useState(false);

    const [newItem, setNewItem] = useState({
        knowledge_type: 'fitness_tip',
        content: '',
    });

    useEffect(() => {
        if (!roleLoading && !canAccess) navigate('/perfil');
    }, [roleLoading, canAccess, navigate]);

    // ESC: fecha edição em andamento, senão volta para o perfil
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') {
                if (editingId) {
                    setEditingId(null);
                } else if (showAddForm) {
                    setShowAddForm(false);
                } else {
                    navigate(-1);
                }
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [navigate, editingId, showAddForm]);

    useEffect(() => {
        if (canAccess) fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canAccess, search, typeFilter]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const data = await supabaseHelpers.listSharedKnowledge({
                type: typeFilter || undefined,
                search: search.trim() || undefined,
            });
            setItems(data || []);
        } catch (e) {
            console.error('[SharedKnowledge] Erro ao buscar:', e?.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newItem.content.trim()) return;
        setSaving(true);
        try {
            const embedding = await generateEmbedding(newItem.content);
            await supabaseHelpers.addSharedKnowledge({
                knowledge_type: newItem.knowledge_type,
                content: newItem.content.slice(0, 2000),
                metadata: {
                    added_by: role,
                    added_at: new Date().toISOString(),
                    source: 'manual',
                },
                embedding,
            });
            setNewItem({ knowledge_type: 'fitness_tip', content: '' });
            setShowAddForm(false);
            window.dispatchEvent(new CustomEvent('app-toast', {
                detail: { message: 'Conhecimento adicionado com sucesso!', type: 'success' }
            }));
            fetchItems();
        } catch (e) {
            console.error('[SharedKnowledge] Erro ao adicionar:', e?.message);
            window.dispatchEvent(new CustomEvent('app-toast', {
                detail: { message: 'Erro ao adicionar. Tente novamente.', type: 'error' }
            }));
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (item) => {
        setEditingId(item.id);
        setEditContent(item.content);
        setEditType(item.knowledge_type);
        setShowAddForm(false);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditContent('');
        setEditType('');
    };

    const handleSaveEdit = async (id) => {
        if (!editContent.trim()) return;
        setEditSaving(true);
        try {
            const embedding = await generateEmbedding(editContent);
            const updated = await supabaseHelpers.updateSharedKnowledge(id, {
                content: editContent.slice(0, 2000),
                knowledge_type: editType,
                embedding,
            });
            setItems(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i));
            setEditingId(null);
            window.dispatchEvent(new CustomEvent('app-toast', {
                detail: { message: 'Item atualizado com sucesso!', type: 'success' }
            }));
        } catch (e) {
            console.error('[SharedKnowledge] Erro ao editar:', e?.message);
            window.dispatchEvent(new CustomEvent('app-toast', {
                detail: { message: 'Erro ao salvar edição.', type: 'error' }
            }));
        } finally {
            setEditSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Excluir este item da base de conhecimento?')) return;
        setDeletingId(id);
        try {
            await supabaseHelpers.deleteSharedKnowledge(id);
            setItems(prev => prev.filter(i => i.id !== id));
            window.dispatchEvent(new CustomEvent('app-toast', {
                detail: { message: 'Item excluído.', type: 'info' }
            }));
        } catch (e) {
            console.error('[SharedKnowledge] Erro ao excluir:', e?.message);
            window.dispatchEvent(new CustomEvent('app-toast', {
                detail: { message: 'Erro ao excluir.', type: 'error' }
            }));
        } finally {
            setDeletingId(null);
        }
    };

    const fmtDate = (iso) => new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'short', year: '2-digit'
    });

    if (roleLoading) return null;
    if (!canAccess) return null;

    return (
        <div className="sk-page">
            {/* Header */}
            <div className="sk-header">
                <button className="sk-back-btn" onClick={() => navigate(-1)} aria-label="Voltar">
                    <ArrowLeft size={20} />
                </button>
                <div className="sk-header-title-group">
                    <BookOpen size={18} />
                    <span>Base de Conhecimento</span>
                </div>
                <button
                    className="sk-add-btn"
                    onClick={() => { setShowAddForm(prev => !prev); setEditingId(null); }}
                    aria-label="Adicionar conhecimento"
                    data-tooltip="Adicionar"
                >
                    {showAddForm ? <X size={18} /> : <Plus size={18} />}
                </button>
            </div>

            {/* Formulário de adição */}
            {showAddForm && (
                <form className="sk-add-form" onSubmit={handleAdd}>
                    <div className="sk-form-row">
                        <label className="sk-form-label">Tipo</label>
                        <div className="sk-select-wrapper">
                            <select
                                className="sk-select"
                                value={newItem.knowledge_type}
                                onChange={e => setNewItem(prev => ({ ...prev, knowledge_type: e.target.value }))}
                            >
                                {KNOWLEDGE_TYPES.filter(t => t.value).map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="sk-select-icon" />
                        </div>
                    </div>
                    <div className="sk-form-row">
                        <label className="sk-form-label">Conteúdo</label>
                        <textarea
                            className="sk-textarea"
                            rows={4}
                            placeholder="Descreva o conhecimento para ser usado pelo Benfit Coach..."
                            value={newItem.content}
                            onChange={e => setNewItem(prev => ({ ...prev, content: e.target.value }))}
                            required
                        />
                    </div>
                    <div className="sk-form-hint">
                        Este texto será embedado e usado como contexto nas respostas do Coach.
                    </div>
                    <div className="sk-form-actions">
                        <button type="button" className="sk-cancel-btn" onClick={() => setShowAddForm(false)}>
                            Cancelar
                        </button>
                        <button type="submit" className="sk-submit-btn" disabled={saving || !newItem.content.trim()}>
                            {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </form>
            )}

            {/* Filtros */}
            <div className="sk-filters">
                <div className="sk-search-wrapper">
                    <Search size={14} className="sk-search-icon" />
                    <input
                        className="sk-search-input"
                        type="text"
                        placeholder="Buscar no conteúdo..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className="sk-search-clear" onClick={() => setSearch('')}>
                            <X size={12} />
                        </button>
                    )}
                </div>
                <div className="sk-type-filter-wrapper">
                    <Filter size={13} className="sk-filter-icon" />
                    <select
                        className="sk-type-filter"
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value)}
                    >
                        {KNOWLEDGE_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Contagem */}
            <div className="sk-count">
                {loading ? 'Carregando...' : `${items.length} item${items.length !== 1 ? 's' : ''}`}
            </div>

            {/* Lista */}
            <div className="sk-list">
                {!loading && items.length === 0 && (
                    <div className="sk-empty">
                        <BookOpen size={32} />
                        <p>Nenhum item encontrado.</p>
                        <p>Use o botão + para adicionar conhecimento ao Coach.</p>
                    </div>
                )}

                {items.map(item => {
                    const isEditing = editingId === item.id;
                    const colors = TYPE_COLORS[item.knowledge_type] || TYPE_COLORS.fitness_tip;
                    return (
                        <div key={item.id} className={`sk-item ${isEditing ? 'editing' : ''}`}>
                            <div className="sk-item-header">
                                {isEditing ? (
                                    <div className="sk-select-wrapper" style={{ flex: 1 }}>
                                        <select
                                            className="sk-select sk-select-inline"
                                            value={editType}
                                            onChange={e => setEditType(e.target.value)}
                                        >
                                            {KNOWLEDGE_TYPES.filter(t => t.value).map(t => (
                                                <option key={t.value} value={t.value}>{t.label}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={12} className="sk-select-icon" />
                                    </div>
                                ) : (
                                    <span
                                        className="sk-type-badge"
                                        style={{ background: colors.bg, color: colors.color, borderColor: colors.border }}
                                    >
                                        {TYPE_LABELS[item.knowledge_type] || item.knowledge_type}
                                    </span>
                                )}
                                <span className="sk-item-date">{fmtDate(item.created_at)}</span>
                                {isEditing ? (
                                    <>
                                        <button
                                            className="sk-edit-save-btn"
                                            onClick={() => handleSaveEdit(item.id)}
                                            disabled={editSaving || !editContent.trim()}
                                            aria-label="Salvar edição"
                                            data-tooltip="Salvar"
                                        >
                                            {editSaving ? '...' : <Check size={13} />}
                                        </button>
                                        <button
                                            className="sk-delete-btn"
                                            onClick={cancelEdit}
                                            aria-label="Cancelar edição"
                                            data-tooltip="Cancelar"
                                        >
                                            <X size={13} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            className="sk-edit-btn"
                                            onClick={() => startEdit(item)}
                                            aria-label="Editar"
                                            data-tooltip="Editar"
                                        >
                                            <Pencil size={13} />
                                        </button>
                                        <button
                                            className="sk-delete-btn"
                                            onClick={() => handleDelete(item.id)}
                                            disabled={deletingId === item.id}
                                            aria-label="Excluir"
                                            data-tooltip="Excluir"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </>
                                )}
                            </div>

                            {isEditing ? (
                                <textarea
                                    className="sk-textarea sk-edit-textarea"
                                    value={editContent}
                                    onChange={e => setEditContent(e.target.value)}
                                    autoFocus
                                    ref={el => {
                                        if (el) {
                                            el.style.height = 'auto';
                                            el.style.height = el.scrollHeight + 'px';
                                        }
                                    }}
                                    onInput={e => {
                                        e.target.style.height = 'auto';
                                        e.target.style.height = e.target.scrollHeight + 'px';
                                    }}
                                />
                            ) : (
                                <div className="sk-item-content">{renderText(item.content)}</div>
                            )}

                            {!isEditing && item.metadata?.shared_by && (
                                <div className="sk-item-meta">
                                    Compartilhado por: {item.metadata.shared_by}
                                    {item.metadata.source === 'coach_chat' ? ' (via chat)' : ''}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SharedKnowledge;
