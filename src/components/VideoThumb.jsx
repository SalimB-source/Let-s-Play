import React, { useEffect, useRef, useState } from 'react';
import { createThumbFallback, isThumbMissing } from '../lib/videoThumbnails';

/**
 * Vignette d'une vidéo YouTube, avec repli.
 *
 * Le site affiche les miniatures publiques YouTube (`i.ytimg.com/vi/<id>/…`),
 * mais YouTube ne publie pas `maxresdefault.jpg` pour toutes les vidéos :
 * l'URL répond alors 404 et la carte restait vide. Cet afficheur descend
 * l'échelle des qualités (maxres → sd → hq) et, si aucune ne répond, dessine un
 * cadre Let's Play à la place — la grille ne présente jamais de trou.
 *
 * Le repli passe par deux chemins, parce qu'un seul ne suffit pas :
 *
 *   - `onError`, le cas nominal ;
 *   - `isThumbMissing()` après chaque rendu : un 404 servi depuis le cache du
 *     navigateur peut se régler avant que React n'attache l'écouteur, et
 *     l'événement `error` est alors perdu pour de bon.
 *
 * La logique de repli elle-même vit dans `src/lib/videoThumbnails.js`
 * (`createThumbFallback`) ; ce composant n'est que son afficheur. Les vidéos
 * connues sans miniature HD y sont listées (`VIDEOS_WITHOUT_HD_THUMB`) et
 * démarrent directement sur `hqdefault`, sans requête vouée au 404.
 *
 * @param {object} props
 * @param {string} props.id identifiant de la vidéo YouTube
 * @param {string} [props.quality] qualité de départ (`maxres`/`sd`/`hq`) — par
 *   défaut la meilleure disponible pour cette vidéo
 * @param {string|string[]} [props.lead] illustration(s) locale(s) essayée(s)
 *   avant l'échelle YouTube — la miniature maison d'un quizz, par exemple :
 *   l'épisode lié n'est alors qu'un repli
 * @param {string} [props.alt] texte alternatif de l'image
 * @param {string} [props.fallbackLabel] libellé affiché dans le cadre de repli
 */
export default function VideoThumb({ id, quality, lead, alt = '', fallbackLabel, className, ...rest }) {
  const imgRef = useRef(null);
  const fallbackRef = useRef(null);
  const [, redraw] = useState(0);

  // Le pilote est recréé dès que la vidéo, la qualité demandée ou
  // l'illustration locale de tête change.
  const leadKey = (Array.isArray(lead) ? lead : [lead]).filter(Boolean).join('|');
  if (
    !fallbackRef.current ||
    fallbackRef.current.id !== id ||
    fallbackRef.current.quality !== (quality ?? null) ||
    fallbackRef.current.lead.join('|') !== leadKey
  ) {
    fallbackRef.current = createThumbFallback(id, {
      quality,
      lead,
      onChange: () => redraw((tick) => tick + 1),
    });
  }
  const thumb = fallbackRef.current;

  useEffect(() => {
    const img = imgRef.current;
    if (!img || thumb.failed) return;
    if (isThumbMissing(img)) thumb.reportMissing();
  }, [thumb, thumb.src, thumb.failed]);

  if (thumb.failed) {
    const classes = className ? `video-thumb-fallback ${className}` : 'video-thumb-fallback';
    return (
      <span className={classes} role="img" aria-label={alt || fallbackLabel || 'Let’s Play'}>
        <span className="video-thumb-fallback-mark" aria-hidden="true">▶</span>
        <span className="video-thumb-fallback-label">{fallbackLabel || 'LET’S PLAY'}</span>
      </span>
    );
  }

  return (
    <img
      ref={imgRef}
      className={className}
      src={thumb.src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => thumb.reportMissing()}
      {...rest}
    />
  );
}
