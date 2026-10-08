import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { useAchievementAction } from '../achievements/AchievementContext';
import { avatarFor, displayNameFor, formatCommentDate, initialFor } from '../lib/comments';
import { supabase } from '../lib/supabase';
import {
  COMMUNITY_COMMENT_MAX_LENGTH,
  COMMUNITY_GROUP_MAX_DESCRIPTION,
  COMMUNITY_GROUP_MAX_NAME,
  COMMUNITY_THEMES,
  DEFAULT_COMMUNITY_THEME,
  canFallBackToLocalCommunity,
  communityBackendEnabled,
  createLocalCommunityComment,
  createLocalCommunityGroup,
  createRemoteCommunityComment,
  createRemoteCommunityGroup,
  deleteLocalCommunityComment,
  deleteLocalCommunityGroup,
  deleteRemoteCommunityGroup,
  fetchCommunityComments,
  fetchCommunityGroups,
  isGroupCreator,
  mergeCommunityComments,
  mergeCommunityGroups,
  moderateRemoteCommunityComment,
  readLocalCommunityComments,
  readLocalCommunityGroups,
} from './communityData';
import './community.css';

const COPY = {
  fr: {
    section: 'COMMUNAUTÉ / GROUPES DE DISCUSSION',
    online: 'UN HUB, MILLE FAÇONS DE JOUER',
    titleA: 'ON JOUE MIEUX',
    titleB: 'ENSEMBLE.',
    intro: 'Retrouve les joueurs qui partagent tes obsessions, lance un débat ou crée ton propre groupe. Ici, chaque partie commence par une conversation.',
    create: 'Créer un groupe',
    discover: 'Explorer les groupes',
    spotlight: 'GROUPE À LA UNE',
    spotlightCode: 'DERNIER GROUPE OUVERT',
    spotlightEmptyCode: 'GROUPE 001 / À CRÉER',
    spotlightEmptyKicker: 'LE PREMIER GROUPE',
    spotlightEmptyTitle: 'À TOI D’OUVRIR',
    spotlightEmptyAccent: 'LA CONVERSATION.',
    spotlightEmptyNote: 'Aucun groupe ouvert pour le moment. Lance le premier sujet et invite la communauté.',
    spotlightEmptyTags: 'TON GROUPE PEUT ÊTRE ICI',
    groupsCount: 'groupes ouverts',
    discussionCount: 'messages dans le groupe',
    localMode: 'Mode aperçu : tes groupes et commentaires sont enregistrés sur cet appareil.',
    localFallback: 'Le serveur communautaire est indisponible. Ta publication est conservée sur cet appareil.',
    sharedMode: 'Espace communautaire connecté',
    syncError: 'La synchronisation est indisponible pour le moment. Réessaie dans un instant.',
    groupsKicker: 'TROUVE TON GROUPE',
    groupsTitleA: 'LES CONVERSATIONS',
    groupsTitleB: 'COMMENCENT ICI.',
    groupsText: 'Choisis un thème ou crée le tien.',
    createShort: 'Nouveau groupe',
    searchLabel: 'Rechercher un groupe',
    searchPlaceholder: 'Un jeu, un genre, une envie…',
    all: 'Tout voir',
    listHeading: 'GROUPES OUVERTS',
    author: 'Créé par',
    open: 'OUVERT',
    emptyGroups: 'Aucun groupe trouvé. Essaie un autre filtre ou lance le tien.',
    selectedGroup: 'GROUPE DE DISCUSSION',
    noGroupKicker: 'AUCUN GROUPE OUVERT',
    noGroupTitle: 'LA DISCUSSION',
    noGroupAccent: 'COMMENCE ICI.',
    noGroupText: 'Crée le premier groupe, choisis son thème et lance la conversation — tout le monde peut rejoindre.',
    messages: 'MESSAGES',
    memberLabel: 'Communauté ouverte',
    commentsTitle: 'La conversation',
    commentsIntro: 'Partage un conseil, une question ou une victoire — les spoilers, eux, restent signalés.',
    emptyComments: 'La discussion démarre ici. Lance le premier sujet !',
    localTag: 'SUR CET APPAREIL',
    refresh: 'Actualiser la discussion',
    commentPlaceholder: 'Écris ton message…',
    commentLabel: 'Ton commentaire',
    commentHint: 'Reste sympa, respecte les autres joueurs et signale les spoilers.',
    send: 'Publier',
    sending: 'Publication…',
    signInTitle: 'Rejoins la conversation',
    signInText: 'Connecte-toi pour publier un message ou créer un groupe partagé avec toute la communauté.',
    signIn: 'Se connecter',
    character: 'caractères',
    groupModalKicker: 'NOUVEL ESPACE DE JEU',
    groupModalTitle: 'Crée ton groupe.',
    groupModalText: 'Un bon groupe commence par un sujet clair et une communauté accueillante.',
    nameLabel: 'Nom du groupe',
    namePlaceholder: 'Ex. : Les explorateurs de mondes ouverts',
    descriptionLabel: 'Description',
    descriptionPlaceholder: 'De quoi parle-t-on ici ? Donne envie aux autres joueurs de rejoindre la discussion.',
    categoryLabel: 'Thème',
    tagsLabel: 'Jeux ou mots-clés',
    tagsPlaceholder: 'Elden Ring, coop, indé…',
    tagsHint: 'Sépare les mots-clés par une virgule (4 maximum).',
    createSubmit: 'Créer le groupe',
    creating: 'Création…',
    cancel: 'Annuler',
    close: 'Fermer',
    nameError: 'Le nom doit contenir entre 3 et 56 caractères.',
    descriptionError: 'La description doit contenir au moins 12 caractères.',
    duplicateError: 'Un groupe porte déjà ce nom.',
    commentError: 'Ton commentaire doit contenir entre 1 et 1 000 caractères.',
    rateLimitError: 'Doucement ! Patiente un instant avant de publier à nouveau.',
    authError: 'Ta session a expiré. Reconnecte-toi pour publier.',
    actionError: 'Impossible de publier pour le moment. Réessaie.',
    groupError: 'Impossible de créer le groupe pour le moment. Réessaie.',
    noDescription: 'Pas encore de description.',
    categoryLabels: { Gaming: 'Gaming', Console: 'Console', 'Cinéma & séries': 'Cinéma & séries', Tech: 'Tech', Sorties: 'Sorties', 'E-sport': 'E-sport', Autre: 'Autre' },
    categoryDescription: 'THÈMES',
    groupCreated: 'Groupe créé. À toi de lancer la conversation !',
    commentPosted: 'Message publié.',
    composerLocalHint: 'Publication locale : elle ne sera visible que sur cet appareil.',
    footerHint: 'Une communauté se construit à plusieurs.',
    groupDeleted: 'Groupe supprimé.',
    commentDeleted: 'Commentaire supprimé.',
    deleteGroupConfirm: 'Êtes-vous sûr de vouloir supprimer ce groupe ? Cette action est irréversible.',
    deleteGroupAria: 'Supprimer le groupe',
    deleteGroupTitle: 'Supprimer le groupe',
    deleteCommentConfirm: 'Êtes-vous sûr de vouloir supprimer ce commentaire ? Cette action est irréversible.',
    moderateCommentAria: 'Modérer le commentaire',
    moderateCommentTitle: 'Supprimer le commentaire',
  },
  en: {
    section: 'COMMUNITY / DISCUSSION GROUPS', online: 'ONE HUB, A THOUSAND WAYS TO PLAY', titleA: 'GAMES ARE BETTER', titleB: 'TOGETHER.',
    intro: 'Find players who share your obsessions, start a debate or create your own group. Every great run begins with a conversation.',
    create: 'Create a group', discover: 'Explore groups', spotlight: 'FEATURED GROUP', spotlightCode: 'LATEST OPEN GROUP', spotlightEmptyCode: 'GROUP 001 / TO CREATE', spotlightEmptyKicker: 'THE FIRST GROUP', spotlightEmptyTitle: 'OPEN', spotlightEmptyAccent: 'THE CONVERSATION.', spotlightEmptyNote: 'No open group yet. Start the first topic and invite the community.', spotlightEmptyTags: 'YOUR GROUP COULD BE HERE', groupsCount: 'open groups', discussionCount: 'messages in this group',
    localMode: 'Preview mode: your groups and comments are saved on this device.', localFallback: 'The community server is unavailable. Your post is saved on this device.', sharedMode: 'Community space connected', syncError: 'Sync is unavailable right now. Please try again in a moment.',
    groupsKicker: 'FIND YOUR PEOPLE', groupsTitleA: 'CONVERSATIONS', groupsTitleB: 'START HERE.', groupsText: 'Pick a theme or create your own.', createShort: 'New group', searchLabel: 'Search groups', searchPlaceholder: 'A game, a genre, a feeling…', all: 'All groups', listHeading: 'OPEN GROUPS', author: 'Created by', open: 'OPEN', emptyGroups: 'No groups found. Try another filter or start your own.', selectedGroup: 'DISCUSSION GROUP', noGroupKicker: 'NO OPEN GROUP', noGroupTitle: 'THE CONVERSATION', noGroupAccent: 'STARTS HERE.', noGroupText: 'Create the first group, pick its theme and start the conversation — anyone can join.', messages: 'MESSAGES', memberLabel: 'Open community', commentsTitle: 'The conversation', commentsIntro: 'Share a tip, a question or a victory — just mark your spoilers.', emptyComments: 'The discussion starts here. Post the first topic!', localTag: 'ON THIS DEVICE', refresh: 'Refresh discussion', commentPlaceholder: 'Write your message…', commentLabel: 'Your comment', commentHint: 'Be kind, respect other players and mark spoilers.', send: 'Post', sending: 'Posting…', signInTitle: 'Join the conversation', signInText: 'Sign in to post a message or create a group shared with the community.', signIn: 'Sign in', character: 'characters',
    groupModalKicker: 'NEW PLAY SPACE', groupModalTitle: 'Create your group.', groupModalText: 'A good group starts with a clear topic and a welcoming community.', nameLabel: 'Group name', namePlaceholder: 'e.g. Open-world explorers', descriptionLabel: 'Description', descriptionPlaceholder: 'What do you talk about here? Give other players a reason to join.', categoryLabel: 'Theme', tagsLabel: 'Games or keywords', tagsPlaceholder: 'Elden Ring, co-op, indie…', tagsHint: 'Separate keywords with commas (up to 4).', createSubmit: 'Create group', creating: 'Creating…', cancel: 'Cancel', close: 'Close', nameError: 'Name must be between 3 and 56 characters.', descriptionError: 'Description must contain at least 12 characters.', duplicateError: 'A group with that name already exists.', commentError: 'Your comment must contain between 1 and 1,000 characters.', rateLimitError: 'Slow down! Wait a moment before posting again.', authError: 'Your session expired. Sign in to post.', actionError: 'Could not post right now. Please try again.', groupError: 'Could not create this group right now. Please try again.',
    noDescription: 'No description yet.', categoryLabels: { Gaming: 'Gaming', Console: 'Console', 'Cinéma & séries': 'Film & TV', Tech: 'Tech', Sorties: 'Releases', 'E-sport': 'Esports', Autre: 'Other' }, categoryDescription: 'THEMES', groupCreated: 'Group created. Start the conversation!', commentPosted: 'Message posted.', composerLocalHint: 'Local post: only visible on this device.', footerHint: 'A community is built together.', groupDeleted: 'Group deleted.', commentDeleted: 'Comment deleted.', deleteGroupConfirm: 'Are you sure you want to delete this group? This action cannot be undone.', deleteGroupAria: 'Delete group', deleteGroupTitle: 'Delete group', deleteCommentConfirm: 'Are you sure you want to delete this comment? This action cannot be undone.', moderateCommentAria: 'Moderate comment', moderateCommentTitle: 'Delete comment',
  },
  ar: {
    section: 'المجتمع / مجموعات النقاش', online: 'مساحة واحدة، وطرق لا حصر لها للعب', titleA: 'اللعب أجمل', titleB: 'معاً.',
    intro: 'اعثر على لاعبين يشاركونك شغفك، ابدأ نقاشاً أو أنشئ مجموعتك الخاصة. كل جولة رائعة تبدأ بحوار.',
    create: 'أنشئ مجموعة', discover: 'استكشف المجموعات', spotlight: 'المجموعة المميزة', spotlightCode: 'آخر مجموعة مفتوحة', spotlightEmptyCode: 'المجموعة 001 / للإنشاء', spotlightEmptyKicker: 'المجموعة الأولى', spotlightEmptyTitle: 'دورك لتفتح', spotlightEmptyAccent: 'النقاش.', spotlightEmptyNote: 'لا توجد مجموعة مفتوحة بعد. ابدأ الموضوع الأول وادعُ المجتمع.', spotlightEmptyTags: 'مجموعتك قد تكون هنا', groupsCount: 'مجموعات مفتوحة', discussionCount: 'رسائل في المجموعة',
    localMode: 'وضع المعاينة: تُحفظ مجموعاتك وتعليقاتك على هذا الجهاز.', localFallback: 'خادم المجتمع غير متاح. حُفظت مشاركتك على هذا الجهاز.', sharedMode: 'المجتمع متصل', syncError: 'المزامنة غير متاحة الآن. حاول مجدداً بعد قليل.',
    groupsKicker: 'اعثر على مجموعتك', groupsTitleA: 'النقاشات', groupsTitleB: 'تبدأ هنا.', groupsText: 'اختر موضوعاً أو أنشئ مجموعتك.', createShort: 'مجموعة جديدة', searchLabel: 'ابحث عن مجموعة', searchPlaceholder: 'لعبة أو نوع أو فكرة…', all: 'كل المجموعات', listHeading: 'مجموعات مفتوحة', author: 'أنشأها', open: 'مفتوحة', emptyGroups: 'لم نعثر على مجموعات. جرّب مرشحاً آخر أو أنشئ مجموعتك.', selectedGroup: 'مجموعة نقاش', noGroupKicker: 'لا توجد مجموعة مفتوحة', noGroupTitle: 'النقاش', noGroupAccent: 'يبدأ هنا.', noGroupText: 'أنشئ المجموعة الأولى، اختر موضوعها وابدأ الحديث — يمكن للجميع الانضمام.', messages: 'رسائل', memberLabel: 'مجتمع مفتوح', commentsTitle: 'المحادثة', commentsIntro: 'شارك نصيحة أو سؤالاً أو انتصاراً — ولا تنسَ الإشارة إلى الحرق.', emptyComments: 'يبدأ النقاش هنا. اطرح أول موضوع!', localTag: 'على هذا الجهاز', refresh: 'حدّث النقاش', commentPlaceholder: 'اكتب رسالتك…', commentLabel: 'تعليقك', commentHint: 'كن لطيفاً واحترم اللاعبين وأشر إلى الحرق.', send: 'انشر', sending: 'جارٍ النشر…', signInTitle: 'انضم إلى النقاش', signInText: 'سجّل الدخول لنشر رسالة أو إنشاء مجموعة مشتركة مع المجتمع.', signIn: 'تسجيل الدخول', character: 'حرفاً',
    groupModalKicker: 'مساحة لعب جديدة', groupModalTitle: 'أنشئ مجموعتك.', groupModalText: 'تبدأ المجموعة الجيدة بموضوع واضح ومجتمع مرحّب.', nameLabel: 'اسم المجموعة', namePlaceholder: 'مثال: مستكشفو العوالم المفتوحة', descriptionLabel: 'الوصف', descriptionPlaceholder: 'ما موضوع النقاش؟ شجّع اللاعبين على الانضمام.', categoryLabel: 'الموضوع', tagsLabel: 'ألعاب أو كلمات مفتاحية', tagsPlaceholder: 'Elden Ring، تعاوني، مستقل…', tagsHint: 'افصل الكلمات بفواصل (4 كحد أقصى).', createSubmit: 'أنشئ المجموعة', creating: 'جارٍ الإنشاء…', cancel: 'إلغاء', close: 'إغلاق', nameError: 'يجب أن يتراوح الاسم بين 3 و56 حرفاً.', descriptionError: 'يجب ألا يقل الوصف عن 12 حرفاً.', duplicateError: 'توجد مجموعة بهذا الاسم بالفعل.', commentError: 'يجب أن يتراوح التعليق بين حرف واحد و1000 حرف.', rateLimitError: 'تمهّل قليلاً قبل النشر مجدداً.', authError: 'انتهت جلستك. سجّل الدخول للنشر.', actionError: 'تعذّر النشر الآن. حاول مجدداً.', groupError: 'تعذّر إنشاء المجموعة الآن. حاول مجدداً.',
    noDescription: 'لا يوجد وصف بعد.', categoryLabels: { Gaming: 'ألعاب', Console: 'أجهزة', 'Cinéma & séries': 'سينما ومسلسلات', Tech: 'تقنية', Sorties: 'إصدارات', 'E-sport': 'رياضات إلكترونية', Autre: 'أخرى' }, categoryDescription: 'المواضيع', groupCreated: 'أُنشئت المجموعة. ابدأ النقاش!', commentPosted: 'نُشرت الرسالة.', composerLocalHint: 'نشر محلي: لا يظهر إلا على هذا الجهاز.', footerHint: 'المجتمع يُبنى معاً.', groupDeleted: 'تم حذف المجموعة.', commentDeleted: 'تم حذف التعليق.', deleteGroupConfirm: 'هل أنت متأكد من حذف هذه المجموعة؟ لا يمكن التراجع عن هذا الإجراء.', deleteGroupAria: 'حذف المجموعة', deleteGroupTitle: 'حذف المجموعة', deleteCommentConfirm: 'هل أنت متأكد من حذف هذا التعليق؟ لا يمكن التراجع عن هذا الإجراء.', moderateCommentAria: 'إدارة التعليق', moderateCommentTitle: 'حذف التعليق',
  },
};

const CATEGORY_ICON = Object.fromEntries(COMMUNITY_THEMES.map((theme) => [theme.id, theme.icon]));

function ArrowIcon({ small = false }) {
  return (
    <svg width={small ? 13 : 16} height={small ? 13 : 16} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 13 13 3M5 3h8v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MessageIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-2.5 2v-6A7.5 7.5 0 1 1 20 11.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 10h8M8 13.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 11a8 8 0 1 0 1 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M20 4v7h-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="m3 3 10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Avatar({ name, src, className = '' }) {
  return (
    <span className={`community-avatar ${className}`} aria-hidden="true">
      {src ? <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" /> : initialFor(name)}
    </span>
  );
}

function prettyCategory(category, copy) {
  return copy.categoryLabels[category] || category;
}

function actionErrorCopy(error, copy, fallback) {
  const message = error?.message || '';
  if (/community_(group|comment)_rate_limited/i.test(message)) return copy.rateLimitError;
  if (/community_(comment|group)_requires_auth|row-level security|permission denied|jwt/i.test(message) || error?.code === '42501') return copy.authError;
  if (/comment_(body|empty)|community_comments_body/i.test(message) || error?.code === '23514') return copy.commentError;
  return fallback;
}

export default function CommunityPage() {
  const { lang } = useLanguage();
  const copy = COPY[lang] || COPY.fr;
  const { user, isDemo, loading: authLoading } = useAuth();
  const track = useAchievementAction();

  const [remoteGroups, setRemoteGroups] = useState([]);
  const [localGroups, setLocalGroups] = useState(readLocalCommunityGroups);
  const [remoteComments, setRemoteComments] = useState([]);
  const [localComments, setLocalComments] = useState([]);
  // Aucun groupe n'est épinglé : la discussion s'ouvre sur le premier groupe
  // de la liste (le plus récent), dès qu'il existe.
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [connection, setConnection] = useState(communityBackendEnabled ? 'loading' : 'local');
  const [syncError, setSyncError] = useState(null);
  const [loadingGroups, setLoadingGroups] = useState(communityBackendEnabled);
  const [loadingComments, setLoadingComments] = useState(communityBackendEnabled);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createValues, setCreateValues] = useState({ name: '', description: '', category: DEFAULT_COMMUNITY_THEME, tags: '' });
  const [commentBody, setCommentBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [modalError, setModalError] = useState('');

  const commentFeedRef = useRef(null);
  const nameInputRef = useRef(null);
  const syncErrorRef = useRef(null);
  const selectedGroupIdRef = useRef(selectedGroupId);
  selectedGroupIdRef.current = selectedGroupId;
  const groups = useMemo(
    () => mergeCommunityGroups(remoteGroups, localGroups),
    [remoteGroups, localGroups],
  );
  const comments = useMemo(
    () => mergeCommunityComments(selectedGroupId, remoteComments, localComments),
    [selectedGroupId, remoteComments, localComments],
  );
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) || null;

  const needsSignIn = Boolean(communityBackendEnabled && connection !== 'local' && !isDemo && !user);
  const canPublish = !needsSignIn && !authLoading && Boolean(selectedGroup);
  const localOnly = connection !== 'shared' || isDemo || String(selectedGroupId).startsWith('local-');

  const filteredGroups = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(lang || 'fr');
    return groups.filter((group) => {
      const matchesCategory = !categoryFilter || group.category === categoryFilter;
      const haystack = [group.name, group.description, group.category, ...(group.tags || [])].join(' ').toLocaleLowerCase(lang || 'fr');
      return matchesCategory && (!needle || haystack.includes(needle));
    });
  }, [groups, query, categoryFilter, lang]);

  const categories = useMemo(
    () => [...new Set(groups.map((group) => group.category).filter(Boolean))],
    [groups],
  );

  useEffect(() => {
    if (filteredGroups.length > 0 && !filteredGroups.some((group) => group.id === selectedGroupId)) {
      selectedGroupIdRef.current = filteredGroups[0].id;
      setSelectedGroupId(filteredGroups[0].id);
    }
  }, [filteredGroups, selectedGroupId]);

  const loadGroups = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoadingGroups(true);
    const stored = readLocalCommunityGroups();
    setLocalGroups(stored);
    if (!supabase) {
      setConnection('local');
      setLoadingGroups(false);
      return;
    }
    try {
      const rows = await fetchCommunityGroups();
      setRemoteGroups(rows);
      if (!syncErrorRef.current) {
        setConnection('shared');
        setSyncError(null);
      }
    } catch (error) {
      syncErrorRef.current = error;
      setRemoteGroups([]);
      setConnection('local');
      setSyncError(error);
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  const loadComments = useCallback(async (groupId, { quiet = false } = {}) => {
    if (!groupId) return;
    if (!quiet) setLoadingComments(true);
    setLocalComments(readLocalCommunityComments(groupId));
    setRemoteComments([]);
    if (!supabase || String(groupId).startsWith('local-')) {
      setLoadingComments(false);
      return;
    }
    try {
      const rows = await fetchCommunityComments(groupId);
      if (selectedGroupIdRef.current !== groupId) return;
      setRemoteComments(rows);
    } catch (error) {
      if (selectedGroupIdRef.current !== groupId) return;
      syncErrorRef.current = error;
      setRemoteComments([]);
      setSyncError(error);
      setConnection('local');
    } finally {
      if (selectedGroupIdRef.current === groupId) setLoadingComments(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    let active = true;
    const groupId = selectedGroupId;
    setLocalComments(readLocalCommunityComments(groupId));
    setRemoteComments([]);
    if (!supabase || String(groupId).startsWith('local-')) {
      setLoadingComments(false);
      return () => { active = false; };
    }
    setLoadingComments(true);
    fetchCommunityComments(groupId)
      .then((rows) => {
        if (!active) return;
        setRemoteComments(rows);
      })
      .catch((error) => {
        if (!active) return;
        syncErrorRef.current = error;
        setSyncError(error);
        setConnection('local');
      })
      .finally(() => {
        if (active) setLoadingComments(false);
      });
    return () => { active = false; };
  // `syncError` is deliberately not a dependency: a failed request should not
  // immediately retry itself in a render loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const refreshLocal = () => {
      setLocalGroups(readLocalCommunityGroups());
      setLocalComments(readLocalCommunityComments(selectedGroupId));
    };
    const onStorage = (event) => {
      if (event.key === 'letsplay_community_v1') refreshLocal();
    };
    window.addEventListener('letsplay:community-updated', refreshLocal);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('letsplay:community-updated', refreshLocal);
      window.removeEventListener('storage', onStorage);
    };
  }, [selectedGroupId]);

  useEffect(() => {
    setCommentBody('');
    setActionError('');
  }, [selectedGroupId, user?.id]);

  useEffect(() => {
    setNotice('');
  }, [user?.id]);

  useEffect(() => {
    if (!createOpen) return undefined;
    setModalError('');
    setTimeout(() => nameInputRef.current?.focus(), 50);
    const onKey = (event) => {
      if (event.key === 'Escape') setCreateOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [createOpen]);

  useEffect(() => {
    if (comments.length === 0) return;
    const viewport = commentFeedRef.current;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [comments.length, selectedGroupId]);

  const refreshDiscussion = async () => {
    setRefreshing(true);
    syncErrorRef.current = null;
    setSyncError(null);
    if (communityBackendEnabled) setConnection('loading');
    await Promise.all([loadGroups({ quiet: true }), loadComments(selectedGroupId, { quiet: true })]);
    setRefreshing(false);
  };

  const openCreate = () => {
    setModalError('');
    setCreateValues({ name: '', description: '', category: 'Soulslike', tags: '' });
    setCreateOpen(true);
  };

  const submitGroup = async (event) => {
    event.preventDefault();
    if (creating || needsSignIn) return;
    const name = createValues.name.trim();
    const description = createValues.description.trim();
    const tags = [...new Set(createValues.tags.split(',').map((tag) => tag.trim()).filter(Boolean))].slice(0, 4);
    if (name.length < 3 || name.length > COMMUNITY_GROUP_MAX_NAME) {
      setModalError(copy.nameError);
      return;
    }
    if (description.length < 12 || description.length > COMMUNITY_GROUP_MAX_DESCRIPTION) {
      setModalError(copy.descriptionError);
      return;
    }
    if (groups.some((group) => group.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setModalError(copy.duplicateError);
      return;
    }

    setCreating(true);
    setModalError('');
    let group;
    let savedLocally = false;
    try {
      const canUseRemote = communityBackendEnabled && connection === 'shared' && user && !isDemo;
      if (canUseRemote) {
        try {
          group = await createRemoteCommunityGroup({ name, description, category: createValues.category, tags });
          setRemoteGroups((current) => mergeCommunityGroups(current, [group]));
        } catch (error) {
          if (!canFallBackToLocalCommunity(error)) throw error;
          group = createLocalCommunityGroup({ name, description, category: createValues.category, tags }, user);
          setLocalGroups((current) => mergeCommunityGroups(current, [group]));
          syncErrorRef.current = error;
          setConnection('local');
          setSyncError(error);
          savedLocally = true;
        }
      } else {
        group = createLocalCommunityGroup({ name, description, category: createValues.category, tags }, user);
        setLocalGroups((current) => mergeCommunityGroups(current, [group]));
        savedLocally = true;
      }
      selectedGroupIdRef.current = group.id;
      setSelectedGroupId(group.id);
      setCreateOpen(false);
      setCreateValues({ name: '', description: '', category: 'Soulslike', tags: '' });
      setNotice(savedLocally ? copy.localFallback : copy.groupCreated);
    } catch (error) {
      setModalError(actionErrorCopy(error, copy, copy.groupError));
    } finally {
      setCreating(false);
    }
  };

  const submitComment = async (event) => {
    event.preventDefault();
    const body = commentBody.trim();
    if (!body || posting || needsSignIn) return;
    if (body.length > COMMUNITY_COMMENT_MAX_LENGTH) {
      setActionError(copy.commentError);
      return;
    }
    setPosting(true);
    setActionError('');
    setNotice('');
    let comment;
    let savedLocally = false;
    try {
      const canUseRemote = communityBackendEnabled
        && connection === 'shared'
        && user
        && !isDemo
        && !String(selectedGroupId).startsWith('local-');
      if (canUseRemote) {
        try {
          comment = await createRemoteCommunityComment(selectedGroupId, body);
          setRemoteComments((current) => mergeCommunityComments(selectedGroupId, current, [comment]));
        } catch (error) {
          if (!canFallBackToLocalCommunity(error)) throw error;
          comment = createLocalCommunityComment(selectedGroupId, body, user);
          setLocalComments((current) => mergeCommunityComments(selectedGroupId, current, [comment]));
          syncErrorRef.current = error;
          setConnection('local');
          setSyncError(error);
          savedLocally = true;
        }
      } else {
        comment = createLocalCommunityComment(selectedGroupId, body, user);
        setLocalComments((current) => mergeCommunityComments(selectedGroupId, current, [comment]));
        savedLocally = true;
      }
      setCommentBody('');
      setNotice(savedLocally ? copy.composerLocalHint : copy.commentPosted);
      track('comment_posted');
      requestAnimationFrame(() => {
        if (commentFeedRef.current) commentFeedRef.current.scrollTop = commentFeedRef.current.scrollHeight;
      });
    } catch (error) {
      setActionError(actionErrorCopy(error, copy, copy.actionError));
    } finally {
      setPosting(false);
    }
  };

  // Handler for group creator to delete their group
  const handleDeleteGroup = async (groupId) => {
    if (!confirm(copy.deleteGroupConfirm || 'Are you sure you want to delete this group? This action cannot be undone.')) {
      return;
    }
    setActionError('');
    setNotice('');
    try {
      const canUseRemote = communityBackendEnabled
        && connection === 'shared'
        && user
        && !isDemo
        && !String(groupId).startsWith('local-');
      if (canUseRemote) {
        try {
          await deleteRemoteCommunityGroup(groupId);
          // Remove from local state
          setRemoteGroups((current) => current.filter((g) => g.id !== groupId));
          // If the deleted group was selected, select another group
          if (selectedGroupId === groupId) {
            const remainingGroups = groups.filter((g) => g.id !== groupId);
            if (remainingGroups.length > 0) {
              handleGroupSelect(remainingGroups[0].id);
            } else {
              setSelectedGroupId(null);
            }
          }
        } catch (error) {
          if (!canFallBackToLocalCommunity(error)) throw error;
          deleteLocalCommunityGroup(groupId);
          setLocalGroups((current) => current.filter((g) => g.id !== groupId));
          if (selectedGroupId === groupId) {
            const remainingGroups = groups.filter((g) => g.id !== groupId);
            if (remainingGroups.length > 0) {
              handleGroupSelect(remainingGroups[0].id);
            } else {
              setSelectedGroupId(null);
            }
          }
          syncErrorRef.current = error;
          setConnection('local');
          setSyncError(error);
        }
      } else {
        deleteLocalCommunityGroup(groupId);
        setLocalGroups((current) => current.filter((g) => g.id !== groupId));
        if (selectedGroupId === groupId) {
          const remainingGroups = groups.filter((g) => g.id !== groupId);
          if (remainingGroups.length > 0) {
            handleGroupSelect(remainingGroups[0].id);
          } else {
            setSelectedGroupId(null);
          }
        }
      }
      setNotice(copy.groupDeleted || 'Group deleted.');
      track('group_deleted');
    } catch (error) {
      setActionError(actionErrorCopy(error, copy, copy.groupError || 'Could not delete group.'));
    }
  };

  // Handler for group creator to moderate (delete) any comment in their group
  const handleModerateComment = async (commentId, groupId) => {
    if (!confirm(copy.deleteCommentConfirm || 'Are you sure you want to delete this comment? This action cannot be undone.')) {
      return;
    }
    setActionError('');
    setNotice('');
    try {
      const canUseRemote = communityBackendEnabled
        && connection === 'shared'
        && user
        && !isDemo
        && !String(groupId).startsWith('local-');
      if (canUseRemote) {
        try {
          await moderateRemoteCommunityComment(commentId, groupId);
          setRemoteComments((current) => current.filter((c) => c.id !== commentId));
        } catch (error) {
          if (!canFallBackToLocalCommunity(error)) throw error;
          deleteLocalCommunityComment(commentId);
          setLocalComments((current) => current.filter((c) => c.id !== commentId));
          syncErrorRef.current = error;
          setConnection('local');
          setSyncError(error);
        }
      } else {
        deleteLocalCommunityComment(commentId);
        setLocalComments((current) => current.filter((c) => c.id !== commentId));
      }
      setNotice(copy.commentDeleted || 'Comment deleted.');
      track('comment_moderated');
    } catch (error) {
      setActionError(actionErrorCopy(error, copy, copy.commentError || 'Could not delete comment.'));
    }
  };

  // Check if current user is the creator of the group
  const isGroupCreator = (group) => {
    if (!user) return false;
    if (group.is_local) {
      return group.created_by === user.id;
    }
    return group.created_by === user.id;
  };

  // Check if current user can moderate a comment (group creator can delete any comment)
  const canModerateComment = (comment) => {
    if (!user) return false;
    const group = groups.find((g) => g.id === selectedGroupId);
    if (!group) return false;
    return isGroupCreator(group);
  };

  const handleGroupSelect = (groupId) => {
    selectedGroupIdRef.current = groupId;
    setSelectedGroupId(groupId);
    setNotice('');
    setActionError('');
  };

  const statusLabel = connection === 'shared' && !isDemo && !String(selectedGroupId).startsWith('local-') ? copy.sharedMode : copy.localMode;
  // Carte « groupe à la une » du hero : elle reprend le dernier groupe ouvert
  // (la liste est triée du plus récent au plus ancien) et invite à créer le
  // premier quand il n'y en a aucun.
  const spotlightGroup = groups[0] || null;

  return (
    <div className="community-page" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <section className="community-hero" aria-labelledby="community-page-title">
        <div className="community-hero-inner wrap">
          <div className="section-label community-section-label">
            <span>{copy.section}</span>
            <span>{copy.groupsCount.toLocaleUpperCase(lang)}</span>
          </div>

          <div className="community-hero-grid">
            <div className="community-hero-copy">
              <p className="eyebrow"><span className="live-dot" /> {copy.online}</p>
              <h1 id="community-page-title">{copy.titleA}<br /><em>{copy.titleB}</em></h1>
              <p className="community-hero-intro">{copy.intro}</p>
              <div className="community-hero-actions">
                {needsSignIn ? (
                  <Link className="community-button community-button-primary" to="/auth?mode=signin">
                    {copy.signIn} <ArrowIcon />
                  </Link>
                ) : (
                  <button type="button" className="community-button community-button-primary" onClick={openCreate}>
                    {copy.create} <span aria-hidden="true">＋</span>
                  </button>
                )}
                <a className="community-button community-button-ghost" href="#community-groups">
                  {copy.discover} <span aria-hidden="true">↓</span>
                </a>
              </div>
              <div className="community-hero-footline">
                <span className={`community-status-dot ${connection === 'shared' ? 'is-connected' : ''}`} />
                <span>{statusLabel}</span>
                <span className="community-footline-divider" />
                <strong>{groups.length.toString().padStart(2, '0')}</strong>
                <span>{copy.groupsCount}</span>
              </div>
            </div>

            <div
              className="community-hero-visual"
              aria-label={`${spotlightGroup ? copy.spotlight : copy.spotlightEmptyKicker}: ${spotlightGroup ? spotlightGroup.name : copy.spotlightEmptyTitle}`}
            >
              <div className="community-visual-grid" aria-hidden="true" />
              <div className="community-orbit community-orbit-one" aria-hidden="true" />
              <div className="community-orbit community-orbit-two" aria-hidden="true" />
              <div className={`community-feature-card${spotlightGroup ? '' : ' is-empty'}`}>
                <div className="community-feature-card-top">
                  <span className="community-feature-code">{spotlightGroup ? copy.spotlightCode : copy.spotlightEmptyCode}</span>
                  <span className="community-feature-live"><i /> LIVE</span>
                </div>
                <div className="community-feature-sigil" aria-hidden="true">{spotlightGroup ? (CATEGORY_ICON[spotlightGroup.category] || '💬') : '＋'}</div>
                <p className="community-feature-kicker">{spotlightGroup ? copy.spotlight : copy.spotlightEmptyKicker}</p>
                {spotlightGroup ? (
                  <>
                    <h2>{spotlightGroup.name}</h2>
                    <p className="community-feature-note">{spotlightGroup.description || copy.noDescription}</p>
                  </>
                ) : (
                  <>
                    <h2>{copy.spotlightEmptyTitle}<br /><em>{copy.spotlightEmptyAccent}</em></h2>
                    <p className="community-feature-note">{copy.spotlightEmptyNote}</p>
                  </>
                )}
                <div className="community-feature-bottom">
                  {spotlightGroup ? (
                    <span className="community-feature-tags">
                      <i /> {prettyCategory(spotlightGroup.category, copy)}
                      {(spotlightGroup.tags || []).slice(0, 1).map((tag) => <Fragment key={tag}><i /> {tag}</Fragment>)}
                    </span>
                  ) : (
                    <span className="community-feature-tags"><i /> {copy.spotlightEmptyTags}</span>
                  )}
                  <a href="#community-groups" aria-label={copy.discover}><ArrowIcon small /></a>
                </div>
              </div>
              <span className="community-hero-coordinate community-hero-coordinate-top">36°45' N / ALGIERS</span>
              <span className="community-hero-coordinate community-hero-coordinate-bottom">CO-OP / TALK / PLAY</span>
            </div>
          </div>
        </div>
      </section>

      <section className="community-workspace wrap" id="community-groups" aria-labelledby="community-groups-title">
        <div className="section-label community-section-label">
          <span>01 / {copy.listHeading}</span>
          <span>{loadingGroups ? '…' : `${filteredGroups.length.toString().padStart(2, '0')} / ${groups.length.toString().padStart(2, '0')}`}</span>
        </div>

        <div className="community-section-heading">
          <div>
            <p className="eyebrow"><span className="live-dot" /> {copy.groupsKicker}</p>
            <h2 id="community-groups-title">{copy.groupsTitleA}<br /><em>{copy.groupsTitleB}</em></h2>
            <p className="community-section-intro">{copy.groupsText}</p>
          </div>
          {needsSignIn ? (
            <Link className="community-button community-button-outline" to="/auth?mode=signin">{copy.signIn} <ArrowIcon /></Link>
          ) : (
            <button type="button" className="community-button community-button-outline" onClick={openCreate}>
              {copy.createShort} <span aria-hidden="true">＋</span>
            </button>
          )}
        </div>

        {syncError && connection === 'local' && communityBackendEnabled && (
          <div className="community-sync-note" role="status">
            <span aria-hidden="true">⌁</span>
            <div><strong>{copy.localFallback}</strong><small>{copy.syncError}</small></div>
          </div>
        )}

        <div className="community-layout">
          <aside className="community-directory" aria-label={copy.listHeading}>
            <div className="community-directory-head">
              <div>
                <span className="community-panel-kicker">{copy.listHeading}</span>
                <strong>{groups.length.toString().padStart(2, '0')} <small>{copy.groupsCount}</small></strong>
              </div>
              <span className="community-directory-signal" aria-hidden="true"><i /><i /><i /><i /></span>
            </div>

            <label className="community-search">
              <span className="sr-only">{copy.searchLabel}</span>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="4.8" stroke="currentColor" strokeWidth="1.4" /><path d="m10.5 10.5 3.2 3.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.searchPlaceholder} />
              {query && <button type="button" onClick={() => setQuery('')} aria-label={copy.close}><CloseIcon /></button>}
            </label>

            <div className="community-filters" aria-label={copy.categoryDescription}>
              <button type="button" className={!categoryFilter ? 'is-active' : ''} aria-pressed={!categoryFilter} onClick={() => setCategoryFilter('')}>{copy.all}</button>
              {categories.map((category) => (
                <button key={category} type="button" className={categoryFilter === category ? 'is-active' : ''} aria-pressed={categoryFilter === category} onClick={() => setCategoryFilter(category)}>
                  {prettyCategory(category, copy)}
                </button>
              ))}
            </div>

            <div className="community-group-list" role="group" aria-label={copy.listHeading}>
              {filteredGroups.map((group, index) => {
                const active = group.id === selectedGroupId;
                const creator = isGroupCreator(group);
                return (
                  <div className={`community-group-card-wrapper${active ? ' is-active' : ''}${group.is_featured ? ' is-featured' : ''}`} key={group.id}>
                    <button
                      type="button"
                      className={`community-group-card${active ? ' is-active' : ''}${group.is_featured ? ' is-featured' : ''}`}
                      onClick={() => handleGroupSelect(group.id)}
                      aria-pressed={active}
                    >
                      <span className="community-group-card-icon" aria-hidden="true">{CATEGORY_ICON[group.category] || '💬'}</span>
                      <span className="community-group-card-copy">
                        <span className="community-group-card-topline"><small>{prettyCategory(group.category, copy)}</small></span>
                        <strong>{group.name}</strong>
                        <span className="community-group-card-desc">{group.description}</span>
                        <span className="community-group-card-bottom">
                          <span className="community-group-status"><i /> {copy.open}</span>
                          <span className="community-group-card-arrow" aria-hidden="true">↗</span>
                        </span>
                      </span>
                      <span className="community-group-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                    </button>
                    {creator && (
                      <button
                        type="button"
                        className="community-group-card-delete"
                        onClick={(event) => { event.stopPropagation(); handleDeleteGroup(group.id); }}
                        aria-label={copy.deleteGroupAria || 'Delete group'}
                        title={copy.deleteGroupTitle || 'Delete group'}
                      >
                        <DeleteIcon />
                      </button>
                    )}
                  </div>
                );
              })}
              {!loadingGroups && filteredGroups.length === 0 && (
                <div className="community-empty-groups">
                  <span aria-hidden="true">⌕</span>
                  <p>{copy.emptyGroups}</p>
                </div>
              )}
            </div>

            {needsSignIn ? (
              <Link className="community-directory-create" to="/auth?mode=signin">
                <span>{copy.signIn}</span><ArrowIcon small />
              </Link>
            ) : (
              <button type="button" className="community-directory-create" onClick={openCreate}>
                <span aria-hidden="true">＋</span><span>{copy.create}</span><ArrowIcon small />
              </button>
            )}
          </aside>

          <section
            className={`community-discussion${selectedGroup ? '' : ' is-empty'}`}
            aria-label={selectedGroup ? `${copy.selectedGroup}: ${selectedGroup.name}` : copy.noGroupKicker}
          >
            {selectedGroup ? (
              <>
                <header className="community-discussion-head">
                  <div className="community-discussion-identity">
                    <span className="community-discussion-icon" aria-hidden="true">{CATEGORY_ICON[selectedGroup.category] || '💬'}</span>
                    <div className="community-discussion-title">
                      <div className="community-discussion-kicker">
                        <span className="community-live-indicator"><i /> {copy.selectedGroup}</span>
                      </div>
                      <h3>{selectedGroup.name}</h3>
                      <div className="community-discussion-meta">
                        <span>{prettyCategory(selectedGroup.category, copy)}</span>
                        <i />
                        <span>{copy.memberLabel}</span>
                      </div>
                    </div>
                  </div>
                  <div className="community-discussion-actions">
                    {isGroupCreator(selectedGroup) && (
                      <button
                        type="button"
                        className="community-delete-group-btn"
                        onClick={() => handleDeleteGroup(selectedGroup.id)}
                        aria-label={copy.deleteGroupAria || 'Delete group'}
                        title={copy.deleteGroupTitle || 'Delete group'}
                      >
                        <DeleteIcon />
                      </button>
                    )}
                    <button type="button" className={`community-refresh${refreshing ? ' is-spinning' : ''}`} onClick={refreshDiscussion} disabled={refreshing} aria-label={copy.refresh} title={copy.refresh}>
                      <RefreshIcon />
                    </button>
                  </div>
                </header>

                <div className="community-discussion-about">
                  <p>{selectedGroup.description || copy.noDescription}</p>
                  {selectedGroup.tags?.length > 0 && (
                    <div className="community-discussion-tags">
                      {selectedGroup.tags.map((tag) => <span key={tag}>#{tag}</span>)}
                    </div>
                  )}
                </div>

                <div className="community-thread-head">
                  <div>
                    <span className="community-panel-kicker">{copy.commentsTitle}</span>
                    <strong><MessageIcon size={16} /> {comments.length.toString().padStart(2, '0')} <small>{copy.messages}</small></strong>
                  </div>
                  <span className="community-thread-line" aria-hidden="true" />
                </div>

                <div className="community-comment-feed" ref={commentFeedRef} aria-live="polite" aria-relevant="additions text">
                  {loadingComments && comments.length === 0 && <div className="community-feed-loading"><span className="community-loader" /> {copy.syncError}</div>}
                  {!loadingComments && comments.length === 0 && (
                    <div className="community-empty-thread">
                      <span className="community-empty-thread-icon"><MessageIcon size={22} /></span>
                      <p>{copy.emptyComments}</p>
                    </div>
                  )}
                  {comments.map((comment) => {
                    const canModerate = canModerateComment(comment);
                    return (
                      <article className={`community-comment${comment.is_local ? ' is-local' : ''}`} key={comment.id}>
                        <Avatar name={comment.author_name} src={comment.author_avatar} />
                        <div className="community-comment-main">
                          <div className="community-comment-meta">
                            <strong>{comment.author_name}</strong>
                            <time dateTime={comment.created_at}>{formatCommentDate(comment.created_at, lang)}</time>
                            {comment.is_local && <span className="community-comment-local">{copy.localTag}</span>}
                          </div>
                          <p>{comment.body}</p>
                          {canModerate && (
                            <button
                              type="button"
                              className="community-comment-moderate"
                              onClick={() => handleModerateComment(comment.id, selectedGroup.id)}
                              aria-label={copy.moderateCommentAria || 'Moderate comment'}
                              title={copy.moderateCommentTitle || 'Delete comment'}
                            >
                              <DeleteIcon />
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="community-composer-wrap">
                  {needsSignIn ? (
                    <div className="community-signin-card">
                      <span className="community-signin-mark"><MessageIcon size={21} /></span>
                      <div><strong>{copy.signInTitle}</strong><p>{copy.signInText}</p></div>
                      <Link className="community-button community-button-primary" to="/auth?mode=signin">{copy.signIn} <ArrowIcon small /></Link>
                    </div>
                  ) : (
                    <form className="community-composer" onSubmit={submitComment}>
                      <Avatar name={displayNameFor(user)} src={avatarFor(user)} className="community-composer-avatar" />
                      <div className="community-composer-main">
                        <label className="sr-only" htmlFor="community-comment-input">{copy.commentLabel}</label>
                        <textarea
                          id="community-comment-input"
                          rows="2"
                          maxLength={COMMUNITY_COMMENT_MAX_LENGTH}
                          value={commentBody}
                          onChange={(event) => { setCommentBody(event.target.value); setActionError(''); setNotice(''); }}
                          placeholder={copy.commentPlaceholder}
                          disabled={!canPublish || posting}
                        />
                        <div className="community-composer-foot">
                          <span>{localOnly ? copy.composerLocalHint : copy.commentHint}</span>
                          <span className="community-character-count">{commentBody.length}/{COMMUNITY_COMMENT_MAX_LENGTH}</span>
                          <button type="submit" className="community-post-button" disabled={!commentBody.trim() || posting || !canPublish}>
                            {posting ? copy.sending : copy.send}<ArrowIcon small />
                          </button>
                        </div>
                        {actionError && <p className="community-form-error" role="alert">{actionError}</p>}
                        {notice && <p className="community-form-notice" role="status">{notice}</p>}
                      </div>
                    </form>
                  )}
                </div>
              </>
            ) : (
              <div className="community-empty-discussion">
                <span className="community-empty-discussion-icon" aria-hidden="true">＋</span>
                <p className="community-panel-kicker">{copy.noGroupKicker}</p>
                <h3>{copy.noGroupTitle}<br /><em>{copy.noGroupAccent}</em></h3>
                <p className="community-empty-discussion-text">{copy.noGroupText}</p>
                {needsSignIn ? (
                  <Link className="community-button community-button-primary" to="/auth?mode=signin">{copy.signIn} <ArrowIcon /></Link>
                ) : (
                  <button type="button" className="community-button community-button-primary" onClick={openCreate}>
                    {copy.create} <span aria-hidden="true">＋</span>
                  </button>
                )}
              </div>
            )}
          </section>
        </div>

        <div className="community-bottom-note"><span aria-hidden="true">✳</span> {copy.footerHint}</div>
      </section>

      {createOpen && (
        <div className="community-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !creating) setCreateOpen(false); }}>
          <section className="community-modal" role="dialog" aria-modal="true" aria-labelledby="community-modal-title">
            <div className="community-modal-topline"><span>{copy.groupModalKicker}</span><button type="button" onClick={() => !creating && setCreateOpen(false)} aria-label={copy.close} disabled={creating}><CloseIcon /></button></div>
            <div className="community-modal-heading">
              <span className="community-modal-mark" aria-hidden="true">＋</span>
              <div><h2 id="community-modal-title">{copy.groupModalTitle}</h2><p>{copy.groupModalText}</p></div>
            </div>
            {needsSignIn ? (
              <div className="community-modal-signin"><p>{copy.signInText}</p><Link className="community-button community-button-primary" to="/auth?mode=signin" onClick={() => setCreateOpen(false)}>{copy.signIn} <ArrowIcon /></Link></div>
            ) : (
              <form className="community-create-form" onSubmit={submitGroup}>
                <label className="community-field">
                  <span>{copy.nameLabel}</span>
                  <input ref={nameInputRef} type="text" maxLength={COMMUNITY_GROUP_MAX_NAME} value={createValues.name} onChange={(event) => setCreateValues((current) => ({ ...current, name: event.target.value }))} placeholder={copy.namePlaceholder} required />
                  <small>{createValues.name.length}/{COMMUNITY_GROUP_MAX_NAME}</small>
                </label>
                <label className="community-field">
                  <span>{copy.descriptionLabel}</span>
                  <textarea rows="3" maxLength={COMMUNITY_GROUP_MAX_DESCRIPTION} value={createValues.description} onChange={(event) => setCreateValues((current) => ({ ...current, description: event.target.value }))} placeholder={copy.descriptionPlaceholder} required />
                  <small>{createValues.description.length}/{COMMUNITY_GROUP_MAX_DESCRIPTION}</small>
                </label>
                <div className="community-create-row">
                  <label className="community-field">
                    <span>{copy.categoryLabel}</span>
                    <select value={createValues.category} onChange={(event) => setCreateValues((current) => ({ ...current, category: event.target.value }))}>
                      {COMMUNITY_THEMES.map((theme) => <option key={theme.id} value={theme.id}>{theme.icon} {prettyCategory(theme.id, copy)}</option>)}
                    </select>
                  </label>
                  <label className="community-field">
                    <span>{copy.tagsLabel}</span>
                    <input type="text" value={createValues.tags} onChange={(event) => setCreateValues((current) => ({ ...current, tags: event.target.value }))} placeholder={copy.tagsPlaceholder} />
                    <small>{copy.tagsHint}</small>
                  </label>
                </div>
                {modalError && <p className="community-form-error" role="alert">{modalError}</p>}
                <div className="community-modal-actions">
                  <button type="button" className="community-modal-cancel" onClick={() => setCreateOpen(false)} disabled={creating}>{copy.cancel}</button>
                  <button type="submit" className="community-button community-button-primary" disabled={creating}>
                    {creating ? copy.creating : copy.createSubmit}<ArrowIcon small />
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
