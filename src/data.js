const base = import.meta.env.BASE_URL;

export const videos = [
  { title: 'Assassin’s Creed Black Flag Resynced', category: 'REVIEW', duration: '9:40', image: 'https://i.ytimg.com/vi/0e5yXxfchLA/hqdefault.jpg', href: 'https://www.youtube.com/watch?v=0e5yXxfchLA', tag: 'Gaming', desc: 'Deep dive into Black Flag Resynced — what’s new, what’s worth it, and our verdict for 2026.' },
  { title: 'Games & Comic Con Dzair 2026', category: 'EVENT', duration: '15:17', image: 'https://i.ytimg.com/vi/HzigJZOxz2o/hqdefault.jpg', href: 'https://www.youtube.com/watch?v=HzigJZOxz2o', tag: 'Culture', desc: 'Inside the biggest pop culture event in Algeria — cosplay, guests, and community.' },
  { title: 'Inside ASUS Experts Day 2025', category: 'TECH', duration: '4:26', image: 'https://i.ytimg.com/vi/Zl6crcrPnPQ/hqdefault.jpg', href: 'https://www.youtube.com/watch?v=Zl6crcrPnPQ', tag: 'Tech', desc: 'Tech trends, creator gear and what ASUS is building for gamers.' },
  { title: 'Let’s Play Awards 2025: Our Pick', category: 'POP CULTURE', duration: '27:14', image: 'https://i.ytimg.com/vi/0ThNyFItASM/hqdefault.jpg', href: 'https://www.youtube.com/watch?v=0ThNyFItASM', tag: 'Culture', desc: 'Our top picks for 2025 — games, movies, and moments that defined the year.' },
  { title: 'E-Sport Dzair Cup Finals', category: 'E-SPORT', duration: '22:10', image: 'https://i.ytimg.com/vi/0e5yXxfchLA/hqdefault.jpg', href: 'https://www.youtube.com/watch?v=0e5yXxfchLA', tag: 'Gaming', desc: 'The finals that shook Algiers — highlights and interviews.' },
  { title: 'Cinema: Dune Messiah Preview', category: 'CINEMA', duration: '12:05', image: 'https://i.ytimg.com/vi/Zl6crcrPnPQ/hqdefault.jpg', href: 'https://www.youtube.com/watch?v=Zl6crcrPnPQ', tag: 'Culture', desc: 'What to expect from the next Dune chapter.' },
];

export const filters = ['All', 'Gaming', 'Tech', 'Culture'];

export const socialVisuals = [
  { image: `${base}instagram-DdB-S3glhsG.jpg`, label: 'Instagram post', title: 'Latest from Let’s Play', url: 'https://www.instagram.com/p/DdB-S3glhsG/' },
  { image: `${base}instagram-DaI2RTBDoVA.jpg`, label: 'Instagram post', title: 'Gaming culture, on the feed', url: 'https://www.instagram.com/p/DaI2RTBDoVA/' },
  { image: `${base}instagram-DZ-6b8mAGvb.jpg`, label: 'Instagram post', title: 'New worlds to discover', url: 'https://www.instagram.com/p/DZ-6b8mAGvb/' },
  { image: `${base}instagram-DZ2weRDmm38.jpg`, label: 'Instagram post', title: 'The next big conversation', url: 'https://www.instagram.com/p/DZ2weRDmm38/' },
  { image: `${base}instagram-DZngPVdoZPq.jpg`, label: 'Instagram post', title: 'Pop culture, our way', url: 'https://www.instagram.com/p/DZngPVdoZPq/' },
  { image: `${base}instagram-DZX9rMwgSaH.jpg`, label: 'Instagram post', title: 'Play it loud', url: 'https://www.instagram.com/p/DZX9rMwgSaH/' },
];

export const baseUrl = base;
