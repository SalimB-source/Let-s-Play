import { supabase } from './supabase';
import { normalizeArticleId } from './comments';

export async function fetchArticleReactions(articleId) {
  return request('get_article_reactions', { p_article_id: normalizeArticleId(articleId) });
}

export async function saveArticleReaction(articleId, choice) {
  return request('set_article_reaction', { p_article_id: normalizeArticleId(articleId), p_choice: choice });
}

async function request(name, args) {
  if (!supabase) throw new Error('Réactions indisponibles : Supabase n’est pas configuré.');
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}
