import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ArrowLeft, Send, Smile, MessageCircle, Info, Users, Pin, Reply, Trash2, Radio, Share2, AlertTriangle, X, Sun, Moon } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import EmojiPicker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import { Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { isVideo } from '@/lib/utils';
import { Logo } from '@/components/ui/Logo';

import { useLiveStats } from '@/contexts/LiveStatsContext';

interface Reaction {
  emoji: string;
  count: number;
  users: string[]; // user IDs
}

interface ChatMessage {
  id: string;
  user_name: string;
  message: string;
  created_at: string;
  user_id: string | null;
  user_role: string;
  is_pinned: boolean;
  reply_to_id: string | null;
  reactions: Reaction[];
  profiles?: {
    avatar_url?: string;
  };
}

interface LiveChatProps {
  showId: string;
  showTitle: string;
  showDescription?: string;
  showImage?: string;
  startTimestamp?: string; // ISO string
  showSlug?: string;
  teamMembers?: { id: string; name: string; image_url: string; role?: string; social_links?: { [key: string]: string }; email?: string }[];
  endTimestamp?: string;
}

const BAD_WORDS = ['palabrota1', 'palabrota2', 'spam_link_fake']; // Basic list, can be expanded

const CUBA_MIAMI_EMOJIS = [
  { native: '🇨🇺', name: 'Cuba' },
  { native: '🌴', name: 'Palmera' },
  { native: '☕', name: 'Cafecito' },
  { native: '📻', name: 'Radio' },
  { native: '💃', name: 'Salsa' },
  { native: '☀️', name: 'Sol Miami' },
];

export const LiveChat: React.FC<LiveChatProps> = ({ showId, showTitle, startTimestamp, endTimestamp, showSlug, teamMembers }) => {
  const { user } = useAuth();
  const { onlineCount, chatMessageCount } = useLiveStats();
  const { theme, toggleTheme } = useTheme();
  const { config } = useSiteConfig();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [guestName, setGuestName] = useState<string>('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [userStrikes, setUserStrikes] = useState<Record<string, number>>({});
  const [isBlocked, setIsBlocked] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [heartBursts, setHeartBursts] = useState<{ id: number; left: number; delay: number; emoji: string; size: number; rotation: number; text?: string }[]>([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [availableUsers, setAvailableUsers] = useState<{ id: string; full_name: string; is_team?: boolean; is_all?: boolean }[]>([]);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [emojiPickerTarget, setEmojiPickerTarget] = useState<'message' | string>('message');
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    return localStorage.getItem('chat_welcome_dismissed') !== 'true';
  });
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const audioReceiveRef = useRef<HTMLAudioElement | null>(null);
  const audioSendRef = useRef<HTMLAudioElement | null>(null);



  const getGreeting = () => {
    const hour = new Date().getHours();
    const date = new Date();
    const isValentine = date.getMonth() === 1 && date.getDate() === 14;
    const isDayAfterValentine = date.getMonth() === 1 && date.getDate() === 15;

    let greeting = '';
    if (hour >= 5 && hour < 12) greeting = '¡Buenos días! ☀️';
    else if (hour >= 12 && hour < 19) greeting = '¡Buenas tardes! ☕';
    else greeting = '¡Buenas noches! 🌙';

    if (isValentine) return `¡Feliz Día del Amor y la Amistad! ❤️ ${greeting}`;
    if (isDayAfterValentine) return `¡Esperamos que hayas tenido un Feliz Día del Amor! ❤️ ${greeting}`;
    return greeting;
  };

  // Initialize audio for notification
  useEffect(() => {
    audioReceiveRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    audioReceiveRef.current.volume = 0.4;
    
    audioSendRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
    audioSendRef.current.volume = 0.3;
  }, []);

  const playNotificationSound = useCallback((type: 'receive' | 'send' = 'receive') => {
    if (user?.accessibility_settings?.chat_sound_enabled !== false) {
      const audio = type === 'receive' ? audioReceiveRef.current : audioSendRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log('Audio play failed:', e));
      }
    }
  }, [user?.accessibility_settings?.chat_sound_enabled]);

  // Timer Effect
  useEffect(() => {
    if (!endTimestamp) {
      if (!startTimestamp) setTimeLeft('');
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(endTimestamp).getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft('Finalizado');
        // Optionally trigger refresh or visual cue
      } else {
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTimestamp, startTimestamp]);

  // Fetch users for mentions
  useEffect(() => {
    const fetchUsers = async () => {
      // Fetch profiles that are linked to team members
      const { data: teamProfiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, team_member_id')
        .not('team_member_id', 'is', null);

      if (error) {
        console.error('Error fetching team profiles:', error);
        return;
      }

      const teamList = teamProfiles.map(p => ({
        id: p.id,
        full_name: p.full_name || 'Miembro del Equipo',
        is_team: true
      }));

      // Add "todos" option
      const specialOptions = [
        { id: 'all', full_name: 'todos', is_all: true }
      ];

      setAvailableUsers([...specialOptions, ...teamList]);
    };
    fetchUsers();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    // Only registered users can use mentions
    if (!user) {
      setShowMentionSuggestions(false);
      return;
    }

    const lastWord = value.split(' ').pop() || '';
    if (lastWord.startsWith('@')) {
      setShowMentionSuggestions(true);
      setMentionQuery(lastWord.slice(1));
    } else {
      setShowMentionSuggestions(false);
    }
  };

  const insertMention = (targetUser: { id: string; full_name: string }) => {
    const words = newMessage.split(' ');
    words.pop(); // remove the @query
    setNewMessage(words.join(' ') + (words.length > 0 ? ' ' : '') + `@${targetUser.full_name} `);
    setShowMentionSuggestions(false);
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    // Both registered users and guests can react
    if (!user && !guestName) {
      toast('Error: no se pudo identificar al usuario para reaccionar.', 'error');
      return;
    }

    // Get user ID or guest name
    const userId = user?.id || guestName;

    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    // Optimistic UI update
    const updatedReactions = [...(message.reactions || [])];
    const existingReactionIndex = updatedReactions.findIndex(r => r.emoji === emoji);

    if (existingReactionIndex >= 0) {
      const reaction = { ...updatedReactions[existingReactionIndex] };
      const userIndex = reaction.users.indexOf(userId);

      if (userIndex >= 0) {
        // Remove reaction
        reaction.users = reaction.users.filter(id => id !== userId);
        reaction.count--;
        if (reaction.count === 0) {
          updatedReactions.splice(existingReactionIndex, 1);
        } else {
          updatedReactions[existingReactionIndex] = reaction;
        }
      } else {
        // Add reaction
        reaction.users = [...reaction.users, userId];
        reaction.count++;
        updatedReactions[existingReactionIndex] = reaction;
      }
    } else {
      // Create new reaction
      updatedReactions.push({ emoji, count: 1, users: [userId] });
    }

    // Update local state immediately
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, reactions: updatedReactions } : m
    ));

    // Call RPC function
    const { error } = await supabase.rpc('toggle_chat_reaction', {
      p_message_id: messageId,
      p_emoji: emoji,
      p_user_id: userId
    });

    if (error) {
      console.error('Error toggling reaction:', error);
      // Revert on error (optional, but good practice)
      // For now, we'll rely on the realtime subscription to correct it if it fails
      toast('Error al reaccionar', 'error');
    }
    
    setShowReactionPicker(null);
  };

  const dismissWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem('chat_welcome_dismissed', 'true');
  };

  // Trigger emoji animation
  const triggerEmojiBurst = useCallback((emoji: string) => {
    const isCuba = emoji === '🇨🇺';
    const newItems = Array.from({ length: isCuba ? 15 : 25 }).map((_, i) => ({
      id: Math.random() + Date.now() + i,
      left: 5 + Math.random() * 90,
      delay: Math.random() * 1.5,
      emoji: emoji,
      size: 15 + Math.random() * 30,
      rotation: Math.random() * 360,
      text: isCuba && i % 4 === 0 ? 'Viva Cuba Libre Patria y Vida' : undefined
    }));
    setHeartBursts(prev => [...prev, ...newItems]);
    // Cleanup after 4.5 seconds
    setTimeout(() => {
      setHeartBursts(prev => prev.filter(h => !newItems.find(nh => nh.id === h.id)));
    }, 4500);
  }, []);

  const checkMessageForEmojis = useCallback((message: string) => {
    const emojiMap = [
      { trigger: ['❤️', '❤', '♥️'], effect: '❤️' },
      { trigger: ['🔥'], effect: '🔥' },
      { trigger: ['🎉', '🎊'], effect: '🎉' },
      { trigger: ['🇨🇺'], effect: '🇨🇺' },
      { trigger: ['🇺🇸'], effect: '🇺🇸' },
      { trigger: ['☀️', '☀'], effect: '☀️' },
      { trigger: ['📻'], effect: '📻' },
      { trigger: ['☕'], effect: '☕' },
      { trigger: ['💃'], effect: '💃' },
      { trigger: ['🌴'], effect: '🌴' },
      { trigger: ['✨'], effect: '✨' },
      { trigger: ['💯'], effect: '💯' },
      { trigger: ['🙌'], effect: '🙌' },
      { trigger: ['👏'], effect: '👏' },
      { trigger: ['🎈'], effect: '🎈' },
      { trigger: ['🥳'], effect: '🥳' },
      { trigger: ['🚀'], effect: '🚀' },
      { trigger: ['🥂', '🍻'], effect: '🥂' }
    ];

    const trimmedMessage = message.trim();

    // Limit bursts to prevent performance issues
    let burstsCount = 0;
    for (const item of emojiMap) {
      if (item.trigger.some(t => trimmedMessage.includes(t))) {
        triggerEmojiBurst(item.effect);
        burstsCount++;
        if (burstsCount >= 2) break; // Max 2 different bursts per message
      }
    }
  }, [triggerEmojiBurst]);

  // Click outside pickers to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (showReactionPicker && !document.querySelector('.reaction-button-container')?.contains(event.target as Node)) {
        // Simple way: if clicked outside picker areas
        if (!(event.target as HTMLElement).closest('.reaction-button')) {
           setShowReactionPicker(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showReactionPicker]);

  useEffect(() => {
    const blockedUntil = localStorage.getItem('chat_blocked_until');
    if (blockedUntil && new Date(blockedUntil) > new Date()) {
      setIsBlocked(true);
    }
  }, []);



  useEffect(() => {
    const handleResize = () => {
      // Just a simple refresh if needed, but flex-1 should handle it
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filterMessage = (text: string) => {
    let filtered = text;
    BAD_WORDS.forEach(word => {
      const regex = new RegExp(word, 'gi');
      filtered = filtered.replace(regex, '***');
    });
    return filtered;
  };

  const renderMessageContent = (msg: ChatMessage) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    // Create a regex for mentions based on available team members + todos
    const teamNames = availableUsers.map(u => u.is_all ? 'todos' : u.full_name).filter(Boolean);
    const escapedNames = teamNames.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const mentionRegex = escapedNames.length > 0 
      ? new RegExp(`(@(?:${escapedNames.join('|')}))`, 'gi')
      : null;
    
    const parts = msg.message.split(urlRegex);
    
    return (
      <div className="space-y-2">
        <p className="whitespace-pre-wrap">
          {parts.map((part, i) => {
            if (part.match(urlRegex)) {
              return (
                <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline break-all">
                  {part}
                </a>
              );
            }
            
            if (!mentionRegex) return part;
            
            // Handle mentions in non-url parts
            const subParts = part.split(mentionRegex);
            return subParts.map((subPart, j) => {
              if (subPart.match(mentionRegex)) {
                const isTodos = subPart.toLowerCase() === '@todos';
                return (
                  <span key={`${i}-${j}`} className={`font-black px-1 rounded ${isTodos ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' : 'bg-primary/20 text-primary'}`}>
                    {subPart}
                  </span>
                );
              }
              return subPart;
            });
          })}
        </p>
        {msg.message.includes('youtube.com/watch') && (
          <div className="mt-2 rounded-lg overflow-hidden border border-white/10 aspect-video bg-black/20 flex items-center justify-center">
            <Radio size={24} className="text-primary/40 animate-pulse" />
            <span className="text-[10px] ml-2 text-white/40 font-bold uppercase">Video de YouTube</span>
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (!user) {
      let savedName = localStorage.getItem('chat_guest_name');
      if (!savedName) {
        const randomId = Math.floor(Math.random() * 9999);
        savedName = `antenaflorida_${randomId}`;
        localStorage.setItem('chat_guest_name', savedName);
      }
      setGuestName(savedName);
    }
  }, [user]);

  useEffect(() => {
    if (!showId) return;

    const fetchMessages = async () => {
      // Fetch messages since last 24 hours
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // We want to fetch messages for THIS show OR any gap messages if this is the 24/7 show
      const { data, error } = await supabase
        .from('live_chat_messages')
        .select(`
          *,
          profiles (
            avatar_url,
            team_members (
              image_url
            )
          )
        `)
        .or(`show_id.eq.${showId},show_id.like.gap-%`)
        .gt('created_at', since)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        // Normalize profiles data to get a single avatar_url
        const normalizedData = (data || []).map(m => {
          const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
          const teamMember = profile?.team_members;
          const teamImageUrl = Array.isArray(teamMember) ? teamMember[0]?.image_url : teamMember?.image_url;
          
          return {
            ...m,
            profiles: profile ? {
              avatar_url: profile.avatar_url || teamImageUrl
            } : null
          };
        });
        setMessages(normalizedData as ChatMessage[]);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat:${showId}`)
      .on('presence', { event: 'sync' }, () => {
        // Optional: Update local count if we want to show it in the chat header too
        // const state = channel.presenceState();
        // const count = Object.keys(state).length;
        // setOnlineCount(count); 
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'live_chat_messages'
        // REMOVED filter on server to handle both UUIDs and gap IDs in the callback
      }, async (payload) => {
        // Manual filter: match same show OR any gap message if we are on the 24/7 show channel
        const isFromThisShow = payload.new.show_id === showId || payload.new.show_id?.startsWith('gap-');
        if (!isFromThisShow) return;
        
        const newMessage = payload.new as ChatMessage;
        
        // Fetch user profile for the new message if it's a registered user
        if (newMessage.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url, team_members(image_url)')
            .eq('id', newMessage.user_id)
            .single();
          
          if (profile) {
            const teamMember = Array.isArray(profile.team_members) ? profile.team_members[0] : profile.team_members;
            newMessage.profiles = { 
              avatar_url: profile.avatar_url || teamMember?.image_url 
            };
          }
        }

        setMessages(prev => {
          if (prev.find(m => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });

        // Trigger effects
        checkMessageForEmojis(newMessage.message);
        
        if (newMessage.user_id !== user?.id) {
          playNotificationSound();
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'live_chat_messages'
      }, payload => {
        // Manual filter
        const isFromThisShow = payload.new.show_id === showId || payload.new.show_id?.startsWith('gap-') || !payload.new.show_id;
        if (!isFromThisShow) return;

        setMessages(prev => prev.map(m => {
          if (m.id === payload.new.id) {
            // Check if new reactions were added to trigger animation for everyone
            const newReactions = (payload.new.reactions || []) as Reaction[];
            const oldReactions = (m.reactions || []) as Reaction[];
            
            newReactions.forEach(nr => {
              const or = oldReactions.find(r => r.emoji === nr.emoji);
              if (!or || nr.count > or.count) {
                // Trigger burst for new reactions
                triggerEmojiBurst(nr.emoji);
              }
            });
            
            // PRESERVE profiles (avatars) from old message if not present in new payload
            return { 
              ...m, 
              ...payload.new,
              profiles: payload.new.profiles || m.profiles 
            };
          }
          return m;
        }));
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'live_chat_messages'
      }, payload => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const name = user ? (user.full_name || user.email?.split('@')[0] || 'Usuario') : guestName;
          await channel.track({
            online_at: new Date().toISOString(),
            user_id: user?.id || 'guest',
            user_name: name
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showId, checkMessageForEmojis, triggerEmojiBurst, playNotificationSound, startTimestamp, user, guestName]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !showId) return;

    if (isBlocked) {
      toast('Estás bloqueado por mal comportamiento.', 'error');
      return;
    }

    const name = user ? (user.full_name || user.email?.split('@')[0] || 'Usuario') : guestName;
    const messageText = filterMessage(newMessage.trim());
    checkMessageForEmojis(messageText); // Trigger local effect for immediate feedback
    const role = user?.role || 'user';
    
    setNewMessage('');
    const currentReplyId = replyTo?.id || null;
    setReplyTo(null);

    // Mentions and emojis will be handled by the subscription for everyone
    
    // Handle mentions notifications
    if (user) {
      const lowerMessage = messageText.toLowerCase();
      const notifiedUserIds = new Set<string>();

      // Check for @todos
      if (lowerMessage.includes('@todos')) {
        const teamUsers = availableUsers.filter(u => u.is_team && u.id !== user.id);
        for (const targetUser of teamUsers) {
          if (!notifiedUserIds.has(targetUser.id)) {
            await supabase.from('notifications').insert({
              user_id: targetUser.id,
              title: '¡Mención general!',
              message: `${name} mencionó a todos en el chat: "${messageText.slice(0, 50)}${messageText.length > 50 ? '...' : ''}"`,
              type: 'mention',
              link_url: window.location.pathname
            });
            notifiedUserIds.add(targetUser.id);
          }
        }
      }

      // Check for specific team members
      const teamUsers = availableUsers.filter(u => u.is_team && u.id !== user.id);
      for (const targetUser of teamUsers) {
        const mentionTag = `@${targetUser.full_name.toLowerCase()}`;
        if (lowerMessage.includes(mentionTag) && !notifiedUserIds.has(targetUser.id)) {
          await supabase.from('notifications').insert({
            user_id: targetUser.id,
            title: '¡Te han mencionado!',
            message: `${name} te mencionó en el chat: "${messageText.slice(0, 50)}${messageText.length > 50 ? '...' : ''}"`,
            type: 'mention',
            link_url: window.location.pathname
          });
          notifiedUserIds.add(targetUser.id);
        }
      }
    }

    const { data, error } = await supabase.from('live_chat_messages').insert({
      show_id: showId,
      user_id: user?.id || null,
      user_name: name,
      message: messageText,
      user_role: role,
      reply_to_id: currentReplyId
    }).select('*, profiles(avatar_url)').single();

    if (error) console.error('Error sending message:', error);
    else if (data) {
      playNotificationSound('send');
      setMessages(prev => {
        if (prev.find(m => m.id === data.id)) return prev;
        const newMessage = data as ChatMessage;
        return [...prev, newMessage];
      });
    }
  };

  const togglePin = async (msg: ChatMessage) => {
    if (user?.role !== 'admin' && user?.role !== 'editor') return;
    
    const { error } = await supabase
      .from('live_chat_messages')
      .update({ is_pinned: !msg.is_pinned })
      .eq('id', msg.id);
      
    if (error) {
      toast('Error al anclar mensaje', 'error');
    } else {
      toast(msg.is_pinned ? 'Mensaje desanclado' : 'Mensaje anclado', 'success');
    }
  };

  const deleteMessage = async (msg: ChatMessage) => {
    if (user?.role !== 'admin' && user?.role !== 'editor') return;
    
    const { error } = await supabase
      .from('live_chat_messages')
      .delete()
      .eq('id', msg.id);
      
    if (error) {
      toast('Error al eliminar mensaje', 'error');
    } else {
      const userId = msg.user_id || msg.user_name;
      const currentStrikes = (userStrikes[userId] || 0) + 1;
      
      setUserStrikes(prev => ({ ...prev, [userId]: currentStrikes }));

      if (currentStrikes >= 3) {
        toast(`Usuario ${msg.user_name} expulsado por exceso de strikes.`, 'error');
        if (msg.user_id === user?.id || msg.user_name === guestName) {
          const blockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          localStorage.setItem('chat_blocked_until', blockedUntil);
          setIsBlocked(true);
        }
      } else {
        const remaining = 3 - currentStrikes;
        toast(`Strike para ${msg.user_name}. (${remaining} restantes)`, 'warning');
      }
    }
  };

  const addEmoji = (emoji: { native: string }) => {
    if (emojiPickerTarget === 'message') {
      setNewMessage(prev => prev + emoji.native);
      // Removed immediate burst to only happen when sending
    } else {
      handleReaction(emojiPickerTarget, emoji.native);
      setShowEmojiPicker(false);
    }
  };

  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`msg-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
      setTimeout(() => element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2'), 2000);
    }
  };

  const shareChat = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      toast('¡Enlace copiado correctamente!', 'success');
    } catch (err) {
      toast('No se pudo copiar el enlace', 'error');
      console.error('Error sharing:', err);
    }
  };

  const pinnedMessage = messages.find(m => m.is_pinned);

  return (
    <div 
      className="flex flex-col h-full bg-transparent backdrop-blur-3xl rounded-[2.5rem] border border-black/10 dark:border-white/10 overflow-hidden relative overscroll-none transition-all duration-500 shadow-sm"
      role="log"
      aria-label="Chat en vivo"
    >
      {/* Heart Animation Overlay */}
      <div className="absolute inset-0 pointer-events-none z-[60] overflow-hidden">
        {heartBursts.map(h => (
          !h.text && (
            <div 
              key={h.id}
              className="absolute bottom-0 animate-float-up opacity-0 text-2xl"
              style={{ 
                left: `${h.left}%`, 
                animationDelay: `${h.delay}s`,
                fontSize: `${h.size}px`,
                filter: 'drop-shadow(0 0 10px rgba(var(--primary-rgb), 0.3))',
                '--rotation': `${h.rotation}deg`
              } as React.CSSProperties}
            >
              {h.emoji}
            </div>
          )
        ))}
      </div>

      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0.5) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-700px) scale(1.5) rotate(var(--rotation)); opacity: 0; }
        }
        @keyframes textUp {
          0% { transform: translateY(0px) scale(0.5); opacity: 0; }
          15% { transform: translateY(-20px) scale(1.1); opacity: 1; }
          25% { transform: translateY(-30px) scale(1); opacity: 1; }
          80% { transform: translateY(-60px) scale(1); opacity: 1; }
          100% { transform: translateY(-80px) scale(0.8); opacity: 0; }
        }
        .animate-float-up {
          animation: floatUp 3s ease-out forwards;
        }
        .animate-cuba-text-up {
          animation: textUp 4.5s ease-out forwards;
        }
        .reaction-button {
          @apply p-1.5 text-slate-400 dark:text-white/40 hover:text-primary transition-colors bg-black/5 dark:bg-white/5 rounded-full hover:bg-primary/20 backdrop-blur-md;
        }
        .glass-message {
          @apply backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-lg;
        }
      `}</style>

      {/* Unified consolidated header */}
      <div className="px-3 sm:px-6 py-2 sm:py-4 border-b border-black/5 dark:border-white/5 bg-white/20 dark:bg-black/40 backdrop-blur-xl flex items-center justify-between shrink-0 relative z-50 rounded-t-[2.5rem]">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link 
            to="/" 
            className="p-2 sm:p-2.5 rounded-xl bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/10 text-slate-600 dark:text-white hover:bg-primary hover:text-white dark:hover:text-background-dark transition-all shadow-sm shrink-0"
            title="Volver al Portal"
          >
            <ArrowLeft size={16} className="sm:size-[18px]" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className={`size-8 sm:size-10 rounded-full overflow-hidden flex items-center justify-center shadow-sm shrink-0 ${
              isVideo(config?.logo_url) ? 'bg-white/40 dark:bg-white/20 border border-black/10 dark:border-white/20' : 'bg-transparent border-0'
            }`}>
               <Logo className="w-full h-full object-cover" />
            </div>
            <div className="hidden lg:flex flex-col min-w-0">
               <div className="flex items-center gap-2">
                 <h1 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none truncate">
                    {config?.site_name || 'Antena Florida'}
                 </h1>
                 <div className="flex items-center gap-1.5 bg-red-500 text-white px-2 py-0.5 rounded-full shadow-lg shadow-red-500/20 shrink-0">
                    <div className="size-1.5 bg-white rounded-full animate-pulse" />
                    <span className="text-[8px] font-black uppercase tracking-widest">LIVE</span>
                 </div>
               </div>
               <span className="text-[9px] font-bold text-primary uppercase tracking-widest mt-0.5 truncate">
                  {config?.slogan || 'La señal que nos une'}
               </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:border-l border-black/10 dark:border-white/10 md:pl-4 min-w-0">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                 <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none truncate">
                   Chat en Vivo
                 </h2>
                 <div className="md:hidden flex items-center gap-1.5 bg-red-500 text-white px-1.5 py-0.5 rounded-full shadow-lg shadow-red-500/20 shrink-0">
                    <div className="size-1 bg-white rounded-full animate-pulse" />
                    <span className="text-[7px] font-black uppercase tracking-widest">LIVE</span>
                 </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest truncate max-w-[120px]">
                  {showSlug ? (
                    <Link to={`/horario/${showSlug}`} className="hover:text-primary transition-colors">
                      {showTitle}
                    </Link>
                  ) : showTitle}
                </span>
                
                {/* Team Members in Header - Always visible with responsive count */}
                {teamMembers && teamMembers.length > 0 && (
                   <div className="flex items-center -space-x-1.5 ml-1 border-l border-black/10 dark:border-white/10 pl-2 overflow-hidden">
                      {teamMembers.slice(0, 3).map(member => (
                         <Link key={member.id} to={`/equipo/${member.id}`} title={member.name} className="flex items-center gap-1 sm:gap-1.5 relative z-10 hover:z-20 shrink-0 group">
                            <div className="size-3.5 sm:size-5 rounded-full overflow-hidden border border-black/20 dark:border-white/30 group-hover:border-primary transition-colors bg-black/5 dark:bg-white/10 shrink-0">
                               <img 
                                 src={member.image_url} 
                                 alt={member.name} 
                                 className="w-full h-full object-cover" 
                               />
                            </div>
                            <span className="text-[8px] sm:text-[9px] font-bold text-slate-600 dark:text-white/60 group-hover:text-primary transition-colors truncate max-w-[40px] sm:max-w-[80px]">{member.name.split(' ')[0]}</span>
                         </Link>
                      ))}
                      {teamMembers.length > 3 && (
                        <div className="size-4 rounded-full bg-primary/10 flex items-center justify-center text-[7px] font-black text-primary border border-primary/20 ml-1 shrink-0">
                           +{teamMembers.length - 3}
                        </div>
                      )}
                   </div>
                )}

                <div className="flex items-center gap-1.5 sm:gap-2 ml-1 shrink-0">
                  <span className="flex items-center gap-0.5 sm:gap-1 text-[7px] sm:text-[8px] font-black bg-black/5 dark:bg-white/5 px-1.5 sm:px-2 py-0.5 rounded-full text-slate-500 dark:text-white/40" title="Personas en línea">
                    <Users size={8} className="sm:size-2.5" /> {onlineCount}
                  </span>
                  <span className="flex items-center gap-0.5 sm:gap-1 text-[7px] sm:text-[8px] font-black bg-black/5 dark:bg-white/5 px-1.5 sm:px-2 py-0.5 rounded-full text-slate-500 dark:text-white/40" title="Mensajes en el chat">
                    <MessageCircle size={8} className="sm:size-2.5" /> {chatMessageCount}
                  </span>
                  {timeLeft && (
                     <span className="text-[7px] sm:text-[8px] font-black text-primary bg-primary/10 px-1.5 sm:px-2 py-0.5 rounded-full border border-primary/20 animate-pulse whitespace-nowrap hidden sm:inline-block">
                       {timeLeft}
                     </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
           <button 
             onClick={() => setShowHelp(true)}
             className="p-2 sm:p-2.5 hover:bg-primary/20 hover:text-primary rounded-xl transition-all bg-black/5 dark:bg-white/5 text-slate-400 dark:text-white/40 shadow-sm border border-black/5 dark:border-white/5"
             title="Ayuda y Reglas"
           >
             <Info size={16} className="sm:size-[18px]" />
           </button>
           <button 
             onClick={toggleTheme}
             className="p-2 sm:p-2.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white border border-black/5 dark:border-white/5 shadow-inner"
             title={theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
           >
             {theme === 'dark' ? <Sun size={16} className="sm:size-[18px]" /> : <Moon size={16} className="sm:size-[18px]" />}
           </button>
           <button 
             onClick={shareChat}
             className="p-2 sm:p-2.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white border border-black/5 dark:border-white/5"
             title="Compartir Chat"
           >
             <Share2 size={16} className="sm:size-[18px]" />
           </button>
        </div>
      </div>

      {pinnedMessage && (
        <div className="bg-primary/10 dark:bg-white/5 backdrop-blur-xl border-b border-primary/30 p-4 flex items-start gap-4 animate-in slide-in-from-top duration-300 relative z-40">
          <div className="size-8 bg-primary/20 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            <Pin size={16} className="text-primary fill-current" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-0.5">Mensaje Destacado</p>
            <p className="text-sm font-medium text-slate-800 dark:text-white/90 line-clamp-2">
              <span className="font-bold text-primary">{pinnedMessage.user_name}:</span> {pinnedMessage.message}
            </p>
          </div>
          {(user?.role === 'admin' || user?.role === 'editor') && (
            <button 
              onClick={() => togglePin(pinnedMessage)} 
              className="text-slate-400 hover:text-red-500 transition-colors p-1"
              title="Quitar mensaje fijado"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )}

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 custom-scrollbar bg-transparent relative overscroll-contain"
        aria-live="polite"
      >
        {/* Welcome Message Card */}
        {showWelcome && (
          <div className="bg-primary/5 dark:bg-white/5 backdrop-blur-xl border border-primary/10 dark:border-white/10 rounded-[2rem] p-4 sm:p-6 mb-6 shadow-sm transition-colors relative group/welcome">
            <button 
              onClick={dismissWelcome}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/5 dark:bg-white/5 text-slate-400 dark:text-white/40 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover/welcome:opacity-100"
              title="Cerrar bienvenida"
            >
              <X size={14} />
            </button>
            <div className="flex items-center gap-4 mb-3">
              <div className="size-8 sm:size-10 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                <Radio size={16} className="sm:size-5 text-background-dark animate-pulse" />
              </div>
              <h4 className="font-black uppercase tracking-tighter text-sm sm:text-base text-slate-900 dark:text-white">
                {getGreeting()}
              </h4>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-600 dark:text-white/70 leading-relaxed font-bold">
              ¡Qué alegría que nos acompañes! Estás en sintonía con <span className="text-primary uppercase">{showTitle}</span>. 
              Disfruta, participa y comparte con nuestra comunidad.
            </p>
            <div className="mt-3 pt-3 border-t border-black/5 dark:border-primary/10 flex items-center gap-2">
              <AlertTriangle size={12} className="text-red-500" />
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest leading-tight">
                Recuerda mantener el respeto. El sistema de strikes está activo.
              </p>
            </div>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-white/20 text-center p-8">
            <MessageCircle size={64} className="mb-4 opacity-10" />
            <p className="text-xs font-black uppercase tracking-widest opacity-40">¡Inicia la conversación!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isAdmin = msg.user_role === 'admin' || msg.user_role === 'editor';
            const isMe = (user && msg.user_id === user?.id) || (!user && msg.user_name === guestName);
            const isRegistered = msg.user_id !== null;
            const parentMsg = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null;

            return (
              <div 
                key={msg.id} 
                className={`flex flex-col group ${isRegistered ? 'items-end' : 'items-start'}`}
              >
                {parentMsg && (
                  <button 
                    onClick={() => scrollToMessage(parentMsg.id)}
                    className={`text-[9px] mb-1 flex items-center gap-1 opacity-60 hover:opacity-100 hover:text-primary transition-all italic ${isRegistered ? 'mr-2' : 'ml-2'}`}
                    title={`Ver mensaje original de ${parentMsg.user_name}`}
                  >
                    <Reply size={8} /> en respuesta a <span className="font-bold underline">@{parentMsg.user_name}</span>
                  </button>
                )}

                <div 
                  id={`msg-${msg.id}`}
                  className={`flex items-center gap-2 mb-1 ${isRegistered ? 'flex-row-reverse' : 'flex-row'} transition-all duration-500 rounded-xl p-0.5`}
                >
                  <div className="size-6 rounded-full overflow-hidden bg-slate-200 dark:bg-white/10 shrink-0 border border-black/5 dark:border-white/10">
                    <img 
                      src={msg.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.user_name)}&background=random`} 
                      alt={msg.user_name} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.user_name)}&background=random`;
                      }}
                    />
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${isAdmin ? 'text-primary' : (isMe ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-white/50')}`}>
                    {isAdmin && '★ '} {msg.user_name}
                  </span>
                  <span className="text-[8px] text-slate-400 dark:text-white/20 font-bold">
                    {format(new Date(msg.created_at), 'HH:mm')}
                  </span>
                </div>

                <div className={`relative flex items-center gap-2 ${isRegistered ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`px-4 py-3 rounded-[1.5rem] text-sm font-medium max-w-[280px] sm:max-w-[450px] break-words transition-all glass-message shadow-md
                    ${isAdmin 
                      ? 'bg-primary/20 dark:bg-primary/20 text-slate-900 dark:text-primary border-primary/30 rounded-tr-none' 
                      : (isMe 
                        ? 'bg-blue-600/20 dark:bg-blue-600/20 text-blue-900 dark:text-blue-100 border-blue-500/40 rounded-tr-none font-extrabold' 
                        : (isRegistered
                            ? 'bg-white/90 dark:bg-white/10 text-slate-900 dark:text-white border-black/10 dark:border-white/10 rounded-tr-none shadow-sm'
                            : 'bg-slate-50/90 dark:bg-white/20 text-slate-900 dark:text-white border-black/10 dark:border-white/20 rounded-tl-none shadow-sm')
                        )
                    }`}>
                    {renderMessageContent(msg)}
                    
                    {/* Reactions Display */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className={`flex flex-wrap gap-1 mt-2 ${isRegistered ? 'justify-end' : 'justify-start'}`}>
                        {msg.reactions.map((r, i) => (
                          <button
                            key={i}
                            onClick={() => handleReaction(msg.id, r.emoji)}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border transition-all
                              ${r.users.includes(user?.id || guestName || '') 
                                 ? 'bg-primary/20 border-primary text-primary' 
                                 : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white'}`}
                          >
                            <span>{r.emoji}</span>
                            <span className="font-bold">{r.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity relative`}>
                    <button 
                      onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                      className="reaction-button"
                      title="Reaccionar"
                    >
                      <Smile size={16} />
                    </button>
                    
                    {showReactionPicker === msg.id && (
                      <div className={`absolute bottom-full mb-3 bg-[#0a0a0c]/90 backdrop-blur-2xl border border-white/10 p-1.5 rounded-2xl shadow-3xl flex items-center gap-1.5 z-[70] animate-in zoom-in-95 duration-200 ${isRegistered ? 'right-0' : 'left-0'}`}>
                  {['👍', '❤️', '😂', '😢', '🔥'].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(msg.id, emoji)}
                      className="p-2 hover:bg-white/10 rounded-xl text-xl transition-all hover:scale-125"
                      title={`Reaccionar con ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                        <button
                          onClick={() => {
                            setEmojiPickerTarget(msg.id);
                            setShowEmojiPicker(true);
                            setShowReactionPicker(null);
                          }}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-sm font-bold text-primary"
                        >
                          +
                        </button>
                      </div>
                    )}

                    <button 
                      onClick={() => setReplyTo(msg)}
                      className="reaction-button"
                      title="Responder"
                    >
                      <Reply size={16} />
                    </button>
                    {(user?.role === 'admin' || user?.role === 'editor') && (
                      <>
                        <button 
                          onClick={() => togglePin(msg)}
                          className={`p-1.5 transition-colors bg-white/5 rounded-full ${msg.is_pinned ? 'text-primary' : 'text-slate-400 hover:text-primary'}`}
                          title="Fijar mensaje"
                        >
                          <Pin size={12} className={msg.is_pinned ? 'fill-current' : ''} />
                        </button>
                        <button 
                          onClick={() => deleteMessage(msg)}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors bg-white/5 rounded-full"
                          title="Eliminar mensaje"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!user && (
        <div className="px-4 py-2 bg-black/5 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Info size={14} className="text-primary shrink-0" />
            <p className="text-[10px] font-bold text-slate-500 dark:text-white/40 leading-tight">
              Chateas como <span className="text-primary">{guestName}</span>. 
              ¿Quieres ser <span className="text-primary uppercase tracking-tighter">VIP</span>? <Link to="/login" className="text-primary underline hover:opacity-80">Regístrate</Link>
            </p>
          </div>
          <div className="text-[9px] text-slate-400 dark:text-white/30 pl-7 leading-tight">
            Los invitados pueden leer, enviar mensajes y reaccionar, pero no pueden usar menciones (@).
          </div>
        </div>
      )}

      <div className="p-4 bg-white/60 dark:bg-black/60 backdrop-blur-xl border-t border-black/10 dark:border-white/10 relative z-40 rounded-b-[2.5rem] transition-colors">
        {replyTo && (
          <div className="mb-3 p-3 bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="size-8 bg-primary/20 rounded-xl flex items-center justify-center shadow-sm">
                <Reply size={14} className="text-primary" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Respondiendo a {replyTo.user_name}</span>
                <p className="text-xs text-slate-600 dark:text-white/60 truncate font-medium">
                  {replyTo.message}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setReplyTo(null)} 
              className="p-2 text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all" 
              title="Cancelar respuesta"
              aria-label="Cancelar respuesta"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute bottom-full right-4 mb-4 z-50">
            <div className="bg-white/95 dark:bg-slate-900/95 border border-black/10 dark:border-white/10 rounded-2xl p-2 mb-2 flex items-center gap-2 overflow-x-auto no-scrollbar max-w-[300px] shadow-3xl backdrop-blur-2xl">
              {CUBA_MIAMI_EMOJIS.map((e, i) => (
                <button 
                  key={i} 
                  onClick={() => addEmoji(e)} 
                  className="size-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors text-lg"
                  title={e.name}
                >
                  {e.native}
                </button>
              ))}
            </div>
            <EmojiPicker 
              data={data} 
              onEmojiSelect={addEmoji} 
              theme={theme === 'dark' ? 'dark' : 'light'}
              locale="es"
              set="native"
            />
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => {
              setEmojiPickerTarget('message');
              setShowEmojiPicker(!showEmojiPicker);
            }}
            className="p-2 text-slate-400 hover:text-primary transition-colors bg-slate-100 dark:bg-white/5 rounded-xl"
            aria-label="Abrir selector de emojis"
            aria-expanded={showEmojiPicker ? "true" : "false"}
            title="SMILE"
          >
            <Smile size={24} />
          </button>
          <div className="flex-1 relative">
            {showMentionSuggestions && (
              <div 
                className="absolute bottom-full left-0 w-full mb-2 bg-white/95 dark:bg-[#0a0a0c]/90 backdrop-blur-2xl border border-black/5 dark:border-white/10 rounded-[2rem] shadow-3xl max-h-64 overflow-y-auto no-scrollbar z-[80] animate-in slide-in-from-bottom-2 duration-300 transition-colors"
                role="listbox"
                aria-label="Sugerencias de mención"
              >
                <div className="p-4 border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 sticky top-0 z-10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Mencionar usuario</p>
                </div>
                {availableUsers
                  .filter(u => u.full_name && u.full_name.toLowerCase().includes(mentionQuery.toLowerCase()))
                  .sort((a, b) => {
                    if (a.is_all) return -1;
                    if (b.is_all) return 1;
                    return 0;
                  })
                  .map(u => (
                    <div
                      key={u.id}
                      role="option"
                      aria-selected="false"
                      onClick={() => insertMention(u)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-primary/5 transition-colors text-left group cursor-pointer"
                    >
                      <div className={`size-8 rounded-full flex items-center justify-center font-black text-xs transition-all
                        ${u.is_all 
                          ? 'bg-yellow-500 text-white group-hover:bg-yellow-600' 
                          : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white'}`}>
                        {u.is_all ? <Users size={14} /> : u.full_name.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700 dark:text-white">
                          {u.is_all ? '@todos' : u.full_name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {u.is_all ? 'Menciona a todo el equipo' : 'Miembro del Equipo'}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
            
            {/* Cuba Text Animation Overlay specific to typing area */}
            <div className="absolute -top-16 left-0 right-0 pointer-events-none z-[60] flex items-end justify-center overflow-visible h-16">
              {heartBursts.map(h => (
                h.text && (
                  <div 
                    key={h.id}
                    className="absolute bottom-0 animate-cuba-text-up opacity-0 whitespace-nowrap font-black uppercase tracking-widest text-[#E42313] drop-shadow-[0_0_10px_rgba(255,255,255,1)]"
                    style={{ 
                      animationDelay: `${h.delay}s`,
                    } as React.CSSProperties}
                  >
                    <div className="flex flex-col items-center justify-center bg-white/20 dark:bg-black/40 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/30 shadow-2xl">
                      <span className="text-[10px] sm:text-xs font-black drop-shadow-md pb-1">{h.text}</span>
                      <span className="text-2xl mt-1 drop-shadow-lg">{h.emoji}</span>
                    </div>
                  </div>
                )
              ))}
            </div>

            <input 
              type="text"
              placeholder="Escribe un mensaje..."
              value={newMessage}
              onChange={handleInputChange}
              className="w-full bg-white/10 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 font-medium shadow-inner relative z-10"
            />
          </div>
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="size-12 bg-primary text-background-dark rounded-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-lg shadow-primary/20 flex items-center justify-center shrink-0"
            aria-label="Enviar mensaje"
            title="Enviar"
          >
            <Send size={24} />
          </button>
        </form>
      </div>

      {/* Help & Rules Modal (Fixed and Centered on Page) */}
      {showHelp && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowHelp(false)} />
          <div className="relative bg-white dark:bg-[#111115] rounded-[2.5rem] shadow-2xl p-8 border border-white/10 animate-in zoom-in-95 duration-300 max-w-md w-full overflow-hidden overscroll-contain">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="size-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <Info size={24} className="text-background-dark" />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-black uppercase tracking-tighter text-xl text-slate-900 dark:text-white leading-tight">Ayuda y Reglas</h3>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Guía de la Comunidad</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHelp(false)}
                className="size-10 flex items-center justify-center bg-slate-100 dark:bg-white/5 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-sm border border-transparent hover:border-red-600"
                title="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-8">
              <section>
                <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-3">
                  <div className="size-1.5 bg-primary rounded-full animate-pulse" />
                  Reglas del Chat
                </h4>
                <ul className="space-y-3 text-sm text-slate-600 dark:text-white/60 font-medium">
                  <li className="flex items-start gap-3 italic leading-relaxed">• Mantén un lenguaje apropiado y cordial.</li>
                  <li className="flex items-start gap-3 italic leading-relaxed">• No se permite el spam ni enlaces maliciosos.</li>
                  <li className="flex items-start gap-3 italic leading-relaxed">• Respeta a los locutores y oyentes.</li>
                </ul>
              </section>

              <section className="bg-red-500/5 dark:bg-red-500/10 p-5 rounded-3xl border border-red-500/20">
                <h4 className="text-xs font-black uppercase tracking-widest text-red-500 mb-4 flex items-center gap-3">
                  <AlertTriangle size={16} />
                  Sistema de Moderación
                </h4>
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 dark:text-white/70 leading-relaxed">
                    Si un moderador elimina 3 de tus mensajes, serás bloqueado automáticamente:
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map(s => (
                      <div key={s} className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 ${s === 3 ? 'bg-red-500 text-white border-red-600 shadow-lg shadow-red-500/20' : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/10'}`}>
                        <span className="text-[9px] font-black uppercase tracking-tighter">Aviso {s}</span>
                        <AlertTriangle size={14} />
                        {s === 3 && <span className="text-[7px] font-black uppercase text-center leading-tight">Bloqueo</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <button 
                onClick={() => setShowHelp(false)}
                className="w-full py-4 bg-primary text-background-dark font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                ¡Entendido!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};