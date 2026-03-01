import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Share2, MessageSquare, Send, Eye, Image as ImageIcon, Reply, Smile, Play, Newspaper } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { useToast } from '@/contexts/ToastContext';
import { useThemeContext } from '@/contexts/ThemeContext';
import { getValidImageUrl } from '@/lib/utils';
import { PostGeneratorModal } from '@/components/ui/PostGeneratorModal';

import { SponsorBanner } from '@/components/SponsorBanner';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { SEO } from '@/components/SEO';
import { generateNewsSchema } from '@/lib/metadata';

import { News } from '@/types';

interface Reaction {
  emoji: string;
  count: number;
  users: string[]; // user IDs
}

interface NewsItem extends News {
  summary?: string;
  image_source?: string;
  image_source_url?: string;
  sidebar_content?: string;
  sources?: string;
  tags?: string[];
  media_config?: {
    scale: number;
    rotate: number;
    x: number;
    y: number;
  };
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    team_member?: {
      image_url: string | null;
    };
  };
  reactions?: Reaction[];
  parent_id?: string | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id?: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export default function NewsDetail() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const { config } = useSiteConfig();
  const { toast } = useToast();
  const { isDark } = useThemeContext();
  const location = useLocation();
  const [news, setNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [relatedNews, setRelatedNews] = useState<NewsItem[]>([]);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [generatedFacts, setGeneratedFacts] = useState<string[]>([]);
  const [isGeneratingFacts, setIsGeneratingFacts] = useState(false);
  const [threadNews, setThreadNews] = useState<NewsItem[]>([]);
  const [currentFactIndex, setCurrentFactIndex] = useState(0);


  const facts = useMemo(() => {
    if (generatedFacts.length > 0) return generatedFacts;
    if (!news?.sidebar_content) return [];
    return news.sidebar_content.split('|').map(f => f.replace(/<[^>]*>?/gm, '').trim()).filter(Boolean).slice(0, 3);
  }, [news?.sidebar_content, generatedFacts]);



  const generateFunFacts = useCallback(async (newsId: string, newsContent: string): Promise<string[]> => {
    if (!config?.enable_ai_post_generator) {
      console.warn("AI fact generation is not enabled in site configuration.");
      return [];
    }

    setIsGeneratingFacts(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-news-fun-facts', {
        body: {
          newsId,
          newsContent,
        },
      });

      if (error) {
        console.error("Error invoking generate-news-fun-facts function:", error);
        toast(`Error al generar datos de interés: ${error.message}`, 'error');
        return [];
      }

      const generated: string[] = data?.facts || [];
      if (generated.length > 0) {
        await supabase.from('news').update({ sidebar_content: generated.join('|') }).eq('id', newsId);
        toast('Datos de interés generados y guardados.', 'success');
      }
      return generated;
    } catch (err) {
      console.error("Unexpected error generating fun facts:", err);
      toast('Error inesperado al generar datos de interés.', 'error');
      return [];
    } finally {
      setIsGeneratingFacts(false);
    }
  }, [config?.enable_ai_post_generator, toast]);

  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel>;

    async function fetchData() {
      if (!id) return;
      setLoading(true);

      try {
        // Fetch main news content
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        
        let query = supabase.from('news').select('*, profiles(full_name, avatar_url, team_member:team_members(image_url))');
        if (isUUID) {
          query = query.eq('id', id);
        } else {
          query = query.eq('slug', id);
        }

        const { data: newsData, error: newsError } = await query.single();
        
        if (newsError) throw newsError;
        
        const newsId = newsData.id;

        // Subscribe to real-time changes for this news item and its reactions
        channel = supabase
          .channel(`news_detail:${newsId}`)
          .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'news',
            filter: `id=eq.${newsId}`
          }, (payload) => {
            if (isMounted) {
              setNews(prev => prev ? { ...prev, ...payload.new } : null);
            }
          })
          // Also listen for reaction changes
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'news_reactions',
            filter: `news_id=eq.${newsId}`
          }, () => {
             // Reload reactions when they change
             fetchReactions(newsId);
          })
          .subscribe();

        // Helper to fetch reactions
        const fetchReactions = async (nId: string) => {
           const { data: reactionsData } = await supabase
             .from('news_reactions')
             .select('emoji, user_id')
             .eq('news_id', nId);
           
           if (reactionsData) {
             // Group by emoji
             const grouped = reactionsData.reduce((acc: Record<string, { emoji: string; count: number; users: string[] }>, curr) => {
               if (!acc[curr.emoji]) {
                 acc[curr.emoji] = { emoji: curr.emoji, count: 0, users: [] };
               }
               acc[curr.emoji].count++;
               acc[curr.emoji].users.push(curr.user_id);
               return acc;
             }, {});
             
             const processedReactions = Object.values(grouped) as Reaction[];
             setNews(prev => prev ? { ...prev, reactions: processedReactions } : null);
           }
        };

        // Increment views with debouncing
        const viewKey = `viewed_news_${newsId}`;
        const hasViewed = sessionStorage.getItem(viewKey);
        
        if (!hasViewed) {
          supabase.rpc('increment_news_views', { news_id: newsId })
            .then(({ error }) => {
              if (error) {
                 console.error('Error incrementing views:', error);
              } else {
                 sessionStorage.setItem(viewKey, 'true');
                 // Optimistically update local state if needed
                 setNews(prev => prev ? { ...prev, views: (prev.views || 0) + 1 } : null);
              }
            });
        }
        
          if (isMounted) {
            setNews(newsData as NewsItem);
            setLoading(false);
            // Initial fetch of reactions from new table
            fetchReactions(newsId);

            // --- NEW LOGIC FOR FUN FACTS --- 
            const existingFacts = newsData.sidebar_content ?
              newsData.sidebar_content.split('|').map(f => f.replace(/<[^>]*>?/gm, '').trim()).filter(Boolean) : [];

            if (existingFacts.length < 3) {
              const contentToAnalyze = newsData.summary || newsData.content || '';
              if (contentToAnalyze) {
                const newFacts = await generateFunFacts(newsId, contentToAnalyze);
                if (isMounted && newFacts.length > 0) {
                  setGeneratedFacts(newFacts);
                }
              }
            } else {
              setGeneratedFacts(existingFacts.slice(0, 3)); // Use existing and ensure max 3
            }
            // --- END NEW LOGIC --- 
          }

        // Fetch secondary data
        const promises = [
          supabase.from('news_comments').select('*, profiles(full_name, avatar_url)').eq('news_id', newsId).order('created_at', { ascending: false }),
          // Fetch more candidates for better scoring (increased from 5 to 20)
          supabase.from('news').select('*').eq('category', newsData.category).neq('id', newsId).limit(20),
          newsData.tags && newsData.tags.length > 0 
            ? supabase.from('news').select('*').overlaps('tags', newsData.tags).neq('id', newsId).limit(20)
            : Promise.resolve({ data: [] })
        ];

        const [commentsRes, catRes, tagRes] = await Promise.all(promises);

        if (!isMounted) return;

        if (commentsRes.data) {
          setComments(commentsRes.data as Comment[]);
        }

        const catItems = catRes.data || [];
        const tagItems = (tagRes as { data: NewsItem[] }).data || [];
        
        // Map to store unique items and their scores
        const scoredItems = new Map<string, { item: NewsItem, score: number }>();

        // Helper to normalize text for keyword matching
        const normalizeText = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        // Extract significant keywords from current title (length > 3)
        const currentTitleKeywords = normalizeText(newsData.title)
          .split(/\s+/)
          .filter(w => w.length > 3);

        const scoreItem = (item: NewsItem) => {
           let score = 0;
           
           // 1. Tags Scoring (High Weight: ~4 points per tag match)
            if (newsData.tags && item.tags && Array.isArray(item.tags)) {
              // Normalize tags for case-insensitive comparison
              const currentTagsNorm = newsData.tags.map(t => t.toLowerCase().trim());
              const itemTagsNorm = item.tags.map(t => t.toLowerCase().trim());
              const intersection = itemTagsNorm.filter(t => currentTagsNorm.includes(t));
              score += intersection.length * 4;
            }

           // 2. Category Scoring (Low Weight: 1 point)
           // If it's in the same category, it gets a point.
           if (item.category === newsData.category) {
             score += 1;
           }

           // 3. Title/Content Scoring (Medium Weight: 2 points per keyword match)
           if (item.title) {
             const itemTitleNorm = normalizeText(item.title);
             let keywordMatches = 0;
             currentTitleKeywords.forEach(kw => {
               if (itemTitleNorm.includes(kw)) keywordMatches++;
             });
             score += keywordMatches * 2;
           }
           
           return score;
        };

        // Combine all candidates
        const allCandidates = [...catItems, ...tagItems];
        
        // Score each candidate
        allCandidates.forEach((item: NewsItem) => {
          if (!scoredItems.has(item.id)) {
            scoredItems.set(item.id, { item, score: scoreItem(item) });
          }
        });

        let relatedItems = Array.from(scoredItems.values())
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return new Date(b.item.created_at).getTime() - new Date(a.item.created_at).getTime();
          })
          .map(entry => entry.item);

        if (relatedItems.length < 3) {
          const { data: latestData } = await supabase
            .from('news')
            .select('*')
            .neq('id', newsId)
            .order('created_at', { ascending: false })
            .limit(6); 
          
          if (latestData) {
            const existingIds = new Set(relatedItems.map(item => item.id));
            const additional = latestData.filter(item => !existingIds.has(item.id));
            relatedItems = [...relatedItems, ...additional];
          }
        }
        
        setRelatedNews(relatedItems.slice(0, 3));

        // --- FETCH THREAD NEWS (Recursive-like logic) ---
        const getAllThreadNews = async (currentNewsId: string, currentParentId: string | null) => {
          let rootId = currentParentId || currentNewsId;
          
          // Try to find the grandparent if exists to get the actual root
          if (currentParentId) {
            const { data: parentData } = await supabase
              .from('news')
              .select('id, parent_id')
              .eq('id', currentParentId)
              .maybeSingle();
            
            if (parentData?.parent_id) {
              rootId = parentData.parent_id;
              // Check one more level for great-grandparent
              const { data: grandParentData } = await supabase
                .from('news')
                .select('id, parent_id')
                .eq('id', parentData.parent_id)
                .maybeSingle();
              if (grandParentData?.parent_id) {
                rootId = grandParentData.parent_id;
              }
            }
          }

          // Fetch all news that have this rootId as their parent OR are the rootId itself
          const { data: threadData } = await supabase
            .from('news')
            .select('id, title, slug, created_at, category, image_url, parent_id')
            .or(`id.eq.${rootId},parent_id.eq.${rootId}`)
            .order('created_at', { ascending: false }); // Most recent first
          
          return threadData || [];
        };

        const threadResults = await getAllThreadNews(newsId, newsData.parent_id);
        if (isMounted) {
          setThreadNews(threadResults.length > 1 ? (threadResults as NewsItem[]) : []);
        }
        // --- END THREAD NEWS ---

      } catch (error) {
        console.error('Error fetching news details:', error);
        if (isMounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [id, session?.user?.id, config, generateFunFacts]);

  // Auto-slide for curiosities carousel
  useEffect(() => {
    if (facts.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentFactIndex(prev => (prev + 1) % facts.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [facts.length]);


  const handleReaction = async (emoji: string) => {
    if (!session?.user || !news?.id) {
      toast('Inicia sesión para reaccionar', 'info');
      return;
    }

    // Optimistic Update
    const oldReactions = [...(news.reactions || [])];
    let newReactions = JSON.parse(JSON.stringify(oldReactions)) as Reaction[]; // Deep copy
    
    // Check if user already has a reaction with THIS emoji
    const existingReaction = newReactions.find(r => r.emoji === emoji);
    const userReactedWithThis = existingReaction?.users.includes(session.user.id);

    if (userReactedWithThis) {
       // Removing reaction (Toggle off)
       if (existingReaction) {
          existingReaction.users = existingReaction.users.filter(id => id !== session.user.id);
          existingReaction.count--;
          if (existingReaction.count <= 0) {
             newReactions = newReactions.filter(r => r.emoji !== emoji);
          }
       }
       
       // DB Call: Delete
       const { error } = await supabase
         .from('news_reactions')
         .delete()
         .match({ news_id: news.id, user_id: session.user.id }); // Match by user and news only

       if (error) {
          console.error('Error removing reaction:', error);
          setNews({ ...news, reactions: oldReactions }); // Revert
          toast('Error al actualizar reacción', 'error');
       }
    } else {
       // Adding or Changing reaction
       // First, remove user from ANY other reaction group in local state
       newReactions.forEach(r => {
         if (r.users.includes(session.user.id)) {
           r.users = r.users.filter(id => id !== session.user.id);
           r.count--;
         }
       });
       // Filter out empty ones
       newReactions = newReactions.filter(r => r.count > 0);

       // Now add to the new emoji group
       const targetReaction = newReactions.find(r => r.emoji === emoji);
       if (targetReaction) {
          targetReaction.users.push(session.user.id);
          targetReaction.count++;
       } else {
          newReactions.push({ emoji, count: 1, users: [session.user.id] });
       }

       // DB Call: Upsert (replaces existing if any due to unique constraint)
       const { error } = await supabase
         .from('news_reactions')
         .upsert({ news_id: news.id, user_id: session.user.id, emoji: emoji }, { onConflict: 'news_id, user_id' });

       if (error) {
          console.error('Error adding reaction:', error);
          setNews({ ...news, reactions: oldReactions }); // Revert
          toast('Error al reaccionar', 'error');
       } else {
          // Notify author (only on add)
          if (news.author_id && news.author_id !== session.user.id) {
            // Check if we already notified recently to avoid spam (optional optimization)
            supabase.from('notifications').insert({
              user_id: news.author_id,
              type: 'like',
              title: 'Nueva Reacción',
              message: `Alguien reaccionó con ${emoji} a tu noticia: ${news.title}`,
              link_url: `/noticias/${news.id}`
            }).then();
          }
       }
    }
    
    // Apply optimistic update
    setNews({ ...news, reactions: newReactions });
    setShowEmojiPicker(false);
  };

  const addEmoji = (emoji: { native: string }) => {
    handleReaction(emoji.native);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user || !news?.id || !newComment.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      const { data, error } = await supabase
        .from('news_comments')
        .insert({
          news_id: news.id,
          user_id: session.user.id,
          content: newComment.trim(),
          parent_id: replyTo?.id || null
        })
        .select('*, profiles(full_name, avatar_url)')
        .single();

      if (error) throw error;
      setComments([data as Comment, ...comments]);
      setNewComment('');
      setReplyTo(null);

      // Notify
      await supabase.from('notifications').insert({
        user_id: replyTo ? replyTo.user_id : (news.author_id || session.user.id), 
        type: replyTo ? 'reply' : 'comment',
        title: replyTo ? 'Respuesta a tu comentario' : 'Nuevo Comentario',
        message: replyTo 
          ? `Alguien respondió a tu comentario en: ${news?.title}`
          : `Alguien comentó en tu noticia: ${news?.title}`,
        link_url: `/noticias/${news.id}`
      });
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-500 dark:text-white/50">
        Cargando noticia...
      </div>
  );

  if (!news) return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Noticia no encontrada</h2>
        <Link to="/" className="text-primary hover:underline">Volver al inicio</Link>
      </div>
  );

  const cleanDescription = news.summary || news.content?.replace(/<[^>]*>?/gm, '').substring(0, 160) + '...';
  const shareUrl = window.location.href;

  const handleShare = async () => {
    // Track share in DB
    if (news?.id) {
       supabase.rpc('increment_news_shares', { row_id: news.id }).then(({ error }) => {
         if (error) console.error('Error incrementing shares:', error);
       });
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: news.title,
          text: cleanDescription,
          url: shareUrl,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(shareUrl);
      alert('Enlace copiado al portapapeles');
    }
  };

  return (
    <>
      <SEO 
        title={news.title}
        description={cleanDescription}
        image={news.image_url}
        url={shareUrl}
        type="article"
        keywords={news.tags?.join(', ') || news.category}
        schema={generateNewsSchema(news, config?.site_name || 'Antena Florida')}
        article={{
          publishedTime: news.created_at,
          author: news.profiles?.full_name || undefined,
          section: news.category,
          tags: news.tags,
        }}
      />

      <article className="max-w-4xl mx-auto px-4 sm:px-6 py-2 mt-2">
        {/* 1. Barra Superior (Navegación) */}
        <div className="flex items-center justify-between mb-6">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-slate-500 hover:text-primary transition-colors mb-6 font-medium"
          >
            <ArrowLeft size={20} />
          </Link>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsGeneratorOpen(true)}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-900 dark:text-white transition-colors"
              aria-label="Generar Post"
            >
              <ImageIcon size={24} />
            </button>
            <button 
              onClick={handleShare}
              className="p-2 -mr-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-900 dark:text-white transition-colors"
              aria-label="Compartir"
            >
              <Share2 size={24} />
            </button>
          </div>
        </div>

        {/* Promotion Banner */}
        <div className="mb-8">
          <SponsorBanner location="news_detail_top" />
        </div>

        <header className="mb-8">
          {/* 2. Etiquetas (Tags) */}
          <div className="flex flex-wrap gap-2 mb-6">
            {news.category?.split(',').map(c => c.trim()).filter(Boolean).map((cat, idx) => (
              <Link 
                key={idx}
                to={`/noticias/seccion/${cat.toLowerCase().replace(/\s+/g, '-')}`}
                className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-primary hover:text-white transition-colors"
              >
                {cat}
              </Link>
            ))}
            {/* Also show tags here if any */}
            {news.tags && news.tags.map(tag => (
               <Link
                key={tag} 
                to={`/buscar?q=${encodeURIComponent(tag)}&type=news`}
                className="bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/70 px-3 py-1 rounded-full text-xs font-medium hover:bg-primary hover:text-white transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>

          {/* 3. Título Principal (H1) */}
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-tight mb-8 font-display">
            {news.title}
          </h1>

          {/* 4. Información del Autor (Meta-info Principal) */}
          <div className="flex items-center gap-4 mb-8">
             <div className="size-12 rounded-full overflow-hidden bg-white dark:bg-card-dark shadow-md border-2 border-primary/20">
                <img 
                  src={getValidImageUrl(config?.logo_url, 'logo', undefined, undefined, config)} 
                  alt="Redacción Antena Florida" 
                  className="w-full h-full object-cover"
                />
             </div>
             <div>
                <div className="font-bold text-slate-800 dark:text-slate-200 text-lg capitalize leading-tight">
                  Redacción Antena Florida
                </div>
                
                {/* 5. Detalles Finales (Meta-info Secundaria) */}
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  <span>{formatDistanceToNow(new Date(news.created_at), { addSuffix: true, locale: es })}</span>
                  <span>•</span>
                  <span>{news.views || 0} visitas</span>
                  <span>•</span>
                  <span>{comments.length} comentarios</span>
                   {/* Emoji counter */}
                   {news.reactions && news.reactions.length > 0 && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <span className="flex -space-x-1">
                            {[...news.reactions].sort((a, b) => b.count - a.count).slice(0, 3).map((r, i) => (
                              <span key={i} className="text-xs">{r.emoji}</span>
                            ))}
                          </span>
                          <span className="font-bold">
                            {news.reactions.reduce((acc, curr) => acc + curr.count, 0)}
                          </span>
                        </div>
                      </>
                   )}
                </div>
             </div>
          </div>

          {news.image_url ? (
            <div className="mb-8 relative group">
              <div className="rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-card-dark transition-all duration-500">
                <div className="aspect-video relative bg-slate-100 dark:bg-white/5 flex items-center justify-center overflow-hidden">
                  <style>{`
                    .news-hero-img-${news.id} {
                      transform: ${news.media_config ? `translate(${news.media_config.x}%, ${news.media_config.y}%) rotate(${news.media_config.rotate}deg) scale(${news.media_config.scale})` : 'none'};
                      transform-origin: center center;
                    }
                  `}</style>
                  <img 
                    src={getValidImageUrl(news.image_url, 'news', undefined, undefined, config)} 
                    alt={news.title} 
                    className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 news-hero-img-${news.id}`} 
                    onError={(e) => {
                      e.currentTarget.src = getValidImageUrl(null, 'news', undefined, undefined, config);
                    }}
                  />

                  {/* Fuente incrustada en la imagen */}
                  {(news.image_source || news.image_source_url) && (
                    <div className="absolute bottom-4 right-4 z-20">
                      {news.image_source_url ? (
                        <a 
                          href={news.image_source_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center gap-1.5 bg-black/70 backdrop-blur-xl border border-white/20 rounded-full py-1 px-3 text-[9px] font-black uppercase tracking-widest text-white hover:bg-primary hover:text-background-dark transition-all duration-300 shadow-2xl"
                          title={`Fuente: ${news.image_source || 'Externa'}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ImageIcon size={10} className="text-primary group-hover:text-background-dark" />
                          <span className="max-w-[150px] truncate">
                            Fuente: {news.image_source || 'Externa'}
                          </span>
                        </a>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-xl border border-white/20 rounded-full py-1 px-3 text-[9px] font-black uppercase tracking-widest text-white cursor-default shadow-2xl">
                          <ImageIcon size={10} className="text-primary" />
                          <span className="max-w-[150px] truncate">Fuente: {news.image_source}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Datos de Interés Carousel - Integrated Version */}
                {(facts.length > 0 || isGeneratingFacts) && (
                  <div className="bg-slate-50/80 dark:bg-black/40 backdrop-blur-md border-t border-slate-200 dark:border-white/10 p-4 sm:p-5">
                    {isGeneratingFacts ? (
                      <div className="flex items-center justify-center py-4">
                        <p className="text-xs text-slate-500 dark:text-white/50 animate-pulse">Generando datos de interés...</p>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
                              <Play size={14} fill="currentColor" />
                            </div>
                            <div>
                              <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">
                                Dato <span className="text-primary">de Interés</span>
                              </h3>
                            </div>
                          </div>

                          {/* Carousel Controls - Repositioned to top-right */}
                          {facts.length > 1 && (
                            <div className="flex items-center gap-1.5">
                              {facts.map((_, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setCurrentFactIndex(idx)}
                                  className={`h-1 rounded-full transition-all duration-300 ${
                                    idx === currentFactIndex ? 'w-4 bg-primary' : 'w-1 bg-slate-300 dark:bg-white/20'
                                  }`}
                                  aria-label={`Ir al dato de interés ${idx + 1}`}
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="relative transition-all duration-500 ease-in-out">
                          {facts.map((fact, idx) => (
                            <p 
                              key={idx} 
                              className={`${
                                idx === currentFactIndex 
                                  ? 'relative opacity-100 translate-y-0' 
                                  : 'absolute top-0 left-0 opacity-0 -translate-y-4 pointer-events-none'
                              } text-slate-700 dark:text-white/90 text-sm md:text-base font-medium leading-relaxed italic transition-all duration-700`}
                            >
                              "{fact}"
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          ) : (
            <div className="rounded-3xl overflow-hidden aspect-video shadow-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-20 mb-8">
              <img src={getValidImageUrl(config?.logo_url, 'logo', undefined, undefined, config)} alt="Logo" className="max-h-full max-w-full object-contain grayscale opacity-20" />
            </div>
          )}
        </header>

        <div 
          className="news-content max-w-none mb-8"
          dangerouslySetInnerHTML={{ __html: news.content }}
        />


        {/* Hilo de la Noticia / Cronología */}
        {threadNews.length > 1 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                <Newspaper size={20} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                Cronología <span className="text-primary">de la Noticia</span>
              </h3>
            </div>

            <div className="relative pl-8 space-y-8 before:content-[''] before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-white/10">
              {threadNews.map((item, idx) => {
                const isCurrent = item.id === news.id;
                return (
                  <div key={item.id} className="relative">
                    <div className={`absolute -left-8 top-1.5 size-4 rounded-full border-2 transition-all ${
                      isCurrent 
                        ? 'bg-primary border-primary scale-125 z-10 shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]' 
                        : 'bg-white dark:bg-card-dark border-slate-300 dark:border-white/20'
                    }`} />
                    
                    <Link 
                      to={`/noticias/${item.slug}`}
                      className={`block group p-4 rounded-2xl transition-all ${
                        isCurrent 
                          ? 'bg-primary/5 border border-primary/20 cursor-default' 
                          : 'hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent'
                      }`}
                      onClick={(e) => isCurrent && e.preventDefault()}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                         <div className="flex-1">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${
                              isCurrent ? 'text-primary' : 'text-slate-400 dark:text-white/30'
                            }`}>
                              {idx === 0 ? 'Noticia Inicial' : `Actualización ${idx}`} • {format(new Date(item.created_at), 'dd MMM, HH:mm', { locale: es })}
                            </span>
                            <h4 className={`text-lg font-bold mt-1 group-hover:text-primary transition-colors ${
                              isCurrent ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-white/80'
                            }`}>
                              {item.title}
                            </h4>
                         </div>
                         {item.image_url && (
                           <div className="w-full md:w-24 aspect-video rounded-lg overflow-hidden flex-shrink-0 border border-slate-200 dark:border-white/10">
                             <img 
                               src={getValidImageUrl(item.image_url, 'news', undefined, 200, config)} 
                               alt={item.title} 
                               className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                             />
                           </div>
                         )}
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {news.sources && (
           <div className="mb-8 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 text-xs text-slate-500 dark:text-white/50 break-all">
              <strong className="block uppercase tracking-widest mb-1 text-slate-400 dark:text-white/30">Fuente:</strong>
              {news.sources}
           </div>
        )}



        {/* Dynamic Signature */}
        {(config?.site_name || config?.slogan) && (
           <div className="mt-8 pt-8 border-t border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/60">
              <p>
                <strong>{config?.site_name || 'Antena Florida'}</strong>
                {config?.slogan && <> - <em>{config.slogan}</em></>}
              </p>
           </div>
        )}

        {/* Interaction Section */}
        <div className="flex flex-wrap items-center gap-6 py-8 border-y border-slate-200 dark:border-white/10 mb-12 relative">
          <div className="flex flex-wrap items-center gap-2">
            {/* All reactions sorted by count */}
            {news.reactions && news.reactions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mr-2">
                {[...news.reactions]
                  .sort((a, b) => b.count - a.count)
                  .map(reaction => {
                    const hasReacted = reaction.users.includes(session?.user?.id || '');
                    return (
                      <button
                        key={reaction.emoji}
                        onClick={() => handleReaction(reaction.emoji)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all hover:scale-110 border border-slate-200 dark:border-white/10 ${
                          hasReacted 
                            ? 'bg-primary text-background-dark shadow-lg shadow-primary/20' 
                            : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10'
                        }`}
                      >
                        <span className="text-lg leading-none">{reaction.emoji}</span>
                        <span className="text-xs font-black">{reaction.count}</span>
                      </button>
                    );
                  })
                }
              </div>
            )}

            {/* Quick Actions (only if not already in popular list) */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-full border border-slate-200 dark:border-white/10">
              {[
                { emoji: '👍', label: 'Me gusta' },
                { emoji: '❤️', label: 'Me encanta' },
                { emoji: '😂', label: 'Me divierte' },
                { emoji: '😢', label: 'Me entristece' }
              ]
              .filter(({ emoji }) => !news.reactions?.some(r => r.emoji === emoji))
              .map(({ emoji, label }) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="flex items-center justify-center size-9 rounded-full transition-all hover:scale-110 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400"
                  title={label}
                >
                  <span className="text-lg leading-none">{emoji}</span>
                </button>
              ))}
              
              {/* More Emojis Button */}
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-1.5 rounded-full transition-all hover:bg-slate-200 dark:hover:bg-white/10 ${showEmojiPicker ? 'text-primary' : 'text-slate-400'}`}
                title="Más reacciones"
              >
                <Smile size={20} />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-slate-500 dark:text-white/40">
            <MessageSquare size={20} />
            <span className="font-bold">{comments.length} comentarios</span>
          </div>

          {!session && (
            <p className="text-sm text-slate-500 dark:text-white/40 italic ml-auto">
              <Link to="/login" state={{ from: location }} className="text-primary hover:underline font-bold">Inicia sesión</Link> para reaccionar y comentar
            </p>
          )}

          {/* Emoji Picker Popover */}
          {showEmojiPicker && (
            <div className="absolute bottom-full left-0 mb-4 z-50 animate-in zoom-in-95 duration-200 origin-bottom-left">
              <div className="fixed inset-0" onClick={() => setShowEmojiPicker(false)} />
              <div className="relative shadow-2xl rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10">
                <Picker 
                  data={data} 
                  onEmojiSelect={addEmoji} 
                  theme={isDark ? 'dark' : 'light'}
                  locale="es"
                />
              </div>
            </div>
          )}
        </div>

        {/* Comments Section */}
        <section className="mb-16">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
            Comentarios
          </h3>

          {session ? (
            <form onSubmit={handleCommentSubmit} className="mb-10">
              <div className="relative">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escribe tu comentario..."
                  className="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl p-4 pr-12 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 focus:ring-2 focus:ring-primary min-h-[100px] resize-none"
                  required
                />
                <button
                  type="submit"
                  disabled={submittingComment || !newComment.trim()}
                  className="absolute bottom-4 right-4 p-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {submittingComment ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-8 rounded-3xl text-center mb-10 shadow-sm flex flex-col items-center gap-4">
               <div className="size-14 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                 <MessageSquare size={28} />
               </div>
               <div>
                 <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Participa en la conversación</h4>
                 <p className="text-slate-500 dark:text-white/60 mb-6 max-w-sm mx-auto font-medium">
                   Debes estar registrado para compartir tu opinión con la comunidad de {config?.site_name || 'Antena Florida'}.
                 </p>
                  <Link 
                    to="/login" 
                    state={{ from: location }}
                    className="inline-flex items-center gap-3 bg-primary text-background-dark px-8 py-3 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-primary/20"
                  >
                    Iniciar Sesión
                  </Link>
               </div>
            </div>
          )}

          <div className="space-y-6">
            {comments.length > 0 ? (
              (() => {
                const topLevelComments = comments.filter(c => !c.parent_id);
                return topLevelComments.map((comment) => (
                  <div key={comment.id} className="space-y-4">
                    {/* Top level comment */}
                    <div className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden flex-shrink-0">
                            <img 
                              src={getValidImageUrl(comment.profiles?.avatar_url, 'avatar', comment.profiles?.full_name || 'User')} 
                              alt={comment.profiles?.full_name || 'User'} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = getValidImageUrl(null, 'avatar', comment.profiles?.full_name || 'User');
                              }}
                            />
                          </div>
                          <span className="font-black text-slate-900 dark:text-white">
                            {comment.profiles?.full_name || 'Usuario'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-slate-400 dark:text-white/30 uppercase tracking-widest font-bold">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: es })}
                          </span>
                          {session && (
                            <button 
                              onClick={() => {
                                setReplyTo(comment);
                                document.querySelector('textarea')?.focus();
                              }}
                              className="text-xs font-black uppercase tracking-widest text-primary hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1"
                            >
                              <Reply size={14} /> Responder
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-600 dark:text-white/70 leading-relaxed">
                        {comment.content}
                      </p>
                    </div>

                    {/* Replies */}
                    {comments.filter(reply => reply.parent_id === comment.id).map(reply => (
                      <div key={reply.id} className="ml-8 sm:ml-12 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl p-4 shadow-sm relative before:absolute before:left-[-20px] before:top-6 before:w-5 before:h-[1px] before:bg-slate-200 dark:before:bg-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="size-8 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden flex-shrink-0">
                              <img 
                                src={reply.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.profiles?.full_name || 'User')}&background=random`} 
                                alt={reply.profiles?.full_name || 'User'} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.profiles?.full_name || 'User')}&background=random`;
                                }}
                              />
                            </div>
                            <span className="text-sm font-black text-slate-900 dark:text-white">
                              {reply.profiles?.full_name || 'Usuario'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-widest font-bold">
                            {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: es })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-white/70 leading-relaxed">
                          {reply.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ));
              })()
            ) : (
              <p className="text-center text-slate-400 dark:text-white/30 py-8 italic">
                Aún no hay comentarios. ¡Sé el primero en comentar!
              </p>
            )}
          </div>
        </section>

        {/* Related Content */}
        {relatedNews.length > 0 && (
          <section className="pt-12 border-t border-slate-200 dark:border-white/10 mb-20">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                Contenido Relacionado
              </h3>
              <Link 
                to={`/noticias/${news.slug || news.id}/relacionado`}
                className="text-primary font-bold text-sm uppercase tracking-wider hover:underline flex items-center gap-1"
              >
                Ver más <ArrowLeft className="rotate-180" size={16} />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedNews.map((item) => (
                <Link 
                  key={item.id} 
                  to={`/noticias/${item.slug || item.id}`}
                  className="group block bg-white dark:bg-white/5 rounded-2xl overflow-hidden border border-slate-100 dark:border-white/10 hover:border-primary transition-all hover:shadow-xl"
                >
                  <div className="aspect-video overflow-hidden bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                    <img 
                      src={getValidImageUrl(item.image_url, 'news', undefined, undefined, config)} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.currentTarget.src = getValidImageUrl(null, 'news', undefined, undefined, config);
                      }}
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {item.category?.split(',').map(c => c.trim()).filter(Boolean).map((cat, idx) => (
                        <span key={idx} className="text-[10px] font-black uppercase tracking-widest text-primary block">
                          {cat}
                        </span>
                      ))}
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-primary transition-colors mb-2">
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/30">
                      <span className="flex items-center gap-1">
                        <Eye size={10} /> {item.views || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        {item.reactions && item.reactions.length > 0 ? (
                          <>
                            <span>{item.reactions[0].emoji}</span>
                            <span>{item.reactions.reduce((acc, curr) => acc + curr.count, 0)}</span>
                          </>
                        ) : (
                          <>
                            <Smile size={10} />
                            <span>0</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>

      <PostGeneratorModal 
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        newsItem={news}
      />
    </>
  );
}
