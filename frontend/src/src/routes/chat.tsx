import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  useState, useRef, useEffect, useMemo, useCallback, memo,
} from "react";
import {
  Send, Phone, Video, Image as ImageIcon, Smile,
  Lock, Check, CheckCheck, Edit2, Reply, Trash2,
  Copy, X, ImagePlus, Loader2, MoreVertical, Search,
  ArrowLeft, Mic,
} from "lucide-react";
import { useCoupleStore, Message } from "@/store/coupleStore";
import { useAuthStore } from "@/store/authStore";
import EmojiPicker from "emoji-picker-react";
import { useCallWebRTC } from "@/hooks/useCallWebRTC";
import { CallModal } from "@/components/CallModal";
import toast from "react-hot-toast";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

const reactions = ["❤️", "😂", "🥺", "😍", "😡", "👍", "🔥"];

// ── Memoised per-message component ──────────────────────────────────────────
// This prevents the entire list re-rendering when a single message changes.
const ChatMessage = memo(function ChatMessage({
  msg,
  me,
  showAvatar,
  isSelected,
  isNewMsg,
  searchQuery,
  onSelect,
  onReact,
  onReply,
  onCopy,
  onEdit,
  onDelete,
}: {
  msg: Message;
  me: boolean;
  showAvatar: boolean;
  isSelected: boolean;
  isNewMsg: boolean;
  searchQuery: string;
  onSelect: (id: string | null) => void;
  onReact: (id: string, emoji: string) => void;
  onReply: (msg: Message) => void;
  onCopy: (text: string) => void;
  onEdit: (msg: Message) => void;
  onDelete: (id: string) => void;
}) {
  const isDeleted = msg.isDeleted;

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <div
      className={`group relative flex items-end gap-2 ${me ? "justify-end" : "justify-start"}${isNewMsg ? " msg-appear" : ""}`}
    >
      {/* Partner avatar */}
      {!me && (
        <div
          className={`mb-1 h-7 w-7 flex-none rounded-full overflow-hidden ${showAvatar ? "opacity-100" : "opacity-0"}`}
        >
          {msg.from?.avatar ? (
            <img
              src={msg.from.avatar}
              className="h-full w-full object-cover"
              loading="lazy"
              alt=""
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] text-white font-semibold">
              {msg.from?.name?.charAt(0)}
            </div>
          )}
        </div>
      )}

      <div
        className={`relative flex flex-col max-w-[85%] sm:max-w-[70%] ${isSelected ? "z-20" : ""}`}
      >
        {/* Reply Preview */}
        {msg.replyTo && !isDeleted && (
          <div
            className={`flex items-center gap-1.5 text-xs mb-1 opacity-70 ${me ? "justify-end" : "justify-start"}`}
          >
            <Reply className="h-3 w-3 flex-none" />
            <div className="truncate rounded-lg bg-white/10 px-2 py-1 max-w-[200px]">
              <span className="font-semibold text-[10px] uppercase mr-1">
                {msg.replyTo.from?.name}
              </span>
              {msg.replyTo.text || (msg.replyTo.image ? "Photo" : "GIF")}
            </div>
          </div>
        )}

        {/* Message bubble */}
        <div
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (!isDeleted) onReact(msg._id, "❤️");
          }}
          onContextMenu={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onSelect(isSelected ? null : msg._id);
          }}
          onClick={(e) => {
            if (isSelected) e.stopPropagation();
          }}
          className={`flex flex-col gap-1 rounded-[20px] transition-transform duration-150 ${
            isSelected ? "scale-[1.02] ring-2 ring-primary/50" : ""
          } ${
            isDeleted
              ? "bg-transparent border border-white/10 text-muted-foreground italic px-4 py-2 rounded-2xl"
              : msg.gifUrl
              ? "bg-transparent overflow-hidden rounded-2xl"
              : me
              ? "rounded-br-[6px] bg-gradient-to-br from-primary to-pink-600 text-white shadow-[0_4px_16px_rgba(255,79,216,0.3)]"
              : "rounded-bl-[6px] glass-strong border border-white/8"
          }`}
        >
          {isDeleted ? (
            <p className="text-sm">This message was deleted</p>
          ) : (
            <>
              {msg.image && (
                <div className="p-1 pb-0">
                  <img
                    src={msg.image.url}
                    className="w-full h-auto max-h-64 object-cover rounded-[18px]"
                    loading="lazy"
                    alt="attachment"
                  />
                </div>
              )}
              {msg.gifUrl && (
                <img
                  src={msg.gifUrl}
                  className="w-full h-auto max-w-[240px] rounded-2xl object-cover"
                  loading="lazy"
                  alt="gif"
                />
              )}
              {msg.text && (
                <div className="px-4 py-2.5 text-[15px] leading-relaxed break-words whitespace-pre-wrap">
                  {searchQuery ? (
                    msg.text
                      .split(new RegExp(`(${searchQuery})`, "gi"))
                      .map((part, index) =>
                        part.toLowerCase() === searchQuery.toLowerCase() ? (
                          <mark
                            key={index}
                            className="bg-yellow-400/50 text-white rounded px-0.5"
                          >
                            {part}
                          </mark>
                        ) : (
                          part
                        )
                      )
                  ) : (
                    msg.text
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Context Menu */}
        <AnimatePresence>
          {isSelected && !isDeleted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: me ? -8 : 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: me ? -8 : 8 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className={`absolute z-30 flex flex-col gap-1 rounded-2xl glass-strong p-1.5 border border-white/10 shadow-cinema ${
                me ? "right-0 bottom-full mb-2" : "left-0 top-full mt-2"
              } w-40`}
            >
              <div className="flex justify-between px-2 py-1.5 border-b border-white/5 mb-1">
                {reactions.slice(0, 5).map((r) => (
                  <button
                    key={r}
                    onClick={(e) => {
                      e.stopPropagation();
                      onReact(msg._id, r);
                      onSelect(null);
                    }}
                    className="hover:scale-125 transition-transform text-lg"
                  >
                    {r}
                  </button>
                ))}
              </div>
              <CtxBtn icon={<Reply className="h-4 w-4" />} label="Reply" onClick={() => { onReply(msg); onSelect(null); }} />
              {msg.text && (
                <CtxBtn icon={<Copy className="h-4 w-4" />} label="Copy" onClick={() => { onCopy(msg.text!); onSelect(null); }} />
              )}
              {me && msg.text && !msg.image && !msg.gifUrl && (
                <CtxBtn icon={<Edit2 className="h-4 w-4" />} label="Edit" onClick={() => { onEdit(msg); onSelect(null); }} />
              )}
              {me && (
                <CtxBtn
                  icon={<Trash2 className="h-4 w-4" />}
                  label="Delete"
                  className="text-destructive hover:bg-destructive/20 border-t border-white/5 mt-1 pt-2"
                  onClick={() => { onDelete(msg._id); onSelect(null); }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reaction pills */}
        {msg.reactions && msg.reactions.length > 0 && (
          <div
            className={`absolute -bottom-3 ${me ? "right-2" : "left-2"} z-10 flex -space-x-0.5 rounded-full glass-strong px-1.5 py-0.5 border border-white/10`}
          >
            {Array.from(new Set(msg.reactions.map((r) => r.emoji))).map(
              (emoji, idx) => (
                <span key={idx} className="text-xs">
                  {emoji}
                </span>
              )
            )}
          </div>
        )}

        {/* Timestamp + status */}
        <div
          className={`mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground/60 ${me ? "justify-end" : "justify-start"} px-1`}
        >
          {msg.isEdited && <span>Edited</span>}
          <span>{formatTime(msg.createdAt)}</span>
          {me && !isDeleted && (
            <span className="text-primary/70">
              {msg.status === "seen" ? (
                <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
              ) : msg.status === "delivered" ? (
                <CheckCheck className="h-3.5 w-3.5" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

// Small context menu button
function CtxBtn({
  icon,
  label,
  onClick,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/10 text-left transition-colors ${className}`}
    >
      {icon} {label}
    </button>
  );
}

// ── Main Chat Page ────────────────────────────────────────────────────────────
function ChatPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const {
    messages,
    fetchMessages,
    sendMessage,
    partner,
    onlineUsers,
    typingUser,
    emitTyping,
    deleteMessage,
    editMessage,
    reactToMessage,
    markMessagesSeen,
  } = useCoupleStore();

  // ── Local state ──────────────────────────────────────────────────────────
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState("");
  const [gifs, setGifs] = useState<any[]>([]);
  const [isSearchingGifs, setIsSearchingGifs] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const initialMsgCountRef = useRef<number | null>(null);
  const isAtBottomRef = useRef(true);

  // ── WebRTC Call hook ─────────────────────────────────────────────────────
  const {
    callState,
    callType,
    callDuration,
    isMuted,
    isCameraOff,
    localStream,
    remoteStream,
    incomingCall,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleCamera,
  } = useCallWebRTC();

  // ── Derived ──────────────────────────────────────────────────────────────
  const isPartnerOnline = onlineUsers.some((u) => u.userId === partner?._id);
  const isMe = useCallback(
    (from: any) => from?._id === user?.id || from === user?.id,
    [user?.id]
  );

  // ── Call wrapper — check partner online before initiating ────────────────
  const handleCall = useCallback((type: "voice" | "video") => {
    if (!isPartnerOnline) {
      toast.error(`${partner?.name ?? "Partner"} is offline. They need to be online to receive calls.`, {
        icon: "📵",
        duration: 4000,
      });
      return;
    }
    startCall(type);
  }, [isPartnerOnline, partner?.name, startCall]);


  const displayMessages = useMemo(() => {
    return searchQuery
      ? messages.filter((m) =>
          m.text?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : messages;
  }, [messages, searchQuery]);

  // ── Initial message count (for entrance animation) ───────────────────────
  useEffect(() => {
    if (initialMsgCountRef.current === null && messages.length > 0) {
      initialMsgCountRef.current = messages.length;
    }
  }, [messages.length]);

  // ── Fetch + mark seen ────────────────────────────────────────────────────
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    markMessagesSeen();
  }, [messages.length, markMessagesSeen]);

  // ── Track scroll position to decide whether to auto-scroll ──────────────
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAtBottomRef.current = distanceFromBottom < 100;
  }, []);

  // ── Auto-scroll only when user is at (or near) the bottom ───────────────
  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  // ── Close emoji picker on outside click ─────────────────────────────────
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmojiPicker]);

  // ── Fetch GIFs ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showGifPicker) return;
    const fetchGifs = async () => {
      setIsSearchingGifs(true);
      const giphyKey =
        import.meta.env.VITE_GIPHY_API_KEY ||
        import.meta.env.VITE_GIPHY_KEY ||
        "";
      const endpoint = gifSearch.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=${giphyKey}&q=${encodeURIComponent(gifSearch)}&limit=20`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${giphyKey}&limit=20`;
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

  // ── Drag-and-drop image upload ────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback(() => setIsDragging(false), []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      setFile(droppedFile);
      setFilePreview(URL.createObjectURL(droppedFile));
    }
  }, []);

  // ── Paste image from clipboard ────────────────────────────────────────────
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith("image/"));
    if (imageItem) {
      const blob = imageItem.getAsFile();
      if (blob) {
        setFile(blob);
        setFilePreview(URL.createObjectURL(blob));
      }
    }
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      emitTyping();
      // Auto-grow textarea
      const ta = textareaRef.current;
      if (ta) {
        ta.style.height = "auto";
        ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
      }
    },
    [emitTyping]
  );

  const resetInput = useCallback(() => {
    setInput("");
    setFile(null);
    setFilePreview(null);
    setReplyingTo(null);
    setEditingMessage(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, []);

  const handleSend = useCallback(async () => {
    if (!input.trim() && !file) return;

    if (editingMessage) {
      await editMessage(editingMessage._id, input.trim());
      resetInput();
      return;
    }

    // Force scroll to bottom when sending
    isAtBottomRef.current = true;

    if (file) {
      const formData = new FormData();
      if (input.trim()) formData.append("text", input.trim());
      formData.append("image", file);
      if (replyingTo) formData.append("replyTo", replyingTo._id);
      resetInput();
      // Pass FormData directly — sendMessage needs to detect it
      await sendMessage(formData);
    } else {
      const payload: any = { text: input.trim() };
      if (replyingTo) payload.replyTo = replyingTo._id;
      resetInput();
      await sendMessage(payload);
    }
  }, [input, file, editingMessage, replyingTo, editMessage, resetInput, sendMessage]);

  const sendGif = useCallback(
    async (url: string) => {
      setShowGifPicker(false);
      const payload: any = { gifUrl: url };
      if (replyingTo) payload.replyTo = replyingTo._id;
      setReplyingTo(null);
      isAtBottomRef.current = true;
      await sendMessage(payload);
    },
    [replyingTo, sendMessage]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const f = e.target.files[0];
        setFile(f);
        setFilePreview(URL.createObjectURL(f));
      }
    },
    []
  );

  const handleClearChat = useCallback(async () => {
    if (
      window.confirm(
        "Are you sure you want to permanently delete ALL messages for both of you? This cannot be undone."
      )
    ) {
      await useCoupleStore.getState().clearChat();
      setShowOptions(false);
    }
  }, []);

  // Memoised message action callbacks to prevent ChatMessage re-renders
  const handleSelectMessage = useCallback(
    (id: string | null) => setSelectedMessage(id),
    []
  );
  const handleReact = useCallback(
    (id: string, emoji: string) => reactToMessage(id, emoji),
    [reactToMessage]
  );
  const handleReply = useCallback((msg: Message) => {
    setReplyingTo(msg);
    textareaRef.current?.focus();
  }, []);
  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  }, []);
  const handleEdit = useCallback((msg: Message) => {
    setEditingMessage(msg);
    setInput(msg.text ?? "");
    textareaRef.current?.focus();
  }, []);
  const handleDelete = useCallback(
    (id: string) => deleteMessage(id),
    [deleteMessage]
  );

  // ── Toast for call events ─────────────────────────────────────────────────
  useEffect(() => {
    if (callState === "ended") {
      // brief "call ended" toast only if we were connected
    }
  }, [callState]);

  // ── Notify on incoming call ───────────────────────────────────────────────
  useEffect(() => {
    if (incomingCall) {
      // Vibrate on mobile if supported
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
  }, [incomingCall]);

  return (
    <div
      className="relative flex h-[100dvh] flex-col overflow-hidden bg-background dark"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      {/* ── Call Modal ───────────────────────────────────────────────────── */}
      <CallModal
        callState={callState}
        callType={callType}
        callDuration={callDuration}
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        localStream={localStream}
        remoteStream={remoteStream}
        incomingCall={incomingCall}
        partnerName={partner?.name ?? "Partner"}
        partnerAvatar={partner?.avatar}
        onAccept={acceptCall}
        onDecline={declineCall}
        onEnd={endCall}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
      />




      {/* ── Drag-and-drop overlay ──────────────────────────────────────── */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-primary/20 backdrop-blur-md border-2 border-dashed border-primary rounded-none"
          >
            <div className="text-center">
              <ImagePlus className="h-12 w-12 mx-auto text-primary mb-3" />
              <p className="text-lg font-semibold text-white">Drop image to send</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Fixed Header ─────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-50 pt-safe glass-strong border-b border-white/5 !overflow-visible">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">

          {/* Back button */}
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => navigate({ to: "/" })}
            className="flex-none rounded-full p-2 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </motion.button>

          {isSearching ? (
            <div className="flex-1 flex items-center gap-2 bg-white/5 rounded-xl px-3 py-1.5 border border-white/8">
              <Search className="h-4 w-4 text-muted-foreground flex-none" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in chat..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground/50"
              />
              <button
                onClick={() => {
                  setIsSearching(false);
                  setSearchQuery("");
                }}
                className="p-1 rounded-full hover:bg-white/10"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Partner avatar + online indicator */}
              <div className="relative flex-none">
                {partner?.avatar ? (
                  <img
                    src={partner.avatar}
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/30"
                    alt={partner.name}
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-white text-base">
                    {partner?.name?.charAt(0) || "?"}
                  </div>
                )}
                {isPartnerOnline && (
                  <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[15px] truncate">
                  {partner ? partner.name : "Partner"}
                </p>
                <div className="flex items-center h-4">
                  <AnimatePresence mode="wait">
                    {typingUser ? (
                      <motion.span
                        key="typing"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="text-xs text-primary italic font-medium flex items-center gap-1"
                      >
                        typing
                        <span className="animate-pulse">...</span>
                      </motion.span>
                    ) : (
                      <motion.span
                        key="status"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`text-xs ${
                          isPartnerOnline
                            ? "text-emerald-500"
                            : "text-muted-foreground/50"
                        }`}
                      >
                        {isPartnerOnline ? "Online now" : "Offline"}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-1 relative flex-none">
            {!isSearching && (
              <motion.button
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => setIsSearching(true)}
                className="rounded-full p-2.5 text-muted-foreground hover:bg-white/8 hover:text-foreground transition-colors"
                aria-label="Search messages"
              >
                <Search className="h-5 w-5" />
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.93 }}
              onClick={() => handleCall("voice")}
              className={`rounded-full p-2.5 transition-colors ${isPartnerOnline ? "text-muted-foreground hover:bg-white/8 hover:text-foreground" : "text-muted-foreground/30 cursor-not-allowed"}`}
              aria-label="Voice call"
            >
              <Phone className="h-5 w-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.93 }}
              onClick={() => handleCall("video")}
              className={`rounded-full p-2.5 transition-colors ${isPartnerOnline ? "text-muted-foreground hover:bg-white/8 hover:text-foreground" : "text-muted-foreground/30 cursor-not-allowed"}`}
              aria-label="Video call"
            >
              <Video className="h-5 w-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.93 }}
              onClick={() => setShowOptions(!showOptions)}
              className="rounded-full p-2.5 text-muted-foreground hover:bg-white/8 hover:text-foreground transition-colors"
              aria-label="More options"
            >
              <MoreVertical className="h-5 w-5" />
            </motion.button>

            <AnimatePresence>
              {showOptions && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowOptions(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
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

      {/* ── Messages Scroll Area ──────────────────────────────────────────── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 pt-[80px] pb-32 sm:pb-36 scrollbar-hidden"
        style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" } as any}
        onClick={() => setSelectedMessage(null)}
        onScroll={handleScroll}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 min-h-full justify-end">
          {/* Encryption notice */}
          <div className="mx-auto mb-6 mt-8 flex w-full max-w-3xl items-center justify-center gap-2 px-4 py-2">
            <Lock className="h-3 w-3 text-muted-foreground/50" />
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">
              End-to-end encrypted · Only for us
            </p>
          </div>

          {displayMessages.map((msg, i, arr) => {
            const me = isMe(msg.from);
            const showAvatar =
              !me &&
              (i === arr.length - 1 ||
                arr[i + 1]?.from?._id !== msg.from?._id);
            const isSelected = selectedMessage === msg._id;
            const isNewMsg =
              initialMsgCountRef.current !== null &&
              i >= initialMsgCountRef.current;

            return (
              <ChatMessage
                key={msg._id}
                msg={msg}
                me={me}
                showAvatar={showAvatar}
                isSelected={isSelected}
                isNewMsg={isNewMsg}
                searchQuery={searchQuery}
                onSelect={handleSelectMessage}
                onReact={handleReact}
                onReply={handleReply}
                onCopy={handleCopy}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            );
          })}
          <div ref={bottomRef} className="h-1" />
        </div>
      </div>

      {/* ── Blur overlay when message selected ───────────────────────────── */}
      <AnimatePresence>
        {selectedMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 bg-background/40 backdrop-blur-sm"
            onClick={() => setSelectedMessage(null)}
          />
        )}
      </AnimatePresence>

      {/* ── GIF Picker ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showGifPicker && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="absolute bottom-[76px] left-0 right-0 z-40 mx-auto max-w-3xl px-4"
          >
            <div className="flex flex-col overflow-hidden rounded-[24px] glass-strong shadow-cinema border border-white/10 h-[300px]">
              <div className="p-3 border-b border-white/5 flex gap-2">
                <input
                  autoFocus
                  type="text"
                  placeholder="Search GIPHY..."
                  value={gifSearch}
                  onChange={(e) => setGifSearch(e.target.value)}
                  className="flex-1 bg-white/5 rounded-xl px-4 py-2 text-sm outline-none border border-white/8 focus:border-primary/40 transition-colors"
                />
                <button
                  onClick={() => setShowGifPicker(false)}
                  className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 scrollbar-hidden">
                {isSearchingGifs && gifs.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="columns-2 sm:columns-3 gap-2 space-y-2">
                    {gifs.map((g) => (
                      <img
                        key={g.id}
                        src={g.images.fixed_height.url}
                        onClick={() => sendGif(g.images.fixed_height.url)}
                        className="w-full rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
                        loading="lazy"
                        alt="gif"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input Area ───────────────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-background via-background/95 to-transparent pb-safe pt-4">
        <div className="mx-auto max-w-3xl px-4 pb-4">

          {/* File preview */}
          <AnimatePresence>
            {filePreview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-2 relative inline-block"
              >
                <img
                  src={filePreview}
                  className="h-20 w-20 rounded-xl object-cover border border-white/10"
                  alt="preview"
                />
                <button
                  onClick={() => { setFile(null); setFilePreview(null); }}
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive flex items-center justify-center"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reply / Edit indicator */}
          <AnimatePresence>
            {(replyingTo || editingMessage) && (
              <motion.div
                initial={{ opacity: 0, y: 8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: 8, height: 0 }}
                className="mb-2 flex items-center justify-between rounded-xl glass px-4 py-2 text-sm border border-white/10"
              >
                <div className="flex flex-col truncate">
                  <span className="text-[10px] font-bold uppercase text-primary mb-0.5">
                    {editingMessage
                      ? "Editing Message"
                      : `Replying to ${replyingTo?.from?.name}`}
                  </span>
                  <span className="truncate text-muted-foreground/80 text-xs">
                    {editingMessage?.text || replyingTo?.text || "Attachment"}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setEditingMessage(null);
                    setInput("");
                  }}
                  className="rounded-full p-1 hover:bg-white/10 flex-none ml-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Emoji Picker */}
          <div className="relative" ref={emojiPickerRef}>
            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 z-[999] mb-3">
                <div className="shadow-cinema rounded-[24px] overflow-hidden bg-neutral-900 border border-white/10">
                  <EmojiPicker
                    theme="dark"
                    width={320}
                    height={380}
                    onEmojiClick={(e) => {
                      setInput((prev) => prev + e.emoji);
                      setShowEmojiPicker(false);
                      textareaRef.current?.focus();
                    }}
                  />
                </div>
              </div>
            )}

            {/* Input bar */}
            <div className="flex items-end gap-2 rounded-[24px] glass-strong p-2 border border-white/8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-shadow focus-within:shadow-[0_8px_32px_rgba(255,79,216,0.15)] focus-within:border-primary/30">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,video/*"
              />

              {/* GIF button */}
              <button
                onClick={() => {
                  setShowEmojiPicker(false);
                  setShowGifPicker(!showGifPicker);
                }}
                className={`rounded-full p-2.5 transition-colors mb-0.5 ${
                  showGifPicker
                    ? "text-primary bg-primary/15"
                    : "text-muted-foreground hover:bg-white/10"
                }`}
                aria-label="GIF picker"
              >
                <div className="h-5 w-5 font-bold text-[10px] flex items-center justify-center rounded border-2 border-current">
                  GIF
                </div>
              </button>

              {/* Image upload */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-full p-2.5 transition-colors mb-0.5 ${
                  file
                    ? "text-primary bg-primary/15"
                    : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
                }`}
                aria-label="Attach image"
              >
                <ImagePlus className="h-5 w-5" />
              </button>

              {/* Text input */}
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
                  aria-label="Message input"
                  className="w-full resize-none bg-transparent py-2.5 text-[15px] outline-none placeholder:text-muted-foreground/50 scrollbar-hidden leading-relaxed"
                  style={{ maxHeight: "120px" }}
                />
              </div>

              {/* Emoji */}
              <button
                onClick={() => {
                  setShowGifPicker(false);
                  setShowEmojiPicker(!showEmojiPicker);
                }}
                className={`rounded-full p-2.5 transition-colors mb-0.5 ${
                  showEmojiPicker
                    ? "text-primary bg-primary/15"
                    : "text-muted-foreground hover:bg-white/10"
                }`}
                aria-label="Emoji picker"
              >
                <Smile className="h-5 w-5" />
              </button>

              {/* Send button */}
              <motion.button
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.93 }}
                onClick={handleSend}
                disabled={!input.trim() && !file}
                className="mb-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary text-white transition-all disabled:opacity-40 disabled:scale-100 shadow-[0_4px_16px_rgba(255,79,216,0.4)]"
                aria-label="Send message"
              >
                <Send className="h-4 w-4 ml-0.5" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
