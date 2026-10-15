import { Loader2, Clock, CheckCircle2, AlertTriangle, Film } from 'lucide-react';
import './ChatMediaCard.css';

// Mídia gerada pelo Benfit dentro da conversa: mostra o resultado na hora e
// deixa claro se ainda precisa de aprovação em Mídias Benfit.
const KIND_LABELS = { image: 'Imagem', poses: 'Poses', video: 'Vídeo' };

const statusInfo = (media) => {
    if (media.status === 'falhou') return { tone: 'error', icon: AlertTriangle, text: media.error || 'Não foi possível gerar. Tente de novo pedindo ao Benfit.' };
    if (media.status === 'gerando') {
        return media.kind === 'video'
            ? { tone: 'wait', icon: Film, text: 'Vídeo em produção. Ele leva alguns minutos e vai para aprovação em Mídias Benfit.' }
            : { tone: 'wait', icon: Loader2, spin: true, text: 'Gerando…' };
    }
    if (media.status === 'aprovada') return { tone: 'ok', icon: CheckCircle2, text: 'Publicada. Já aparece para todos.' };
    if (media.status === 'rejeitada') return { tone: 'error', icon: AlertTriangle, text: 'Rejeitada na revisão. Peça outra ao Benfit se quiser.' };
    if (media.status === 'removida') return { tone: 'error', icon: AlertTriangle, text: 'Esta mídia não está mais disponível.' };
    return { tone: 'wait', icon: Clock, text: 'Aguardando aprovação. Ela só aparece no app depois que um administrador aprovar em Mídias Benfit.' };
};

const ChatMediaCard = ({ media }) => {
    const label = `${KIND_LABELS[media.kind] || 'Mídia'} de ${media.name}`;
    const info = statusInfo(media);
    const Icon = info.icon;
    const frames = media.kind === 'poses' ? (media.frames || []) : [];

    return (
        <div className="chat-media-card">
            <p className="chat-media-title">{label}</p>
            {media.kind === 'image' && media.url && (
                <img className="chat-media-image" src={media.url} alt={label} loading="lazy" />
            )}
            {frames.length > 0 && (
                <div className="chat-media-frames">
                    {frames.map((url, i) => (
                        <figure key={url}>
                            <img src={url} alt={`${label}, ${i === 0 ? 'início' : 'fim'}`} loading="lazy" />
                            <figcaption>{i === 0 ? 'Início' : 'Fim'}</figcaption>
                        </figure>
                    ))}
                </div>
            )}
            {media.kind === 'video' && media.url && (
                <video className="chat-media-image" src={media.url} autoPlay loop muted playsInline />
            )}
            {media.status === 'gerando' && media.kind !== 'video' && (
                <div className="chat-media-placeholder"><Loader2 size={20} className="animate-spin" /></div>
            )}
            <p className={`chat-media-status is-${info.tone}`}>
                <Icon size={14} className={info.spin ? 'animate-spin' : ''} />
                <span>{info.text}</span>
            </p>
        </div>
    );
};

export default ChatMediaCard;
