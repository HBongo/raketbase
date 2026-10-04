import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getConversations,
  getConversation,
  getConversationMessages,
  sendMessage,
  getAttachmentDownloadUrl,
  confirmDeleteConversation,
  cancelDeleteConversation,
} from "../services/api";
import { useCurrentUser } from "../utils/currentUser";
import { showToast } from "../utils/toast";
import { supabase } from "../config/supabaseClient";
import { getCached, setCached } from "../utils/cache";

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatClock(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatSidebarTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function personName(person) {
  if (!person) return "Participant";
  return [person.first_name, person.last_name].filter(Boolean).join(" ") || person.email || "Participant";
}

function isImageAttachment(m) {
  if (!m) return false;
  if (m.file_mime_type && m.file_mime_type.startsWith("image/")) return true;
  const name = m.file_name || m.file_path || "";
  return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name);
}

function getInitials(name) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function Avatar({ src, name, size = 40 }) {
  const initials = getInitials(name || "?");
  const colors = ["#0B4F2E", "#1A6B4A", "#2E8B57", "#3A7D60", "#1C5E3E"];
  const colorIndex = (name || "").charCodeAt(0) % colors.length;
  return src ? (
    <img
      src={src}
      alt={name}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid #E9EFEF", flexShrink: 0 }}
    />
  ) : (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: colors[colorIndex],
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.35,
        flexShrink: 0,
        border: "2px solid #E9EFEF",
      }}
    >
      {initials}
    </div>
  );
}

export default function Messages() {
  const navigate = useNavigate();
  const { id: selectedId } = useParams();
  const user = useCurrentUser();

  const cachedConvs = getCached("messages_conversations");
  const [conversations, setConversations] = useState(cachedConvs || []);
  const [loadingList, setLoadingList] = useState(!cachedConvs);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewImage, setPreviewImage] = useState(null);
  const [attachmentUrls, setAttachmentUrls] = useState({});

  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const res = await getConversations();
      const list = res.data || [];
      setConversations(list);
      setCached("messages_conversations", list);
    } catch (err) {
      showToast(err.message || "Failed to load conversations", { type: "error" });
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    loadConversations();
  }, [loadConversations, navigate]);

  useEffect(() => {
    if (!selectedId) { setActive(null); setMessages([]); return; }
    let cancelled = false;
    const cachedThread = getCached(`thread_${selectedId}`);
    if (cachedThread) {
      setMessages(cachedThread);
      setLoadingMessages(false);
    } else {
      setLoadingMessages(true);
    }
    setError("");
    (async () => {
      try {
        const res = await getConversationMessages(selectedId);
        const data = res.data || [];
        if (!cancelled) {
          setMessages(data);
          setCached(`thread_${selectedId}`, data);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load messages");
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    })();
      const renderMessageContent = (content, mine) => {
    if (!content) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: mine ? '#B4F105' : '#0056b3', textDecoration: 'underline', wordBreak: 'break-all' }}>{part}</a>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return () => { cancelled = true; };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const found = conversations.find((c) => c.conversation_id === selectedId);
    if (found) {
      setActive(found);
    } else {
      getConversation(selectedId)
        .then((res) => {
          if (res?.data) setActive(res.data);
        })
        .catch(() => {});
    }
  }, [selectedId, conversations]);

  useEffect(() => {
    if (!selectedId || !user) return;

    // The app logs in through the backend, so the browser's Supabase client has no
    // session of its own. Hand Realtime the user's token, or the messages/conversations
    // RLS policies see an anonymous viewer and no live updates arrive.
    const token = localStorage.getItem('token');
    if (token && supabase.realtime?.setAuth) {
      supabase.realtime.setAuth(token);
    }

    const channel = supabase.channel(`conversation:${selectedId}`);
    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedId}` }, (payload) => {
        setMessages((prev) => {
          if (prev.some((m) => m.message_id === payload.new.message_id)) return prev;
          return [...prev, payload.new];
        });
        loadConversations();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations", filter: `conversation_id=eq.${selectedId}` }, (payload) => {
        setConversations((prev) => prev.map((c) => (c.conversation_id === selectedId ? { ...c, ...payload.new } : c)));
      })
      .subscribe();
      const renderMessageContent = (content, mine) => {
    if (!content) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: mine ? '#B4F105' : '#0056b3', textDecoration: 'underline', wordBreak: 'break-all' }}>{part}</a>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return () => { supabase.removeChannel(channel); };
  }, [selectedId, user, loadConversations]);

  // Preload signed URLs for attachments if not returned as direct public file_url
  useEffect(() => {
    if (!selectedId || messages.length === 0) return;
    const needUrls = messages.filter(
      (m) => m.file_path && !m.file_url && !attachmentUrls[m.message_id]
    );
    if (needUrls.length === 0) return;

    needUrls.forEach(async (m) => {
      try {
        const res = await getAttachmentDownloadUrl(selectedId, m.message_id);
        const url = res.data?.url || res.data?.downloadUrl;
        if (url) {
          setAttachmentUrls((prev) => ({ ...prev, [m.message_id]: url }));
        }
      } catch {
        // ignore attachment url fetch error
      }
    });
  }, [selectedId, messages, attachmentUrls]);

  useEffect(() => {
    if (bottomRef.current && !loadingMessages) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loadingMessages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() && !pendingFile) return;
    setSending(true);
    setError("");
    try {
      const res = await sendMessage(selectedId, { content: text.trim(), file: pendingFile });
      setMessages((prev) => {
        const next = prev.some((m) => m.message_id === res.data.message_id) ? prev : [...prev, res.data];
        setCached(`thread_${selectedId}`, next);
        return next;
      });
      setText("");
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (textareaRef.current) { textareaRef.current.style.height = "44px"; }
      loadConversations();
    } catch (err) {
      setError(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleDownload = async (msg) => {
    if (!msg.file_path) return;
    try {
      let downloadUrl = msg.file_url || attachmentUrls[msg.message_id];
      if (!downloadUrl) {
        const res = await getAttachmentDownloadUrl(selectedId, msg.message_id);
        downloadUrl = res.data?.downloadUrl || res.data?.url;
      }
      if (!downloadUrl) throw new Error("Could not retrieve download link");
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = msg.file_name || "download";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Failed to download file: " + err.message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedId) return;
    if (!window.confirm("Are you sure you want to permanently delete this conversation?")) return;
    setDeleteBusy(true);
    try {
      await confirmDeleteConversation(selectedId);
      showToast("Deletion confirmed.");
      loadConversations();
    } catch (err) {
      showToast(err.message || "Failed to confirm deletion", { type: "error" });
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleCancelDelete = async () => {
    if (!selectedId) return;
    setDeleteBusy(true);
    try {
      await cancelDeleteConversation(selectedId);
      showToast("Deletion cancelled.");
      loadConversations();
    } catch (err) {
      showToast(err.message || "Failed to cancel deletion", { type: "error" });
    } finally {
      setDeleteBusy(false);
    }
  };

  const autoResizeTextarea = (e) => {
    setText(e.target.value);
    e.target.style.height = "44px";
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
  };

  const isClient = active?.client_id === (user?.user_id || user?.id);
  const isFreelancer = active?.freelancer_id === (user?.user_id || user?.id);
  const isParticipant = isClient || isFreelancer;
  const other = isClient ? active?.freelancer : active?.client;
  const contractStatus = active?.contracts?.status;
  const isCompleted = contractStatus === "completed" || contractStatus === "refunded";

  const myConfirmed = isClient ? active?.client_delete_confirmed : isFreelancer ? active?.freelancer_delete_confirmed : false;
  const otherConfirmed = isClient ? active?.freelancer_delete_confirmed : isFreelancer ? active?.client_delete_confirmed : false;

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const amClient = c.client_id === (user?.user_id || user?.id);
    const them = amClient ? c.freelancer : c.client;
    const label = [them?.first_name, them?.last_name].filter(Boolean).join(" ") || them?.email || "";
      const renderMessageContent = (content, mine) => {
    if (!content) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: mine ? '#B4F105' : '#0056b3', textDecoration: 'underline', wordBreak: 'break-all' }}>{part}</a>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (c.title || "").toLowerCase().includes(q) || label.toLowerCase().includes(q);
  });

  const statusBadge = (status) => {
    if (!status) return null;
    const map = {
      completed: { bg: "#D1FAE5", color: "#065F46", label: "Completed" },
      active:    { bg: "#FEF3C7", color: "#92400E", label: "In Progress" },
      submitted: { bg: "#DBEAFE", color: "#1E40AF", label: "Submitted" },
    };
    const s = map[status] || { bg: "#F3F4F6", color: "#374151", label: status };
      const renderMessageContent = (content, mine) => {
    if (!content) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: mine ? '#B4F105' : '#0056b3', textDecoration: 'underline', wordBreak: 'break-all' }}>{part}</a>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
      <span style={{ background: s.bg, color: s.color, fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "999px", letterSpacing: "0.03em" }}>
        {s.label}
      </span>
    );
  };

    const renderMessageContent = (content, mine) => {
    if (!content) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: mine ? '#B4F105' : '#0056b3', textDecoration: 'underline', wordBreak: 'break-all' }}>{part}</a>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <>
      <style>{`
        .msg-sidebar { background: #FFFFFF; border-right: 1px solid #E9EFEF; display: flex; flex-direction: column; height: 100%; }
        .msg-search { padding: 12px 16px; border-bottom: 1px solid #E9EFEF; }
        .msg-search input { width: 100%; background: #FFFFFF; border: 1px solid #E9EFEF; border-radius: 50rem; padding: 10.4px 20px 10.4px 38px; font-size: 14px; outline: none; transition: all 0.2s ease-in-out; color: #0B130F; }
        .msg-search input:focus { border-color: rgba(5, 28, 18, 0.25); box-shadow: 0 4px 12px rgba(11, 19, 15, 0.05); }
        .msg-search-icon { position: absolute; left: 28px; top: 50%; transform: translateY(-50%); color: #6C7E75; font-size: 14px; pointer-events: none; }
        .conv-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; cursor: pointer; border-left: 3px solid transparent; transition: all 0.15s; background: transparent; border-radius: 0; }
        .conv-item:hover { background: #F4F6F5; }
        .conv-item.active { background: #F0FAE6; border-left-color: #B4F105; }
        .conv-item .conv-title { font-size: 13.5px; font-weight: 700; color: #0B130F; }
        .conv-item .conv-sub { font-size: 12px; color: #6C7E75; }
        .conv-item .conv-time { font-size: 11px; color: #6C7E75; flex-shrink: 0; }
        .chat-area { display: flex; flex-direction: column; height: 100%; background: #F4F6F5; }
        .chat-header { background: #fff; border-bottom: 1px solid #E9EFEF; padding: 14px 20px; display: flex; align-items: center; gap: 14px; flex-shrink: 0; }
        .chat-messages { flex-grow: 1; overflow-y: auto; padding: 24px 28px; display: flex; flex-direction: column; gap: 16px; }
        .bubble-mine { background: #051C12; color: #fff; border-radius: 18px 18px 4px 18px; padding: 12px 16px; max-width: 68%; box-shadow: 0 2px 8px rgba(5,28,18,0.15); }
        .bubble-theirs { background: #fff; color: #0B130F; border-radius: 18px 18px 18px 4px; padding: 12px 16px; max-width: 68%; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 1px solid #E9EFEF; }
        .bubble-mine .bubble-time { font-size: 10px; color: rgba(255,255,255,0.5); text-align: right; margin-top: 5px; }
        .bubble-theirs .bubble-time { font-size: 10px; color: #6C7E75; text-align: right; margin-top: 5px; }
        .msg-composer { background: #fff; border-top: 1px solid #E9EFEF; padding: 14px 20px; flex-shrink: 0; }
        .msg-composer textarea { flex-grow: 1; background: #F4F6F5; border: 1.5px solid #E9EFEF; border-radius: 14px; padding: 10px 16px; font-size: 14px; resize: none; outline: none; min-height: 44px; max-height: 140px; overflow-y: auto; transition: all 0.2s; font-family: inherit; }
        .msg-composer textarea:focus { background: #fff; border-color: #B4F105; box-shadow: 0 0 0 3px rgba(180,241,5,0.12); }
        .send-btn { width: 44px; height: 44px; border-radius: 14px; background: #051C12; border: none; color: #B4F105; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: all 0.2s; font-size: 16px; }
        .send-btn:hover:not(:disabled) { background: #072F1F; transform: scale(1.05); }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .attach-btn { width: 44px; height: 44px; border-radius: 14px; background: #F4F6F5; border: 1.5px solid #E9EFEF; color: #6C7E75; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: all 0.2s; font-size: 18px; }
        .attach-btn:hover { background: #E9EFEF; color: #0B130F; }
        .empty-state { flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: #6C7E75; background: #F4F6F5; }
        .system-msg { text-align: center; display: flex; align-items: center; gap: 10px; }
        .system-msg::before, .system-msg::after { content: ''; flex: 1; height: 1px; background: #E9EFEF; }
        .system-msg-text { font-size: 11.5px; color: #879A91; white-space: nowrap; padding: 0 8px; font-weight: 600; }
        .file-attach-preview { display: flex; align-items: center; gap: 10px; background: #F0FAE6; border: 1px solid #D9F0B0; border-radius: 10px; padding: 8px 12px; margin-bottom: 10px; }
        .conv-badge-count { background: #B4F105; color: #051C12; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 999px; }
        .file-bubble-btn { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 10px; border: none; cursor: pointer; font-size: 12.5px; font-weight: 600; transition: all 0.15s; margin-top: 6px; width: 100%; text-align: left; }
        .file-bubble-btn-mine { background: rgba(255,255,255,0.12); color: #fff; }
        .file-bubble-btn-mine:hover { background: rgba(255,255,255,0.2); }
        .file-bubble-btn-theirs { background: #F4F6F5; color: #0B130F; }
        .file-bubble-btn-theirs:hover { background: #E9EFEF; }
        .deletion-banner { background: #FFF8F0; border-bottom: 1px solid #FDD9B0; padding: 10px 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }

        /* Dark Mode overrides for Messages */
        body.dark-mode .msg-sidebar { background: #1A2420 !important; border-right-color: #2A3832 !important; }
        body.dark-mode .msg-sidebar-header { border-bottom-color: #2A3832 !important; }
        body.dark-mode .msg-sidebar-title { color: #E8EDEB !important; }
        body.dark-mode .msg-sidebar-sub { color: #9EAAA3 !important; }
        body.dark-mode .msg-search { border-bottom-color: #2A3832 !important; }
        body.dark-mode .msg-search input { background: #111816 !important; border-color: #2A3832 !important; color: #E8EDEB !important; }
        body.dark-mode .msg-search input:focus { border-color: #B4F105 !important; box-shadow: 0 4px 12px rgba(180,241,5,0.1) !important; }
        body.dark-mode .conv-item:hover { background: #1F2D27 !important; }
        body.dark-mode .conv-item.active { background: #2A3832 !important; border-left-color: #B4F105 !important; }
        body.dark-mode .conv-item .conv-title { color: #E8EDEB !important; }
        body.dark-mode .conv-item .conv-sub { color: #9EAAA3 !important; }
        body.dark-mode .conv-item .conv-time { color: #9EAAA3 !important; }
        body.dark-mode .chat-area { background: #111816 !important; }
        body.dark-mode .chat-header { background: #1A2420 !important; border-bottom-color: #2A3832 !important; }
        body.dark-mode .chat-header-name { color: #E8EDEB !important; }
        body.dark-mode .chat-header-sub { color: #9EAAA3 !important; }
        body.dark-mode .bubble-theirs { background: #1F2D27 !important; color: #E8EDEB !important; border-color: #2A3832 !important; }
        body.dark-mode .bubble-theirs .bubble-time { color: #9EAAA3 !important; }
        body.dark-mode .bubble-mine { background: #072F1F !important; }
        body.dark-mode .msg-composer { background: #1A2420 !important; border-top-color: #2A3832 !important; }
        body.dark-mode .msg-composer textarea { background: #111816 !important; border-color: #2A3832 !important; color: #E8EDEB !important; }
        body.dark-mode .msg-composer textarea:focus { border-color: #B4F105 !important; background: #1A2420 !important; }
        body.dark-mode .attach-btn { background: #1F2D27 !important; border-color: #2A3832 !important; color: #9EAAA3 !important; }
        body.dark-mode .attach-btn:hover { background: #2A3832 !important; color: #E8EDEB !important; }
        body.dark-mode .empty-state { background: #111816 !important; color: #9EAAA3 !important; }
        body.dark-mode .empty-state-circle { background: #1A2420 !important; }
        body.dark-mode .empty-state-title { color: #E8EDEB !important; }
        body.dark-mode .empty-state-sub { color: #9EAAA3 !important; }
        body.dark-mode .system-msg::before, body.dark-mode .system-msg::after { background: #2A3832 !important; }
        body.dark-mode .system-msg-text { color: #9EAAA3 !important; }
        body.dark-mode .deletion-banner { background: #2A2015 !important; border-bottom-color: #3A3025 !important; }
        body.dark-mode .file-attach-preview { background: #1F2D27 !important; border-color: #2A3832 !important; }
        body.dark-mode .file-bubble-btn-theirs { background: #1F2D27 !important; color: #E8EDEB !important; }
        body.dark-mode .file-bubble-btn-theirs:hover { background: #2A3832 !important; }
        body.dark-mode .msg-loading-text { color: #9EAAA3 !important; }
      `}</style>

      <div className="page-content-wrapper flex-grow-1 p-0" style={{ overflow: "hidden" }}>
        <div className="row g-0 h-100">

          {/* ── Sidebar ── */}
          <div className={`col-md-4 col-lg-3 h-100 ${selectedId ? "d-none d-md-flex" : "d-flex"} flex-column msg-sidebar`}>
            {/* Header */}
            <div className="msg-sidebar-header" style={{ padding: "18px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #E9EFEF" }}>
              <div>
                <div className="msg-sidebar-title" style={{ fontWeight: 800, fontSize: "17px" }}>Messages</div>
                <div className="msg-sidebar-sub" style={{ fontSize: "12px" }}>Your conversations</div>
              </div>
              <span className="conv-badge-count">{conversations.length}</span>
            </div>

            {/* Search */}
            <div className="msg-search" style={{ position: "relative" }}>
              <i className="bi bi-search msg-search-icon"></i>
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Conversation list */}
            <div style={{ flexGrow: 1, overflowY: "auto" }}>
              {loadingList ? (
                <div style={{ padding: "32px 16px", textAlign: "center", color: "#6C7E75", fontSize: "13px" }}>
                  <div className="spinner-border spinner-border-sm text-secondary mb-2" role="status"></div>
                  <div>Loading chats...</div>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div style={{ padding: "40px 16px", textAlign: "center", color: "#6C7E75" }}>
                  <i className="bi bi-chat-square-text" style={{ fontSize: "2rem", opacity: 0.4 }}></i>
                  <div style={{ fontSize: "13px", marginTop: "8px" }}>
                    {searchQuery ? "No results found." : "No conversations yet."}
                  </div>
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const isActiveConv = c.conversation_id === selectedId;
                  const amClient = c.client_id === (user?.user_id || user?.id);
                  const them = amClient ? c.freelancer : c.client;
                  const label = [them?.first_name, them?.last_name].filter(Boolean).join(" ") || them?.email || "User";
                    const renderMessageContent = (content, mine) => {
    if (!content) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: mine ? '#B4F105' : '#0056b3', textDecoration: 'underline', wordBreak: 'break-all' }}>{part}</a>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
                    <div
                      key={c.conversation_id}
                      onClick={() => navigate(`/messages/${c.conversation_id}`)}
                      className={`conv-item ${isActiveConv ? "active" : ""}`}
                    >
                      <Avatar src={them?.avatar_url} name={label} size={42} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div className="conv-title text-truncate" style={{ maxWidth: "145px" }}>{c.title || label}</div>
                          {c.last_message_at && (
                            <span className="conv-time">{formatSidebarTime(c.last_message_at)}</span>
                          )}
                        </div>
                        <div className="conv-sub text-truncate">{label}</div>
                        {(amClient ? c.freelancer_delete_confirmed && !c.client_delete_confirmed : c.client_delete_confirmed && !c.freelancer_delete_confirmed) && (
                          <span
                            title={`${label} asked to delete this conversation`}
                            style={{ fontSize: "10px", background: "#FEE2E2", color: "#991B1B", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", display: "inline-block", marginTop: "4px", marginRight: "4px" }}
                          >
                            <i className="bi bi-trash me-1"></i>Wants to delete
                          </span>
                        )}
                        {c.contracts?.status === "completed" && (
                          <span style={{ fontSize: "10px", background: "#D1FAE5", color: "#065F46", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", display: "inline-block", marginTop: "4px" }}>
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Chat Area ── */}
          <div className={`col-md-8 col-lg-9 h-100 chat-area ${!selectedId ? "d-none d-md-flex" : "d-flex"} flex-column`}>

            {/* No chat selected */}
            {!selectedId ? (
              <div className="empty-state">
                <div className="empty-state-circle" style={{ width: 80, height: 80, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
                  <i className="bi bi-chat-heart" style={{ fontSize: "2.2rem", color: "#B4F105" }}></i>
                </div>
                <div className="empty-state-title" style={{ fontWeight: 700, fontSize: "16px" }}>Select a conversation</div>
                <div className="empty-state-sub" style={{ fontSize: "13.5px" }}>Choose from the list to start chatting.</div>
              </div>
            ) : !active ? (
              <div className="empty-state">
                <div className="spinner-border text-secondary" role="status"></div>
                <div style={{ fontSize: "13.5px" }}>Loading chat...</div>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="chat-header">
                  <button
                    onClick={() => navigate("/messages")}
                    className="d-md-none btn btn-sm btn-light rounded-circle"
                    style={{ width: 36, height: 36, padding: 0 }}
                  >
                    <i className="bi bi-arrow-left"></i>
                  </button>
                  <Avatar src={other?.avatar_url} name={personName(other)} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="chat-header-name" style={{ fontWeight: 800, fontSize: "15px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{active.title}</div>
                    <div className="chat-header-sub" style={{ fontSize: "12.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {isParticipant ? personName(other) : `${personName(active.client)} & ${personName(active.freelancer)}`}
                    </div>
                  </div>
                  {statusBadge(contractStatus)}
                </div>

                {/* Deletion Banner */}
                {isCompleted && isParticipant && (
                  <div className="deletion-banner">
                    {myConfirmed && otherConfirmed ? (
                      <span style={{ fontSize: "12.5px", color: "#6C7E75" }}>Deleting conversation...</span>
                    ) : myConfirmed ? (
                      <>
                        <span style={{ fontSize: "12.5px", color: "#6C7E75" }}>
                          <i className="bi bi-clock me-1"></i> Waiting for {personName(other)} to confirm deletion.
                        </span>
                        <button onClick={handleCancelDelete} disabled={deleteBusy} className="btn btn-sm btn-outline-secondary rounded-pill px-3">
                          Cancel
                        </button>
                      </>
                    ) : otherConfirmed ? (
                      <>
                        <span style={{ fontSize: "12.5px", color: "#92400E" }}>
                          <i className="bi bi-exclamation-triangle me-1"></i> {personName(other)} wants to delete this conversation.
                        </span>
                        <button onClick={handleConfirmDelete} disabled={deleteBusy} className="btn btn-sm btn-danger rounded-pill px-3 fw-bold">
                          <i className="bi bi-trash me-1"></i> Confirm Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: "12.5px", color: "#6C7E75" }}>
                          <i className="bi bi-lock me-1"></i> This job is complete — the conversation is now read-only.
                        </span>
                        <button onClick={handleConfirmDelete} disabled={deleteBusy} className="btn btn-sm btn-outline-danger rounded-pill px-3">
                          <i className="bi bi-trash me-1"></i> Delete
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Messages */}
                <div className="chat-messages">
                  {loadingMessages ? (
                    <div style={{ textAlign: "center", color: "#6C7E75", padding: "32px", fontSize: "13.5px" }}>
                      <div className="spinner-border spinner-border-sm text-secondary mb-2" role="status"></div>
                      <div>Loading messages...</div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#6C7E75", flexDirection: "column", gap: "8px", paddingTop: "40px" }}>
                      <i className="bi bi-chat-dots" style={{ fontSize: "2rem", opacity: 0.35 }}></i>
                      <div style={{ fontSize: "13.5px" }}>No messages yet. Say hello! 👋</div>
                    </div>
                  ) : (
                    messages.map((m) => {
                      if (m.message_type === "system") {
                          const renderMessageContent = (content, mine) => {
    if (!content) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: mine ? '#B4F105' : '#0056b3', textDecoration: 'underline', wordBreak: 'break-all' }}>{part}</a>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
                          <div key={m.message_id} className="system-msg">
                            <span className="system-msg-text">{m.content}</span>
                          </div>
                        );
                      }
                      const mine = m.sender_id === (user?.user_id || user?.id);
                      const imageUrl = m.file_url || attachmentUrls[m.message_id];
                      const isImg = isImageAttachment(m);

                        const renderMessageContent = (content, mine) => {
    if (!content) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: mine ? '#B4F105' : '#0056b3', textDecoration: 'underline', wordBreak: 'break-all' }}>{part}</a>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
                        <div key={m.message_id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", alignItems: "flex-end", gap: "8px" }}>
                          {!mine && (
                            <Avatar src={other?.avatar_url} name={personName(other)} size={30} />
                          )}
                          <div className={mine ? "bubble-mine" : "bubble-theirs"}>
                            {m.content && (
                              <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.55", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{renderMessageContent(m.content, mine)}</p>
                            )}

                            {m.file_path && (
                              isImg ? (
                                <div style={{ marginTop: "8px" }}>
                                  <div
                                    style={{
                                      maxWidth: "320px",
                                      borderRadius: "10px",
                                      overflow: "hidden",
                                      cursor: "pointer",
                                      backgroundColor: mine ? "rgba(255,255,255,0.08)" : "#f0f2f2",
                                      border: mine ? "1px solid rgba(255,255,255,0.15)" : "1px solid #E9EFEF"
                                    }}
                                    onClick={() => {
                                      if (imageUrl) setPreviewImage({ url: imageUrl, name: m.file_name });
                                    }}
                                    title="Click to view full image"
                                  >
                                    {imageUrl ? (
                                      <img
                                        src={imageUrl}
                                        alt={m.file_name || "Screenshot"}
                                        style={{
                                          width: "100%",
                                          maxHeight: "240px",
                                          objectFit: "contain",
                                          display: "block",
                                        }}
                                        loading="lazy"
                                      />
                                    ) : (
                                      <div style={{ padding: "20px", textAlign: "center", color: mine ? "#fff" : "#6C7E75", fontSize: "12px" }}>
                                        <div className="spinner-border spinner-border-sm me-1" role="status"></div>
                                        <span>Loading screenshot...</span>
                                      </div>
                                    )}
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px", fontSize: "11px", opacity: 0.75 }}>
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>
                                      {m.file_name} {m.file_size ? `· ${formatFileSize(m.file_size)}` : ""}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownload(m);
                                      }}
                                      style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: "0 4px" }}
                                      title="Download image"
                                    >
                                      <i className="bi bi-download"></i>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleDownload(m)}
                                  className={`file-bubble-btn ${mine ? "file-bubble-btn-mine" : "file-bubble-btn-theirs"}`}
                                >
                                  <i className="bi bi-file-earmark-arrow-down" style={{ fontSize: "16px" }}></i>
                                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.file_name}</span>
                                  <span style={{ opacity: 0.6, fontSize: "11px" }}>{formatFileSize(m.file_size)}</span>
                                </button>
                              )
                            )}

                            <div className="bubble-time">{formatClock(m.created_at)}</div>
                          </div>
                          {mine && (
                            <Avatar src={(isClient && user?.client_avatar_url) || user?.avatar_url} name={user?.first_name || "Me"} size={30} />
                          )}
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Composer */}
                {isParticipant && !isCompleted && (
                  <div className="msg-composer">
                    {error && (
                      <div style={{ fontSize: "12.5px", color: "#EF4444", marginBottom: "8px" }}>
                        <i className="bi bi-exclamation-circle me-1"></i>{error}
                      </div>
                    )}
                    {pendingFile && (
                      <div className="file-attach-preview">
                        <i className="bi bi-file-earmark-check" style={{ color: "#0B4F2E", fontSize: "18px", flexShrink: 0 }}></i>
                        <span style={{ flex: 1, fontSize: "13px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#0B130F" }}>{pendingFile.name}</span>
                        <span style={{ fontSize: "12px", color: "#6C7E75" }}>{formatFileSize(pendingFile.size)}</span>
                        <button type="button" className="btn-close" style={{ fontSize: "0.7rem" }} onClick={() => { setPendingFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}></button>
                      </div>
                    )}
                    <form onSubmit={handleSend} style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
                      <input ref={fileInputRef} type="file" className="d-none" onChange={(e) => setPendingFile(e.target.files[0] || null)} />
                      <button type="button" className="attach-btn" onClick={() => fileInputRef.current?.click()} title="Attach file">
                        <i className="bi bi-paperclip"></i>
                      </button>
                      <textarea
                        ref={textareaRef}
                        rows="1"
                        value={text}
                        onChange={autoResizeTextarea}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); }
                        }}
                        placeholder="Type a message... (Shift+Enter for new line)"
                        style={{ flexGrow: 1, background: "#F4F6F5", border: "1.5px solid #E9EFEF", borderRadius: "14px", padding: "10px 16px", fontSize: "14px", resize: "none", outline: "none", minHeight: "44px", maxHeight: "140px", overflowY: "auto", transition: "all 0.2s", fontFamily: "inherit" }}
                        onFocus={(e) => { e.target.style.background = "#fff"; e.target.style.borderColor = "#B4F105"; e.target.style.boxShadow = "0 0 0 3px rgba(180,241,5,0.12)"; }}
                        onBlur={(e) => { e.target.style.background = "#F4F6F5"; e.target.style.borderColor = "#E9EFEF"; e.target.style.boxShadow = "none"; }}
                      />
                      <button type="submit" disabled={sending || (!text.trim() && !pendingFile)} className="send-btn" title="Send message">
                        {sending ? <span className="spinner-border spinner-border-sm" style={{ color: "#B4F105" }} role="status"></span> : <i className="bi bi-send-fill"></i>}
                      </button>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Image Preview Lightbox */}
      {previewImage && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center p-3"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.88)",
            zIndex: 2000,
            backdropFilter: "blur(6px)",
          }}
          onClick={() => setPreviewImage(null)}
        >
          <div className="position-absolute top-0 end-0 p-3 d-flex gap-2" onClick={(e) => e.stopPropagation()}>
            <a
              href={previewImage.url}
              download={previewImage.name || "image"}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline-light rounded-pill btn-sm px-3 d-flex align-items-center gap-1.5"
            >
              <i className="bi bi-download"></i> Download
            </a>
            <button
              type="button"
              className="btn btn-light rounded-circle btn-sm d-flex align-items-center justify-content-center"
              style={{ width: 34, height: 34 }}
              onClick={() => setPreviewImage(null)}
              title="Close preview"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          <div
            className="d-flex flex-column align-items-center"
            style={{ maxWidth: "92vw", maxHeight: "88vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage.url}
              alt={previewImage.name || "Preview"}
              className="rounded shadow-lg"
              style={{
                maxWidth: "100%",
                maxHeight: "82vh",
                objectFit: "contain",
              }}
            />
            {previewImage.name && (
              <span className="text-white-50 small mt-2 text-truncate" style={{ maxWidth: "80vw" }}>
                {previewImage.name}
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}

