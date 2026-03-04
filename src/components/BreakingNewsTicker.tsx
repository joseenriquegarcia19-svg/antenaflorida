import { AlertCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface NewsItem {
  id: string;
  slug?: string;
  title: string;
  created_at: string;
}

interface BreakingNewsTickerProps {
  isTransparent?: boolean;
}

export function BreakingNewsTicker({ isTransparent }: BreakingNewsTickerProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const offsetRef = useRef(0);

  useEffect(() => {
    async function fetchLatestNews() {
      const { data } = await supabase
        .from('news')
        .select('id, title, slug, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) {
        setNews(data);
      }
      setLoading(false);
    }
    fetchLatestNews();
  }, []);

  // Programmatic scroll animation for guaranteed infinite loop
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || news.length === 0) return;

    const speed = 1.2; // pixels per frame (~72px/sec at 60fps) — más fluido

    const animate = () => {
      offsetRef.current += speed;

      // scrollWidth of the inner content = total width of all items
      // We duplicated the items, so half is the "original" set width
      const halfWidth = el.scrollWidth / 2;

      // Once we've scrolled past the first copy, jump back seamlessly
      if (offsetRef.current >= halfWidth) {
        offsetRef.current -= halfWidth;
      }

      el.style.transform = `translate3d(-${offsetRef.current}px, 0, 0)`;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [news]);

  if (loading) return <BreakingNewsTickerSkeleton />;
  if (news.length === 0) return null;

  // Duplicate news enough times to fill wide screens
  const duplicated = [...news, ...news];

  return (
    <div className={`text-white py-2 sm:py-2.5 overflow-hidden relative z-40 group border-y border-white/5 transition-colors duration-300 backdrop-blur-sm ${
      isTransparent 
        ? 'bg-gradient-to-r from-[#D97706]/90 via-[#F68B1F]/90 to-[#EA580C]/90' 
        : 'bg-gradient-to-r from-[#D97706]/95 via-[#F68B1F]/95 to-[#EA580C]/95'
    }`}>
      {/* Shine Effect */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full -skew-x-12 animate-shine opacity-50" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-4 relative z-10">
        <div className="flex items-center gap-2 text-white font-black uppercase tracking-widest text-[10px] sm:text-xs whitespace-nowrap shrink-0">
          <AlertCircle size={14} strokeWidth={3} className="text-white animate-pulse" />
          <span>ÚLTIMA HORA</span>
        </div>

        <div className="h-5 w-px bg-white/30 shrink-0" />

        <div className="flex-1 overflow-hidden relative min-w-0">
          <div
            ref={scrollRef}
            className="flex items-center whitespace-nowrap py-1 will-change-transform"
          >
            {duplicated.map((item, idx) => (
              <Link
                key={`${item.id}-${idx}`}
                to={`/noticias/${item.slug || item.id}`}
                className="inline-flex items-center gap-3 px-6 group/item shrink-0"
              >
                <span className="font-bold text-sm sm:text-base text-white hover:text-white/80 transition-colors drop-shadow-sm flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-white/40 group-hover/item:bg-white group-hover/item:scale-125 transition-all" />
                  {item.title}
                </span>
                <span className="text-[10px] font-black uppercase tracking-tighter text-white/50 group-hover/item:text-white/70 transition-colors">
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BreakingNewsTickerSkeleton() {
  return (
    <div className="bg-gradient-to-r from-[#D97706] via-[#F68B1F] to-[#EA580C] text-white py-2 sm:py-2.5 overflow-hidden relative shadow-lg z-40 group border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-4 relative z-10">
        <div className="flex items-center gap-2 text-white font-black uppercase tracking-widest text-[10px] sm:text-xs whitespace-nowrap shrink-0">
          <AlertCircle size={14} strokeWidth={3} className="text-white animate-pulse" />
          <span>ÚLTIMA HORA</span>
        </div>
        <div className="h-5 w-px bg-white/30 shrink-0" />
        <div className="flex-1 overflow-hidden relative">
          <div className="flex items-center whitespace-nowrap py-1">
            <div className="animate-pulse flex items-center gap-3 px-6">
              <span className="h-4 bg-white/20 rounded-full w-48"></span>
              <span className="h-3 bg-white/20 rounded-full w-24"></span>
            </div>
            <div className="animate-pulse flex items-center gap-3 px-6">
              <span className="h-4 bg-white/20 rounded-full w-64"></span>
              <span className="h-3 bg-white/20 rounded-full w-20"></span>
            </div>
            <div className="animate-pulse flex items-center gap-3 px-6">
              <span className="h-4 bg-white/20 rounded-full w-56"></span>
              <span className="h-3 bg-white/20 rounded-full w-16"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}