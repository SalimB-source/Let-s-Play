import React from 'react';
import { partnerByTag, arenaLaunchSource } from '../partnersData';
import PartnerMark from './PartnerMark';
import { useLanguage } from '../i18n/LanguageContext';

/**
 * 7ouma Arena — bloc d'explication affiché en tête de la page Events
 * (`/events` et `/partenaires`).
 *
 * Le rendez-vous cumule deux formats qu'il faut distinguer pour être clair :
 *   — une émission (show YouTube) présentée par Djezzy ;
 *   — un tournoi esport organisé par EGOR Gaming avec l'équipe Let's Play.
 *
 * La section déroule donc : ce que c'est (hero + « by Djezzy »), les deux
 * formats, qui fait quoi, puis le déroulé de l'émission et le statut
 * documentaire des informations affichées.
 */

const base = import.meta.env.BASE_URL;

function Arrow({ external = false }) {
  return <span aria-hidden="true">{external ? '↗' : '→'}</span>;
}

const copy = {
  fr: {
    label: 'LE SHOW & LE TOURNOI', meta: 'ÉMISSION · TOURNOI · ESPORT DZ',
    eyebrow: 'Une arène, deux formats',
    titleA: '7OUMA', titleB: 'ARENA.',
    lead: '7ouma Arena est à la fois une émission et un tournoi. Deux formats réunis sous une même bannière — « by Djezzy » — et organisés par EGOR Gaming avec l’équipe Let’s Play.',
    text: 'D’un côté, un show diffusé sur YouTube : l’actualité du jeu vidéo, les sujets tech & innovation, puis les temps forts de la compétition. De l’autre, un vrai tournoi esport, monté par EGOR Gaming avec l’équipe Let’s Play, des inscriptions jusqu’aux finales — et raconté ensuite à l’antenne. La marque qui présente l’ensemble, c’est Djezzy, avec la 5G et le streaming comme terrain de jeu.',
    pills: ['ÉMISSION YOUTUBE', 'TOURNOI ESPORT', 'BY DJEZZY', 'ORGA EGOR × LET’S PLAY'],
    byLabel: 'Présenté par',
    byText: 'Le show et la compétition s’affichent « by Djezzy » : la marque donne son nom au rendez-vous et le relie à ses enjeux réseau — 5G, qualité du streaming, essor de l’esport.',
    byMeta: 'Marque présentatrice', byLink: 'djezzy.dz',
    showKicker: 'Format 01 — Émission', showTitle: 'LE SHOW',
    showText: 'Un plateau esport & mobile gaming diffusé sur YouTube. On y parle de l’actualité du jeu vidéo, de technologie et d’innovation, puis on y revoit les temps forts des tournois. L’ambition annoncée publiquement : structurer le récit de l’esport algérien aujourd’hui, et viser la télévision demain.',
    showFacts: ['Diffusion / YouTube', 'Présenté par / Djezzy', 'Séquences / Actus · Tech · Esport'],
    tournamentKicker: 'Format 02 — Compétition', tournamentTitle: 'LE TOURNOI',
    tournamentText: 'Le tournoi, lui, se joue sur le terrain. Les compétitions sont organisées par EGOR Gaming avec l’équipe Let’s Play : format, inscriptions, arbitrage et déroulé des matchs jusqu’aux finales. Les parties deviennent ensuite la matière du show — résumés, duels et temps forts à l’antenne.',
    tournamentFacts: ['Organisation / EGOR Gaming × équipe Let’s Play', 'Périmètre / Tournois esport', 'À l’écran / Temps forts du tournoi'],
    rolesLabel: 'LES RÔLES', rolesMeta: 'UNE MARQUE · DEUX ORGANISATEURS',
    rolesTitleA: 'QUI FAIT QUOI,', rolesTitleB: 'SUR 7OUMA ARENA.',
    rolesSide: 'Trois signatures sur un même rendez-vous : la marque qui présente, la structure esport qui organise la compétition, et l’équipe qui organise et raconte l’événement.',
    roles: [
      { id: 'djezzy', kicker: 'Marque présentatrice', title: 'Djezzy', text: 'Le show et la compétition s’affichent « by Djezzy » : c’est la marque qui présente le rendez-vous et le relie à ses enjeux réseau — 5G, streaming, professionnalisation de l’esport.' },
      { id: 'egor-gaming', kicker: 'Organisation des tournois', title: 'EGOR Gaming', text: 'Structure esport algérienne, EGOR Gaming monte et opère la compétition : formats, inscriptions, arbitrage et déroulé des matchs, avec ses équipes sur le terrain.' },
      { id: 'letsplay', kicker: 'Organisation & couverture', title: 'Équipe Let’s Play', text: 'L’équipe Let’s Play participe à l’organisation et raconte l’événement : tournage, interviews des joueurs et des organisateurs, contenus et diffusion des temps forts.' },
    ],
    howLabel: 'DANS L’ÉMISSION', howMeta: 'TROIS SÉQUENCES',
    howTitleA: 'TROIS TEMPS,', howTitleB: 'UN MÊME TERRAIN.',
    how: [
      { title: 'ACTUS GAMING', tag: 'Séquence 01', text: 'L’actualité du jeu vidéo et du mobile gaming ouvre l’épisode : sorties, mises à jour, ce qui bouge dans la scène locale.' },
      { title: 'TECH & INNOVATION', tag: 'Séquence 02', text: 'Réseau, matériel, création : la 5G de Djezzy, la qualité du streaming et la professionnalisation de l’esport algérien.' },
      { title: 'TEMPS FORTS ESPORT', tag: 'Séquence 03', text: 'Les tournois organisés par EGOR Gaming avec l’équipe Let’s Play reviennent en images, avec les joueurs et les duels du moment.' },
    ],
    proofLabel: 'SOURCES & STATUT', proofMeta: 'PUBLIC + ÉQUIPE LET’S PLAY',
    proofNote: 'Le format du show, sa diffusion YouTube, la présence de Djezzy comme marque présentatrice et l’organisation des tournois par EGOR Gaming sont documentés publiquement. La participation de l’équipe Let’s Play à l’organisation et à la couverture du rendez-vous est confirmée par l’équipe elle-même.',
    proofItems: [
      { label: 'Annonce du lancement — Samy Charif, host (EGOR Gaming)', meta: 'Émission YouTube, sponsorisée par Djezzy, tournois organisés par EGOR Gaming', url: arenaLaunchSource },
      { label: 'djezzy.dz', meta: 'Marque présentatrice du rendez-vous « by Djezzy »', url: 'https://www.djezzy.dz/' },
      { label: 'egorgaming.com', meta: 'Structure esport qui organise les tournois', url: 'https://egorgaming.com/' },
    ],
  },
  en: {
    label: 'THE SHOW & THE TOURNAMENT', meta: 'SHOW · TOURNAMENT · DZ ESPORT',
    eyebrow: 'One arena, two formats',
    titleA: '7OUMA', titleB: 'ARENA.',
    lead: '7ouma Arena is both a show and a tournament. Two formats under one banner — “by Djezzy” — organised by EGOR Gaming with the Let’s Play team.',
    text: 'On one side, a show on YouTube: gaming news, tech & innovation talks, then the highlights of the competition. On the other, a real esport tournament, built by EGOR Gaming with the Let’s Play team from sign-ups to finals — and then told on screen. The brand presenting it all is Djezzy, with 5G and streaming as the playing field.',
    pills: ['YOUTUBE SHOW', 'ESPORT TOURNAMENT', 'BY DJEZZY', 'EGOR × LET’S PLAY'],
    byLabel: 'Presented by',
    byText: 'The show and the competition are signed “by Djezzy”: the brand gives the event its name and ties it to its network priorities — 5G, streaming quality, the rise of esport.',
    byMeta: 'Presenting brand', byLink: 'djezzy.dz',
    showKicker: 'Format 01 — Show', showTitle: 'THE SHOW',
    showText: 'An esport & mobile gaming studio show broadcast on YouTube. It covers gaming news, technology and innovation, then replays the tournament highlights. The publicly stated ambition: structure Algeria’s esport narrative today, and aim for television tomorrow.',
    showFacts: ['Broadcast / YouTube', 'Presented by / Djezzy', 'Segments / News · Tech · Esport'],
    tournamentKicker: 'Format 02 — Competition', tournamentTitle: 'THE TOURNAMENT',
    tournamentText: 'The tournament is played on the ground. Competitions are organised by EGOR Gaming with the Let’s Play team: format, sign-ups, refereeing and the full run of matches down to the finals. Those games then become the show’s raw material — recaps, duels and highlights on screen.',
    tournamentFacts: ['Organisation / EGOR Gaming × Let’s Play team', 'Scope / Esport tournaments', 'On screen / Tournament highlights'],
    rolesLabel: 'THE ROLES', rolesMeta: 'ONE BRAND · TWO ORGANISERS',
    rolesTitleA: 'WHO DOES WHAT,', rolesTitleB: 'ON 7OUMA ARENA.',
    rolesSide: 'Three signatures on the same event: the brand presenting it, the esport outfit organising the competition, and the team organising and telling the story.',
    roles: [
      { id: 'djezzy', kicker: 'Presenting brand', title: 'Djezzy', text: 'The show and the competition are signed “by Djezzy”: the brand presents the event and ties it to its network priorities — 5G, streaming, the professionalisation of esport.' },
      { id: 'egor-gaming', kicker: 'Tournament organisation', title: 'EGOR Gaming', text: 'An Algerian esport structure, EGOR Gaming builds and runs the competition: formats, sign-ups, refereeing and match flow, with its teams on the ground.' },
      { id: 'letsplay', kicker: 'Organisation & coverage', title: 'Let’s Play team', text: 'The Let’s Play team takes part in the organisation and tells the story: filming on site, interviews with players and organisers, content and highlight distribution.' },
    ],
    howLabel: 'INSIDE THE SHOW', howMeta: 'THREE SEGMENTS',
    howTitleA: 'THREE BEATS,', howTitleB: 'ONE PLAYING FIELD.',
    how: [
      { title: 'GAMING NEWS', tag: 'Segment 01', text: 'Gaming and mobile gaming news opens the episode: releases, updates, and what is moving in the local scene.' },
      { title: 'TECH & INNOVATION', tag: 'Segment 02', text: 'Networks, hardware, creation: Djezzy’s 5G, streaming quality and the professionalisation of Algerian esport.' },
      { title: 'ESPORT HIGHLIGHTS', tag: 'Segment 03', text: 'Tournaments organised by EGOR Gaming with the Let’s Play team come back on screen, with the players and the duels of the moment.' },
    ],
    proofLabel: 'SOURCES & STATUS', proofMeta: 'PUBLIC + LET’S PLAY TEAM',
    proofNote: 'The show format, its YouTube broadcast, Djezzy as presenting brand and EGOR Gaming as tournament organiser are publicly documented. The Let’s Play team’s part in the organisation and coverage is confirmed by the team itself.',
    proofItems: [
      { label: 'Launch announcement — Samy Charif, host (EGOR Gaming)', meta: 'YouTube show sponsored by Djezzy, tournaments organised by EGOR Gaming', url: arenaLaunchSource },
      { label: 'djezzy.dz', meta: 'Presenting brand of the “by Djezzy” event', url: 'https://www.djezzy.dz/' },
      { label: 'egorgaming.com', meta: 'Esport structure running the tournaments', url: 'https://egorgaming.com/' },
    ],
  },
  ar: {
    label: 'العرض والبطولة', meta: 'برنامج · بطولة · إسبورت الجزائر',
    eyebrow: 'ساحة واحدة وصيغتان',
    titleA: '7OUMA', titleB: 'ARENA.',
    lead: '‏7ouma Arena برنامج وبطولة في الوقت نفسه: صيغتان تحت راية واحدة «by Djezzy»، بتنظيم من EGOR Gaming مع فريق Let’s Play.',
    text: 'من جهة، برنامج يُبثّ على يوتيوب: أخبار الألعاب، ثم نقاشات التقنية والابتكار، وأخيرًا أبرز لحظات المنافسة. ومن جهة أخرى، بطولة إسبورت حقيقية ينظّمها EGOR Gaming مع فريق Let’s Play، من التسجيلات إلى النهائيات، ثم يرويها البرنامج على الشاشة. والعلامة التي تقدّم هذا كله هي Djezzy، وشبكتها 5G هي ساحة اللعب.',
    pills: ['برنامج يوتيوب', 'بطولة إسبورت', 'by Djezzy', 'EGOR × Let’s Play'],
    byLabel: 'تقديم',
    byText: 'البرنامج والمنافسة يحملان توقيع «by Djezzy»: العلامة تمنح الموعد اسمه وتربطه بقضايا شبكتها — الجيل الخامس، وجودة البث، ونمو الإسبورت.',
    byMeta: 'العلامة المقدِّمة', byLink: 'djezzy.dz',
    showKicker: 'الصيغة 01 — البرنامج', showTitle: 'البرنامج',
    showText: 'استوديو عن الإسبورت وألعاب الهاتف يُبثّ على يوتيوب: أخبار عالم الألعاب، ومواضيع التقنية والابتكار، ثم إعادة أبرز لحظات البطولات. والهدف المُعلن علنًا: هيكلة رواية الإسبورت الجزائري اليوم، والتوجّه إلى التلفزيون غدًا.',
    showFacts: ['البث / يوتيوب', 'التقديم / Djezzy', 'الفواصل / أخبار · تقنية · إسبورت'],
    tournamentKicker: 'الصيغة 02 — المنافسة', tournamentTitle: 'البطولة',
    tournamentText: 'البطولة تُلعب على الميدان. ينظّمها EGOR Gaming مع فريق Let’s Play: الصيغة، والتسجيلات، والتحكيم، وسير المباريات حتى النهائيات. ثم تصبح المباريات مادة البرنامج: ملخّصات ومواجهات وأبرز اللحظات على الشاشة.',
    tournamentFacts: ['التنظيم / EGOR Gaming × فريق Let’s Play', 'النطاق / بطولات إسبورت', 'على الشاشة / أبرز لحظات البطولة'],
    rolesLabel: 'الأدوار', rolesMeta: 'علامة واحدة ومنظّمان',
    rolesTitleA: 'من يقوم بماذا،', rolesTitleB: 'في 7OUMA ARENA.',
    rolesSide: 'ثلاثة توقيعات على الموعد نفسه: العلامة التي تقدّم، والهيكل الإسبورتي الذي ينظّم المنافسة، والفريق الذي ينظّم ويروي.',
    roles: [
      { id: 'djezzy', kicker: 'العلامة المقدِّمة', title: 'Djezzy', text: 'البرنامج والمنافسة يحملان توقيع «by Djezzy»: العلامة تقدّم الموعد وتربطه بقضايا شبكتها — الجيل الخامس، والبث، واحتراف الإسبورت.' },
      { id: 'egor-gaming', kicker: 'تنظيم البطولات', title: 'EGOR Gaming', text: 'هيكل إسبورتي جزائري يدير المنافسة من الألف إلى الياء: الصيغ، والتسجيلات، والتحكيم، وسير المباريات، بفرقه الميدانية.' },
      { id: 'letsplay', kicker: 'التنظيم والتغطية', title: 'فريق Let’s Play', text: 'يشارك فريق Let’s Play في التنظيم ويروي الحدث: التصوير الميداني، ومقابلات اللاعبين والمنظّمين، والمحتوى، ونشر أبرز اللحظات.' },
    ],
    howLabel: 'داخل البرنامج', howMeta: 'ثلاث فواصل',
    howTitleA: 'ثلاث لحظات،', howTitleB: 'وساحة واحدة.',
    how: [
      { title: 'أخبار الألعاب', tag: 'الفاصل 01', text: 'أخبار عالم الألعاب وألعاب الهاتف تفتح الحلقة: الإصدارات، والتحديثات، وكل ما يتحرك في الساحة المحلية.' },
      { title: 'التقنية والابتكار', tag: 'الفاصل 02', text: 'الشبكة، والعتاد، والإبداع: شبكة 5G من Djezzy، وجودة البث، واحتراف الإسبورت الجزائري.' },
      { title: 'أبرز لحظات الإسبورت', tag: 'الفاصل 03', text: 'البطولات التي ينظّمها EGOR Gaming مع فريق Let’s Play تعود بالصور، مع اللاعبين وأقوى المواجهات.' },
    ],
    proofLabel: 'المصادر والحالة', proofMeta: 'مصادر علنية + فريق Let’s Play',
    proofNote: 'صيغة البرنامج وبثّه على يوتيوب، ووجود Djezzy كعلامة مقدِّمة، وتنظيم EGOR Gaming للبطولات: كلها موثّقة علنًا. أما مشاركة فريق Let’s Play في التنظيم والتغطية فهي مؤكَّدة من الفريق نفسه.',
    proofItems: [
      { label: 'إعلان الانطلاق — Samy Charif، مقدّم البرنامج (EGOR Gaming)', meta: 'برنامج على يوتيوب برعاية Djezzy، وبطولات ينظّمها EGOR Gaming', url: arenaLaunchSource },
      { label: 'djezzy.dz', meta: 'العلامة المقدِّمة لموعد «by Djezzy»', url: 'https://www.djezzy.dz/' },
      { label: 'egorgaming.com', meta: 'الهيكل الإسبورتي الذي ينظّم البطولات', url: 'https://egorgaming.com/' },
    ],
  },
};

/**
 * Marque affichée dans une carte « qui fait quoi ».
 * Le logo vient de `partnersData` (fichier public) ; l’équipe Let’s Play est le
 * seul « partenaire » qui n’est pas une marque externe, d’où son logo dédié.
 */
function RoleMark({ id }) {
  if (id === 'letsplay') {
    return <img className="arena-role-logo" src={`${base}lets-play-logo.png`} alt="Let’s Play" loading="lazy" />;
  }
  const partner = partnerByTag[id];
  if (!partner) return null;
  return <PartnerMark partner={partner} size="md" showText={false} />;
}

export default function ArenaShowcase() {
  const { lang } = useLanguage();
  const page = copy[lang] || copy.fr;
  const djezzy = partnerByTag.djezzy;

  return (
    <section className="arena wrap" id="7ouma-arena-show" aria-labelledby="arena-title">
      <div className="section-label">
        <span><b>01</b> / {page.label}</span><span>{page.meta}</span>
      </div>

      <div className="arena-hero">
        <div className="arena-hero-copy">
          <p className="eyebrow"><span className="live-dot" /> {page.eyebrow}</p>
          <h2 id="arena-title">{page.titleA}<br /><em>{page.titleB}</em></h2>
          <p className="arena-lead">{page.lead}</p>
          <p className="arena-text">{page.text}</p>
          <ul className="arena-pills">{page.pills.map((pill) => <li key={pill}>{pill}</li>)}</ul>
        </div>

        <aside className="arena-by">
          <span className="arena-by-label">{page.byLabel}</span>
          <img className="arena-by-logo" src={`${base}${djezzy.logo}`} alt="Djezzy" loading="lazy" />
          <strong>{djezzy.name}</strong>
          <p>{page.byText}</p>
          <div className="arena-by-meta">
            <span>{page.byMeta}</span>
            <a href={djezzy.external} target="_blank" rel="noreferrer">{page.byLink} <Arrow external /></a>
          </div>
        </aside>
      </div>

      <div className="arena-formats">
        <article className="arena-format arena-format-show">
          <span className="partner-kicker">{page.showKicker}</span>
          <h3>{page.showTitle}</h3>
          <p>{page.showText}</p>
          <ul className="partner-facts">{page.showFacts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
        </article>
        <article className="arena-format arena-format-tournament">
          <span className="partner-kicker">{page.tournamentKicker}</span>
          <h3>{page.tournamentTitle}</h3>
          <p>{page.tournamentText}</p>
          <ul className="partner-facts">{page.tournamentFacts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
        </article>
      </div>

      <div className="arena-head">
        <div>
          <div className="section-label"><span><b>01.1</b> / {page.rolesLabel}</span><span>{page.rolesMeta}</span></div>
          <h3>{page.rolesTitleA}<br /><em>{page.rolesTitleB}</em></h3>
        </div>
        <p className="arena-head-side">{page.rolesSide}</p>
      </div>
      <div className="arena-roles">
        {page.roles.map((role, index) => (
          <article className="arena-role" key={role.id}>
            <div className="arena-role-top"><span className="partner-index">{String(index + 1).padStart(2, '0')}</span><span className="partner-kicker">{role.kicker}</span></div>
            <div className="arena-role-mark"><RoleMark id={role.id} /></div>
            <h4>{role.title}</h4>
            <p>{role.text}</p>
          </article>
        ))}
      </div>

      <div className="partners-how arena-how">
        <div className="arena-head">
          <div>
            <div className="section-label"><span><b>01.2</b> / {page.howLabel}</span><span>{page.howMeta}</span></div>
            <h3 className="partners-how-title">{page.howTitleA}<br /><em>{page.howTitleB}</em></h3>
          </div>
        </div>
        <div className="partner-how-grid">
          {page.how.map((step) => (
            <article className="partner-how-card" key={step.title}>
              <span className="partner-kicker">{step.tag}</span>
              <h4>{step.title}</h4>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="arena-proof">
        <div className="section-label"><span><b>01.3</b> / {page.proofLabel}</span><span>{page.proofMeta}</span></div>
        <p className="arena-proof-note">{page.proofNote}</p>
        <ul className="partners-sources-list">
          {page.proofItems.map((item) => (
            <li key={item.url}>
              <a href={item.url} target="_blank" rel="noreferrer">{item.label} <Arrow external /></a>
              <span>{item.meta}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
