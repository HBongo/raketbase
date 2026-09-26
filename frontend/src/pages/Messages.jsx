import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
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

// LinkedIn-style Shimmer Skeletons
function ConversationListSkeleton() {
  return (
    <div className="d-flex flex-column gap-2 p-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="card card-body bg-white border-0 shadow-sm p-3">
          <div className="d-flex w-100 justify-content-between align-items-center mb-2">
            <div className="skeleton-box" style={{ width: `${50 + (i % 3) * 15}%`, height: 14 }} />
            <div className="skeleton-box" style={{ width: 34, height: 10 }} />
          </div>
          <div className="d-flex align-items-center gap-2 mt-1">
            <div className="skeleton-box rounded-circle flex-shrink-0" style={{ width: 24, height: 24 }} />
            <div className="skeleton-box" style={{ width: `${60 + (i % 2) * 20}%`, height: 11 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChatAreaSkeleton() {
  return (
    <div className="flex-grow-1 d-flex flex-column h-100 bg-white">
      {/* Header Skeleton */}
      <div className="p-3 border-bottom d-flex align-items-center gap-3">
        <div className="skeleton-box rounded-circle flex-shrink-0" style={{ width: 42, height: 42 }} />
        <div className="d-flex flex-column gap-2 flex-grow-1">
          <div className="skeleton-box" style={{ width: 160, height: 15 }} />
          <div className="skeleton-box" style={{ width: 100, height: 11 }} />
        </div>
      </div>
      {/* Messages Stream Skeleton */}
      <div className="flex-grow-1 p-4 d-flex flex-column gap-3 overflow-hidden bg-white">
        <div className="d-flex align-items-start gap-2">
          <div className="skeleton-box rounded-circle flex-shrink-0" style={{ width: 32, height: 32 }} />
          <div className="skeleton-box" style={{ width: "42%", height: 50, borderRadius: "18px 18px 18px 4px" }} />
        </div>
        <div className="d-flex justify-content-end">
          <div className="skeleton-box" style={{ width: "50%", height: 60, borderRadius: "18px 18px 4px 18px" }} />
        </div>
        <div className="d-flex align-items-start gap-2">
          <div className="skeleton-box rounded-circle flex-shrink-0" style={{ width: 32, height: 32 }} />
          <div className="skeleton-box" style={{ width: "35%", height: 42, borderRadius: "18px 18px 18px 4px" }} />
        </div>
        <div className="d-flex justify-content-end">
          <div className="skeleton-box" style={{ width: "28%", height: 38, borderRadius: "18px 18px 4px 18px" }} />
        </div>
      </div>
    </div>
  );
}

import { getCached, setCached } from "../utils/cache";

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
  const [previewImage, setPreviewImage] = useState(null);
  const [attachmentUrls, setAttachmentUrls] = useState({});

  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const channelRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const res = await getConversations();
      const list = res.data || [];
      setConversations(list);
      setCached("messages_conversations", list);
    } catch (err) {
      showToast(err.message || "Failed to load conversations");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    loadConversations();
  }, [loadConversations, navigate]);

  useEffect(() => {
    if (!selectedId) {
      setActive(null);
      setMessages([]);
      return;
    }
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
    return () => {
      cancelled = true;
    };
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
    const channel = supabase.channel(`conversation:${selectedId}`);
    channelRef.current = channel;

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

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [selectedId, user, loadConversations]);

  // Resolve signed URLs for any messages with attachments that lack file_url
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
      } catch {}
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
      showToast(err.message || "Failed to confirm deletion");
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
      showToast(err.message || "Failed to cancel deletion");
    } finally {
      setDeleteBusy(false);
    }
  };

  const currentUserId = user?.user_id || user?.id;
  const isClient = active?.client_id === currentUserId;
  const isFreelancer = active?.freelancer_id === currentUserId;
  const isParticipant = isClient || isFreelancer;
  const other = isClient ? active?.freelancer : active?.client;
  const contractStatus = active?.contracts?.status;
  const isCompleted = contractStatus === "completed";

  const myConfirmed = isClient ? active?.client_deleted : isFreelancer ? active?.freelancer_deleted : false;
  const otherConfirmed = isClient ? active?.freelancer_deleted : isFreelancer ? active?.client_deleted : false;

  return (
    <>


        <div className="page-content-wrapper flex-grow-1 p-0 position-relative d-flex flex-column" style={{ overflow: "hidden" }}>
          {(loadingList || loadingMessages) && (
            <div className="loading-bar-container" style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 100 }}>
              <div className="loading-bar-indeterminate" />
            </div>
          )}
          <div className="row g-0 flex-grow-1 h-100">
            {/* Conversation List Sidebar */}
            <div className={`col-md-4 col-lg-3 border-end h-100 d-flex flex-column ${selectedId ? "d-none d-md-flex" : ""}`} style={{ backgroundColor: "#f8f9fa" }}>
              <div className="p-3 border-bottom bg-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">Messages</h5>
                <span className="badge bg-primary rounded-pill">{loadingList ? "..." : conversations.length}</span>
              </div>
              <div className="flex-grow-1 overflow-auto">
                {loadingList ? (
                  <ConversationListSkeleton />
                ) : conversations.length === 0 ? (
                  <div className="text-center p-4 text-muted small">No conversations yet.</div>
                ) : (
                  <div className="d-flex flex-column gap-2 p-3">
                    {conversations.map((c) => {
                      const isActive = c.conversation_id === selectedId;
                      const amClient = c.client_id === currentUserId;
                      const them = amClient ? c.freelancer : c.client;
                      const label = [them?.first_name, them?.last_name].filter(Boolean).join(" ") || them?.email || "User";
                      
                      return (
                        <button
                          key={c.conversation_id}
                          onClick={() => navigate(`/messages/${c.conversation_id}`)}
                          className={`card card-body text-start shadow-sm transition-all text-decoration-none ${isActive ? "bg-white border-0 z-1" : "bg-light border-light opacity-75"}`}
                          style={isActive ? { borderLeft: "4px solid #FF5A1E" } : { borderLeft: "4px solid transparent" }}
                        >
                          <div className="d-flex w-100 justify-content-between align-items-start mb-1">
                            <h6 className="mb-0 fw-bold text-truncate" style={{ fontSize: "14px" }}>{c.title}</h6>
                            {c.last_message_at && (
                              <small className="text-muted ms-2" style={{ fontSize: "11px", flexShrink: 0 }}>
                                {formatSidebarTime(c.last_message_at)}
                              </small>
                            )}
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <img src={them?.avatar_url || "https://ui-avatars.com/api/?name=User&background=random"} className="rounded-circle" style={{ width: "24px", height: "24px", objectFit: "cover" }} />
                            <small className="text-muted text-truncate" style={{ fontSize: "12px" }}>{label}</small>
                          </div>
                          {c.contracts?.status === "completed" && (
                            <div className="mt-2">
                              <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill" style={{ fontSize: "10px" }}>Completed</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className={`col-md-8 col-lg-9 h-100 d-flex flex-column ${!selectedId ? "d-none d-md-flex" : ""}`}>
              {!selectedId ? (
                loadingList ? (
                  <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center text-muted bg-white">
                    <div className="skeleton-box rounded-circle mb-3" style={{ width: 64, height: 64 }} />
                    <div className="skeleton-box mb-2" style={{ width: 180, height: 18 }} />
                    <div className="skeleton-box" style={{ width: 260, height: 12 }} />
                  </div>
                ) : (
                  <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center text-muted bg-white">
                    <i className="bi bi-chat-text" style={{ fontSize: "3rem", opacity: 0.5 }}></i>
                    <h4 className="mt-3 fw-light">Select a conversation</h4>
                    <p className="small">Pick a chat from the list to see your messages.</p>
                  </div>
                )
              ) : !active ? (
                <ChatAreaSkeleton />
              ) : (
                <>
                  {/* Chat Header */}
                  <div className="p-3 border-bottom bg-white d-flex align-items-center justify-content-between shadow-sm" style={{ zIndex: 10 }}>
                    <div className="d-flex align-items-center gap-3">
                      <button onClick={() => navigate("/messages")} className="btn btn-sm btn-light d-md-none rounded-circle">
                        <i className="bi bi-arrow-left"></i>
                      </button>
                      <div className="d-flex flex-column">
                        <h5 className="mb-0 fw-bold">{active.title}</h5>
                        <small className="text-muted">
                          {isParticipant ? personName(other) : `${personName(active.client)} & ${personName(active.freelancer)}`}
                        </small>
                      </div>
                    </div>
                    {contractStatus && (
                      <span className={`badge rounded-pill px-3 py-2 ${
                        isCompleted ? "bg-success bg-opacity-10 text-success border border-success border-opacity-25" :
                        contractStatus === "submitted" ? "bg-info bg-opacity-10 text-info border border-info border-opacity-25" :
                        "bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25"
                      }`}>
                        {contractStatus === "active" ? "In Progress" : contractStatus}
                      </span>
                    )}
                  </div>

                  {/* Deletion Banner */}
                  {isCompleted && isParticipant && (
                    <div className="bg-light border-bottom p-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                      {myConfirmed && otherConfirmed ? (
                        <span className="text-muted small">Deleting...</span>
                      ) : myConfirmed ? (
                        <>
                          <span className="text-muted small">
                            You marked this conversation for deletion. Waiting for {personName(other)} to confirm.
                          </span>
                          <button onClick={handleCancelDelete} disabled={deleteBusy} className="btn btn-sm btn-outline-secondary rounded-pill">
                            Cancel
                          </button>
                        </>
                      ) : otherConfirmed ? (
                        <>
                          <span className="text-muted small">
                            {personName(other)} wants to permanently delete this conversation.
                          </span>
                          <button onClick={handleConfirmDelete} disabled={deleteBusy} className="btn btn-sm btn-danger rounded-pill fw-medium d-flex align-items-center gap-1">
                            <i className="bi bi-trash"></i> Confirm Delete
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-muted small">
                            This job is complete. The conversation is read-only.
                          </span>
                          <button onClick={handleConfirmDelete} disabled={deleteBusy} className="btn btn-sm btn-outline-danger rounded-pill fw-medium d-flex align-items-center gap-1">
                            <i className="bi bi-trash"></i> Delete Conversation
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Messages Area */}
                  <div className="flex-grow-1 p-4 overflow-auto" style={{ backgroundColor: "#fff" }}>
                    {loadingMessages ? (
                      <div className="d-flex flex-column gap-3 overflow-hidden">
                        <div className="d-flex align-items-start gap-2">
                          <div className="skeleton-box rounded-circle flex-shrink-0" style={{ width: 32, height: 32 }} />
                          <div className="skeleton-box p-3" style={{ width: "45%", height: 52, borderRadius: "18px 18px 18px 4px" }} />
                        </div>
                        <div className="d-flex justify-content-end">
                          <div className="skeleton-box p-3" style={{ width: "50%", height: 60, borderRadius: "18px 18px 4px 18px" }} />
                        </div>
                        <div className="d-flex align-items-start gap-2">
                          <div className="skeleton-box rounded-circle flex-shrink-0" style={{ width: 32, height: 32 }} />
                          <div className="skeleton-box p-3" style={{ width: "38%", height: 42, borderRadius: "18px 18px 18px 4px" }} />
                        </div>
                        <div className="d-flex justify-content-end">
                          <div className="skeleton-box p-3" style={{ width: "30%", height: 38, borderRadius: "18px 18px 4px 18px" }} />
                        </div>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="h-100 d-flex align-items-center justify-content-center text-muted">
                        <p>No messages yet. Say hello to get things started.</p>
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {messages.map((m) => {
                          if (m.message_type === "system") {
                            return (
                              <div key={m.message_id} className="text-center my-2">
                                <span className="badge bg-light text-secondary border rounded-pill px-3 py-2 fw-normal" style={{ fontSize: "12px" }}>
                                  {m.content}
                                </span>
                              </div>
                            );
                          }
                          const mine = m.sender_id === (user?.user_id || user?.id);
                          const imageUrl = m.file_url || attachmentUrls[m.message_id];
                          const isImg = isImageAttachment(m);
                          return (
                            <div key={m.message_id} className={`d-flex ${mine ? "justify-content-end" : "justify-content-start"}`}>
                              <div className={`p-3 rounded-3 shadow-sm ${mine ? "bg-dark text-white" : "bg-light border"}`} style={{ maxWidth: "75%", borderBottomRightRadius: mine ? "4px" : "16px", borderBottomLeftRadius: !mine ? "4px" : "16px" }}>
                                {m.content && <p className="mb-1 text-break" style={{ whiteSpace: "pre-wrap", fontSize: "14px" }}>{m.content}</p>}
                                {m.file_path && (
                                  isImg ? (
                                    <div className="mt-2">
                                      <div
                                        className="position-relative overflow-hidden rounded-3 border border-secondary border-opacity-25"
                                        style={{
                                          maxWidth: "340px",
                                          cursor: "pointer",
                                          backgroundColor: mine ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
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
                                            className="img-fluid rounded-3"
                                            style={{
                                              maxHeight: "260px",
                                              width: "100%",
                                              objectFit: "contain",
                                              display: "block",
                                            }}
                                            loading="lazy"
                                          />
                                        ) : (
                                          <div className="p-4 text-center">
                                            <div className="spinner-border spinner-border-sm text-secondary" role="status"></div>
                                            <div className="small text-muted mt-2">Loading image...</div>
                                          </div>
                                        )}
                                      </div>
                                      <div className="d-flex align-items-center justify-content-between mt-1 px-1">
                                        <span
                                          className={`small text-truncate ${mine ? "text-white-50" : "text-muted"}`}
                                          style={{ fontSize: "11px", maxWidth: "220px" }}
                                          title={m.file_name}
                                        >
                                          {m.file_name} {m.file_size ? `· ${formatFileSize(m.file_size)}` : ""}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownload(m);
                                          }}
                                          className={`btn btn-link btn-sm p-0 text-decoration-none ${mine ? "text-white-50" : "text-muted"}`}
                                          title="Download original file"
                                          style={{ fontSize: "12px" }}
                                        >
                                          <i className="bi bi-download"></i>
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleDownload(m)}
                                      className={`btn btn-sm mt-2 d-flex align-items-center gap-2 text-start w-100 ${mine ? "btn-outline-light text-white border-secondary" : "btn-outline-secondary bg-white"}`}
                                    >
                                      <i className="bi bi-file-earmark"></i>
                                      <span className="text-truncate flex-grow-1" style={{ maxWidth: "150px" }}>{m.file_name}</span>
                                      <span className="small opacity-75">{formatFileSize(m.file_size)}</span>
                                      <i className="bi bi-download ms-auto"></i>
                                    </button>
                                  )
                                )}
                                <div className={`text-end mt-1 ${mine ? "text-white-50" : "text-muted"}`} style={{ fontSize: "10px" }}>
                                  {formatClock(m.created_at)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={bottomRef} />
                      </div>
                    )}
                  </div>

                  {/* Message Composer */}
                  {isParticipant && !isCompleted && (
                    <div className="p-3 bg-white border-top shadow-sm">
                      {error && <div className="text-danger small mb-2">{error}</div>}
                      {pendingFile && (
                        <div className="d-flex align-items-center gap-2 bg-light border rounded p-2 mb-2 small">
                          {pendingFile.type?.startsWith("image/") ? (
                            <img
                              src={URL.createObjectURL(pendingFile)}
                              alt="Upload preview"
                              className="rounded border"
                              style={{ width: 36, height: 36, objectFit: "cover" }}
                            />
                          ) : (
                            <i className="bi bi-file-earmark text-primary fs-5"></i>
                          )}
                          <span className="text-truncate flex-grow-1 fw-medium">{pendingFile.name}</span>
                          <span className="text-muted">{formatFileSize(pendingFile.size)}</span>
                          <button type="button" className="btn-close ms-auto" style={{ fontSize: "0.75rem" }} onClick={() => { setPendingFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}></button>
                        </div>
                      )}
                      <form onSubmit={handleSend} className="d-flex align-items-end gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="d-none"
                          onChange={(e) => setPendingFile(e.target.files[0] || null)}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="btn btn-light border rounded-circle flex-shrink-0 d-flex justify-content-center align-items-center"
                          style={{ width: "42px", height: "42px" }}
                        >
                          <i className="bi bi-paperclip fs-5 text-secondary"></i>
                        </button>
                        <textarea
                          rows="1"
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSend(e);
                            }
                          }}
                          placeholder="Type your message..."
                          className="form-control"
                          style={{ resize: "none", overflow: "hidden", minHeight: "42px", borderRadius: "20px", padding: "10px 20px" }}
                        />
                        <button
                          type="submit"
                          disabled={sending || (!text.trim() && !pendingFile)}
                          className="btn btn-dark rounded-circle flex-shrink-0 d-flex justify-content-center align-items-center"
                          style={{ width: "42px", height: "42px" }}
                        >
                          <i className="bi bi-send-fill text-white"></i>
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
