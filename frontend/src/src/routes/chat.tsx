import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { 
  Send, Phone, Video, Image as ImageIcon, Smile, 
  Lock, Check, CheckCheck, Edit2, Reply, Trash2, 
  Copy, X, ImagePlus, Loader2, MoreVertical
} from "lucide-react";
import { useCoupleStore, Message } from "@/store/coupleStore";
import { useAuthStore } from "@/store/authStore";
import EmojiPicker from 'emoji-picker-react';

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

const reactions = ["❤️", "😂", "🥺", "😍", "😡", "👍", "🔥"];

function ChatPage() {
  const { user } = useAuthStore();
  const { 
    messages, fetchMessages, sendMessage, partner, onlineUsers, 
    typingUser, emitTyping, deleteMessage, editMessage, reactToMessage, markMessagesSeen 
  } = useCoupleStore();
  
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  
  // GIF states
  const [gifSearch, setGifSearch] = useState("");
  const [gifs, setGifs] = useState<any[]>([]);
  const [isSearchingGifs, setIsSearchingGifs] = useState(false);
  
  // Message actions
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showOptions, setShowOptions] = useState(false);

  const handleClearChat = async () => {
    if (window.confirm("Are you sure you want to permanently delete ALL messages for both of you? This cannot be undone.")) {
      await useCoupleStore.getState().clearChat();
      setShowOptions(false);
    }
  };
  
  // Mark seen when messages load or change
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    markMessagesSeen();
  }, [messages.length, markMessagesSeen]);

  // Scroll logic
  useEffect(() => {
    // Basic auto-scroll on new message
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Handle Input Auto-expand
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    emitTyping();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const resetInput = () => {
    setInput("");
    setFile(null);
    setReplyingTo(null);
    setEditingMessage(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !file) return;

    if (editingMessage) {
      await editMessage(editingMessage._id, input.trim());
      resetInput();
      return;
    }
    
    if (file) {
      const formData = new FormData();
      if (input.trim()) formData.append("text", input.trim());
      formData.append("image", file);
      if (replyingTo) formData.append("replyTo", replyingTo._id);
      
      resetInput();
      await sendMessage(formData);
    } else {
      const payload: any = { text: input.trim() };
      if (replyingTo) payload.replyTo = replyingTo._id;
      
      resetInput();
      await sendMessage(payload);
    }
  };

  const sendGif = async (url: string) => {
    setShowGifPicker(false);
    const payload: any = { gifUrl: url };
    if (replyingTo) payload.replyTo = replyingTo._id;
    setReplyingTo(null);
    await sendMessage(payload);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const isMe = (from: any) => {
     return from?._id === user?.id || from === user?.id;
  };

  const isPartnerOnline = onlineUsers.some(u => u.userId === partner?._id);

  // Fetch GIFs
  useEffect(() => {
    if (!showGifPicker) return;
    const fetchGifs = async () => {
      setIsSearchingGifs(true);
      const endpoint = gifSearch.trim() 
        ? `https://api.giphy.com/v1/gifs/search?api_key=Y1qLtC53YlE3mBrFwvyq8xWyj0Hsl0ra&q=${encodeURIComponent(gifSearch)}&limit=20`
        : `https://api.giphy.com/v1/gifs/trending?api_key=Y1qLtC53YlE3mBrFwvyq8xWyj0Hsl0ra&limit=20`;
        
      try {
        const res = await fetch(endpoint);
        const data = await res.json();
        setGifs(data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingGifs(false);
      }
    };
    const t = setTimeout(fetchGifs, 500);
    return () => clearTimeout(t);
  }, [gifSearch, showGifPicker]);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-background">
      {/* ── Fixed Sticky Header ── */}
      <div className="absolute top-0 left-0 right-0 z-50 pt-safe bg-background/60 backdrop-blur-xl border-b border-white/5">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              {partner?.avatar ? (
                 <img src={partner.avatar} className="h-11 w-11 rounded-full object-cover shadow-glow" />
              ) : (
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-accent shadow-glow flex items-center justify-center font-bold text-white text-lg">
                  {partner?.name?.charAt(0) || '?'}
                </div>
              )}
              {isPartnerOnline && (
                <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
              )}
            </div>
            <div>
              <p className="font-semibold text-[15px]">{partner ? partner.name : 'Partner'}</p>
              <div className="flex items-center text-xs h-4">
                <AnimatePresence mode="wait">
                  {typingUser ? (
                    <motion.span 
                      key="typing" 
                      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                      className="text-primary italic font-medium flex items-center gap-1"
                    >
                      typing<span className="animate-pulse">...</span>
                    </motion.span>
                  ) : (
                    <motion.span 
                      key="status" 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className={isPartnerOnline ? "text-emerald-500" : "text-muted-foreground/60"}
                    >
                      {isPartnerOnline ? "Online now" : "Offline"}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 relative">
            <button className="rounded-full p-2.5 text-muted-foreground hover:bg-white/5 hover:text-foreground transition"><Phone className="h-5 w-5" /></button>
            <button className="rounded-full p-2.5 text-muted-foreground hover:bg-white/5 hover:text-foreground transition"><Video className="h-5 w-5" /></button>
            <button 
              onClick={() => setShowOptions(!showOptions)}
              className="rounded-full p-2.5 text-muted-foreground hover:bg-white/5 hover:text-foreground transition"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            
            <AnimatePresence>
              {showOptions && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowOptions(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-48 rounded-2xl glass-strong shadow-cinema border border-white/10 overflow-hidden z-50 py-1"
                  >
                    <button 
                      onClick={handleClearChat}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left font-medium"
                    >
                      <Trash2 className="h-4 w-4" />
                      Clear Chat
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Messages Scroll Area ── */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 pt-[100px] pb-32 sm:pb-36"
        onClick={() => setSelectedMessage(null)}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 min-h-full justify-end">
          
          <div className="mx-auto mb-10 mt-8 flex w-full max-w-3xl items-center justify-center gap-2 px-4 py-2">
            <Lock className="h-3 w-3 text-muted-foreground/60" />
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest">End-to-end encrypted · Only for us</p>
          </div>

          {messages.map((msg, i) => {
            const me = isMe(msg.from);
            const showAvatar = !me && (i === messages.length - 1 || messages[i + 1]?.from?._id !== msg.from?._id);
            const isDeleted = msg.isDeleted;
            const isSelected = selectedMessage === msg._id;
            
            return (
              <motion.div
                key={msg._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group relative flex items-end gap-2 ${me ? "justify-end" : "justify-start"}`}
              >
                {!me && (
                  <div className={`mb-1 h-7 w-7 flex-none rounded-full overflow-hidden shadow-glow ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                     {msg.from?.avatar ? (
                       <img src={msg.from.avatar} className="h-full w-full object-cover" />
                     ) : (
                       <div className="h-full w-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] text-white">
                          {msg.from?.name?.charAt(0)}
                       </div>
                     )}
                  </div>
                )}

                <div className={`relative flex flex-col max-w-[80%] sm:max-w-[70%] ${isSelected ? 'z-20' : ''}`}>
                  
                  {/* Reply Preview */}
                  {msg.replyTo && !isDeleted && (
                    <div className={`flex items-center gap-2 text-xs mb-1 opacity-70 ${me ? "justify-end" : "justify-start"}`}>
                      <Reply className="h-3 w-3" />
                      <div className="truncate rounded bg-muted/40 px-2 py-1 max-w-[200px]">
                        <span className="font-semibold text-[10px] uppercase mr-1">{msg.replyTo.from?.name}</span>
                        {msg.replyTo.text || (msg.replyTo.image ? 'Photo' : 'GIF')}
                      </div>
                    </div>
                  )}

                  <div
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (!isDeleted) reactToMessage(msg._id, "❤️");
                    }}
                    onContextMenu={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setSelectedMessage(isSelected ? null : msg._id);
                    }}
                    onClick={(e) => {
                      if (isSelected) e.stopPropagation();
                    }}
                    className={`flex flex-col gap-1 rounded-[20px] shadow-cinema transition-all ${
                      isSelected ? "scale-[1.02] ring-2 ring-primary/50" : ""
                    } ${
                      isDeleted 
                        ? "bg-transparent border border-white/10 text-muted-foreground italic px-4 py-2 rounded-2xl"
                        : msg.gifUrl
                        ? "bg-transparent overflow-hidden rounded-2xl"
                        : me
                        ? "rounded-br-sm bg-gradient-to-br from-primary to-pink-600 text-white"
                        : "rounded-bl-sm glass-strong"
                    }`}
                  >
                    {isDeleted ? (
                      <p className="text-sm">This message was deleted</p>
                    ) : (
                      <>
                        {msg.image && (
                          <div className="p-1 pb-0">
                            <img src={msg.image.url} className="w-full h-auto max-h-64 object-cover rounded-2xl" />
                          </div>
                        )}
                        {msg.gifUrl && (
                          <img src={msg.gifUrl} className="w-full h-auto max-w-[240px] rounded-2xl object-cover" />
                        )}
                        {msg.text && (
                          <div className="px-4 py-2.5 text-[15px] leading-relaxed break-words whitespace-pre-wrap">
                            {msg.text}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Context Menu Modal */}
                  <AnimatePresence>
                    {isSelected && !isDeleted && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: me ? -10 : 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: me ? -10 : 10 }}
                        className={`absolute z-30 flex flex-col gap-1 rounded-2xl glass-strong p-1.5 shadow-cinema border border-white/10 ${
                          me ? "right-0 bottom-full mb-2" : "left-0 top-full mt-2"
                        } w-40 backdrop-blur-2xl`}
                      >
                        <div className="flex justify-between px-2 py-1.5 border-b border-white/5 mb-1">
                          {reactions.slice(0, 5).map(r => (
                            <button key={r} onClick={(e) => { e.stopPropagation(); reactToMessage(msg._id, r); setSelectedMessage(null); }} className="hover:scale-125 transition-transform text-lg">{r}</button>
                          ))}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setReplyingTo(msg); setSelectedMessage(null); textareaRef.current?.focus(); }} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/10 text-left">
                          <Reply className="h-4 w-4" /> Reply
                        </button>
                        {msg.text && (
                          <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(msg.text!); setSelectedMessage(null); }} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/10 text-left">
                            <Copy className="h-4 w-4" /> Copy
                          </button>
                        )}
                        {me && msg.text && !msg.image && !msg.gifUrl && (
                          <button onClick={(e) => { e.stopPropagation(); setEditingMessage(msg); setInput(msg.text!); setSelectedMessage(null); textareaRef.current?.focus(); }} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/10 text-left">
                            <Edit2 className="h-4 w-4" /> Edit
                          </button>
                        )}
                        {me && (
                          <button onClick={(e) => { e.stopPropagation(); deleteMessage(msg._id); setSelectedMessage(null); }} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-destructive/20 text-destructive text-left mt-1 border-t border-white/5 pt-2">
                            <Trash2 className="h-4 w-4" /> Delete
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Overlay Reactions */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className={`absolute -bottom-3 ${me ? 'right-2' : 'left-2'} z-10 flex -space-x-1 rounded-full glass-strong px-1.5 py-0.5 shadow-sm border border-white/10`}>
                      {Array.from(new Set(msg.reactions.map(r => r.emoji))).map((emoji, idx) => (
                         <span key={idx} className="text-xs">{emoji}</span>
                      ))}
                    </div>
                  )}

                  {/* Metadata: Time, Status, Edited */}
                  <div className={`mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground/60 ${me ? "justify-end" : "justify-start"} px-1`}>
                    {msg.isEdited && <span>Edited</span>}
                    <span>{formatTime(msg.createdAt)}</span>
                    {me && !isDeleted && (
                      <span className="text-primary/70">
                        {msg.status === 'seen' ? <CheckCheck className="h-3.5 w-3.5 text-blue-400" /> 
                         : msg.status === 'delivered' ? <CheckCheck className="h-3.5 w-3.5" /> 
                         : <Check className="h-3 w-3" />}
                      </span>
                    )}
                  </div>

                </div>
              </motion.div>
            );
          })}
          <div ref={bottomRef} className="h-1" />
        </div>
      </div>

      {/* ── Blur overlay when message selected ── */}
      <AnimatePresence>
        {selectedMessage && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 bg-background/40 backdrop-blur-sm"
            onClick={() => setSelectedMessage(null)}
          />
        )}
      </AnimatePresence>

      {/* ── GIF Picker Modal ── */}
      <AnimatePresence>
        {showGifPicker && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="absolute bottom-[80px] left-0 right-0 z-40 mx-auto max-w-3xl px-4"
          >
            <div className="flex flex-col overflow-hidden rounded-[24px] glass-strong shadow-cinema border border-white/10 h-[300px]">
              <div className="p-3 border-b border-white/5 flex gap-2">
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Search GIPHY..." 
                  value={gifSearch}
                  onChange={(e) => setGifSearch(e.target.value)}
                  className="flex-1 bg-white/5 rounded-xl px-4 py-2 text-sm outline-none"
                />
                <button onClick={() => setShowGifPicker(false)} className="p-2 rounded-xl hover:bg-white/10"><X className="h-5 w-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 scrollbar-hidden">
                {isSearchingGifs && gifs.length === 0 ? (
                  <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : (
                  <div className="columns-2 sm:columns-3 gap-2 space-y-2">
                    {gifs.map(g => (
                      <img 
                        key={g.id} 
                        src={g.images.fixed_height.url} 
                        onClick={() => sendGif(g.images.fixed_height.url)}
                        className="w-full rounded-xl cursor-pointer hover:opacity-80 transition"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input Area ── */}
      <div className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-background via-background/90 to-transparent pb-safe pt-6">
        <div className="mx-auto max-w-3xl px-4 pb-4">
          
          {/* Reply/Edit Indicator */}
          <AnimatePresence>
            {(replyingTo || editingMessage) && (
              <motion.div
                initial={{ opacity: 0, y: 10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: 10, height: 0 }}
                className="mb-2 flex items-center justify-between rounded-xl glass px-4 py-2 text-sm border border-white/10"
              >
                <div className="flex flex-col truncate">
                  <span className="text-[10px] font-bold uppercase text-primary mb-0.5">
                    {editingMessage ? "Editing Message" : `Replying to ${replyingTo?.from?.name}`}
                  </span>
                  <span className="truncate text-muted-foreground/80">
                    {editingMessage?.text || replyingTo?.text || "Attachment"}
                  </span>
                </div>
                <button onClick={() => { setReplyingTo(null); setEditingMessage(null); setInput(""); }} className="rounded-full p-1 hover:bg-white/10">
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-end gap-2 rounded-[24px] glass-strong p-2 shadow-cinema border border-white/5 relative">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            
            <button 
              onClick={() => { setShowEmojiPicker(false); setShowGifPicker(!showGifPicker); }}
              className="rounded-full p-2.5 text-muted-foreground hover:bg-white/10 transition mb-0.5"
            >
              <div className="h-5 w-5 font-bold text-[10px] flex items-center justify-center rounded border-2 border-current">GIF</div>
            </button>

            <button 
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-full p-2.5 transition mb-0.5 ${file ? 'text-primary bg-primary/20' : 'text-muted-foreground hover:bg-white/10 hover:text-foreground'}`}
            >
              <ImagePlus className="h-5 w-5" />
            </button>
            
            <div className="relative flex-1 min-w-0">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={file ? "Add a caption..." : "Message..."}
                rows={1}
                className="w-full resize-none bg-transparent py-3 text-[15px] outline-none placeholder:text-muted-foreground/60 scrollbar-hidden"
                style={{ maxHeight: '120px' }}
              />
            </div>
            
            <div className="relative">
              <button 
                onClick={() => { setShowGifPicker(false); setShowEmojiPicker(!showEmojiPicker); }}
                className="rounded-full p-2.5 text-muted-foreground hover:bg-white/10 transition mb-0.5"
              >
                <Smile className="h-5 w-5" />
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-full right-0 mb-4 z-50">
                  <div className="fixed inset-0" onClick={() => setShowEmojiPicker(false)} />
                  <div className="relative shadow-cinema rounded-[24px] overflow-hidden">
                     <EmojiPicker 
                       theme="dark" 
                       onEmojiClick={(e) => {
                         setInput(prev => prev + e.emoji);
                         setShowEmojiPicker(false);
                         textareaRef.current?.focus();
                       }} 
                     />
                  </div>
                </div>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              disabled={(!input.trim() && !file) || (isSearchingGifs && gifs.length === 0)}
              className="mb-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary text-white shadow-glow transition-all disabled:opacity-40 disabled:scale-100"
            >
              <Send className="h-4 w-4 ml-0.5" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
