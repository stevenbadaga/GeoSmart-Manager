import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import { api, API_URL, apiRequest } from '../api/http'
import { useAuth } from '../auth/AuthContext'

const roleLabel = (role) => {
  if (role === 'SURVEYOR') return 'Land Surveyor'
  if (role === 'CLIENT') return 'Client'
  if (role === 'ADMIN') return 'Admin'
  return role || 'User'
}

const formatTime = (value) => {
  if (!value) return ''
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const initials = (name, email) => (name || email || 'U').slice(0, 1).toUpperCase()

const parseMessageBody = (bodyStr) => {
  if (!bodyStr) return { text: '' }
  if (bodyStr.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(bodyStr)
      if (parsed && (parsed.text !== undefined || parsed.attachmentUrl !== undefined)) {
        return parsed
      }
    } catch (e) {
      // Not JSON, treat as text
    }
  }
  return { text: bodyStr }
}

export default function Messages() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const handledConvIdRef = useRef(null)
  const [contacts, setContacts] = useState([])
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [query, setQuery] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [threadLoading, setThreadLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  // Attachment state
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreviewUrl, setFilePreviewUrl] = useState('')

  // Voice note state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordedAudioBlob, setRecordedAudioBlob] = useState(null)
  const [audioPreviewUrl, setAudioPreviewUrl] = useState('')

  // CRUD state
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editBody, setEditBody] = useState('')
  const [activeMenuMessageId, setActiveMenuMessageId] = useState(null)
  const [menuAlign, setMenuAlign] = useState('left')
  const [menuValign, setMenuValign] = useState('down')
  const [mediaRecorder, setMediaRecorder] = useState(null)

  // Camera state
  const [cameraOpen, setCameraOpen] = useState(false)
  const videoRef = useRef(null)
  const fileInputRef = useRef(null)

  // Clean up URLs
  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl)
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl)
    }
  }, [filePreviewUrl, audioPreviewUrl])

  const loadInbox = async (silent = false) => {
    if (!user) {
      setLoading(false)
      setError('Your session is not ready. Please sign in again.')
      return
    }
    if (!silent) setLoading(true)
    try {
      const [conversationData, contactData] = await Promise.all([
        api.get('/api/messages/conversations'),
        api.get('/api/messages/contacts')
      ])
      setConversations(conversationData || [])
      setContacts(contactData || [])
      if (activeConversation) {
        const updated = (conversationData || []).find((item) => item.id === activeConversation.id)
        if (updated) setActiveConversation(updated)
      }
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        setError('Your session has expired or is no longer authorized. Please sign in again.')
      } else {
        setError(err.message || 'Unable to load messages.')
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const openConversation = async (conversation) => {
    setActiveConversation(conversation)
    setThreadLoading(true)
    setError('')
    try {
      const data = await api.get(`/api/messages/conversations/${conversation.id}/messages`)
      setMessages(data || [])
      await api.post(`/api/messages/conversations/${conversation.id}/read`, {})
      setConversations((current) => current.map((item) => (
        item.id === conversation.id ? { ...item, unreadCount: 0 } : item
      )))
    } catch (err) {
      setError(err.message || 'Unable to open conversation.')
    } finally {
      setThreadLoading(false)
    }
  }

  const startConversation = async (contact) => {
    setThreadLoading(true)
    setError('')
    try {
      const conversation = await api.post('/api/messages/conversations', { recipientId: contact.id })
      await loadInbox(true)
      await openConversation(conversation)
    } catch (err) {
      setError(err.message || 'Unable to start conversation.')
    } finally {
      setThreadLoading(false)
    }
  }

  const uploadAttachment = async (file) => {
    const formData = new FormData()
    formData.append('file', file)

    try {
      return await apiRequest('/api/messages/upload', {
        method: 'POST',
        body: formData
      })
    } catch (err) {
      if (err.status === 403) {
        throw new Error('You do not have permission to upload in this conversation.')
      }
      if (err.status === 413) {
        throw new Error('File is too large.')
      }
      if (err.status === 415) {
        throw new Error('Unsupported file type.')
      }
      throw err
    }
  }

  const sendMessage = async (event) => {
    event.preventDefault()
    if (!activeConversation || sending) return
    const hasText = body.trim().length > 0
    const hasFile = !!selectedFile
    const hasAudio = !!recordedAudioBlob
    if (!hasText && !hasFile && !hasAudio) return

    setSending(true)
    setError('')
    try {
      let attachment = null
      
      if (hasFile) {
        const uploadRes = await uploadAttachment(selectedFile)
        attachment = {
          url: uploadRes.url,
          name: uploadRes.name,
          type: uploadRes.type,
          size: Number(uploadRes.size),
          mimeType: uploadRes.mimeType
        }
      } else if (hasAudio) {
        const audioFile = new File([recordedAudioBlob], 'voicenote.webm', { type: 'audio/webm' })
        const uploadRes = await uploadAttachment(audioFile)
        attachment = {
          url: uploadRes.url,
          name: 'Voice Note.webm',
          type: 'audio',
          size: Number(uploadRes.size),
          mimeType: 'audio/webm'
        }
      }

      let finalBody = body.trim()
      if (attachment) {
        finalBody = JSON.stringify({
          text: body.trim(),
          attachmentUrl: attachment.url,
          attachmentType: attachment.type,
          attachmentName: attachment.name,
          attachmentSize: attachment.size,
          mimeType: attachment.mimeType
        })
      }

      const sent = await api.post(`/api/messages/conversations/${activeConversation.id}/messages`, { body: finalBody })
      setMessages((current) => [...current, sent])
      setBody('')
      setSelectedFile(null)
      setFilePreviewUrl('')
      setRecordedAudioBlob(null)
      setAudioPreviewUrl('')
      await loadInbox(true)
    } catch (err) {
      setError(err.message || 'Unable to send message.')
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    const handleDocumentClick = () => {
      setActiveMenuMessageId(null)
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveMenuMessageId(null)
      }
    }
    document.addEventListener('click', handleDocumentClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('click', handleDocumentClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleMenuToggle = (e, msgId, isMine) => {
    e.stopPropagation()
    if (activeMenuMessageId === msgId) {
      setActiveMenuMessageId(null)
    } else {
      const buttonRect = e.currentTarget.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const menuWidth = 176 // w-44 is 176px

      // Determine horizontal side: open on the left of the button if space permits (>= 16px buffer), fallback to right
      const align = (buttonRect.left - menuWidth >= 16) ? 'left' : 'right'

      // Determine vertical alignment: align bottom edges if close to bottom edge of screen, otherwise align top edges
      const valign = (viewportHeight - buttonRect.bottom < 120) ? 'bottom' : 'top'

      setMenuValign(valign)
      setMenuAlign(align)
      setActiveMenuMessageId(msgId)
    }
  }

  const renderMenu = (message, parsed, canEdit, canDelete) => {
    const menuClasses = `absolute z-20 w-44 bg-white dark:bg-[#0D2F27] border border-slate-200 dark:border-emerald-900/80 rounded-xl shadow-lg py-1.5 overflow-hidden animate-rise ${
      menuAlign === 'left' ? 'right-full mr-2' : 'left-full ml-2'
    } ${
      menuValign === 'bottom' ? 'bottom-[-8px]' : 'top-[-8px]'
    }`

    return (
      <div className={menuClasses} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => {
            handleCopyText(parsed.text || '')
            setActiveMenuMessageId(null)
          }}
          className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-emerald-900/30 active:bg-slate-100 dark:active:bg-emerald-900/50 transition-colors flex items-center gap-2.5 focus:outline-none focus:bg-slate-50 dark:focus:bg-emerald-900/30"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span>Copy text</span>
        </button>
        
        {parsed.attachmentUrl && (
          <a
            href={`${API_URL}${parsed.attachmentUrl}`}
            download={parsed.attachmentName}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setActiveMenuMessageId(null)}
            className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-emerald-900/30 active:bg-slate-100 dark:active:bg-emerald-900/50 transition-colors flex items-center gap-2.5 focus:outline-none focus:bg-slate-50 dark:focus:bg-emerald-900/30"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Download file</span>
          </a>
        )}

        {canEdit && (
          <button
            type="button"
            onClick={() => handleStartEdit(message)}
            className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-emerald-900/30 active:bg-slate-100 dark:active:bg-emerald-900/50 transition-colors flex items-center gap-2.5 focus:outline-none focus:bg-slate-50 dark:focus:bg-emerald-900/30"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            <span>Edit message</span>
          </button>
        )}

        {canDelete && (
          <div className="border-t border-slate-100 dark:border-emerald-950/60 my-1" />
        )}

        {canDelete && (
          <button
            type="button"
            onClick={() => handleDeleteMessage(message.id)}
            className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 active:bg-rose-100 dark:active:bg-rose-950/40 transition-colors flex items-center gap-2.5 focus:outline-none focus:bg-rose-50 dark:focus:bg-rose-950/20"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            <span>Delete message</span>
          </button>
        )}
      </div>
    )
  }

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text)
  }

  const handleStartEdit = (message) => {
    const parsed = parseMessageBody(message.body)
    setEditingMessageId(message.id)
    setEditBody(parsed.text || '')
    setActiveMenuMessageId(null)
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditBody('')
  }

  const handleSaveEdit = async (message) => {
    if (!editBody.trim()) return
    setSending(true)
    setError('')
    try {
      const parsed = parseMessageBody(message.body)
      let finalBody = editBody.trim()
      if (parsed.attachmentUrl) {
        finalBody = JSON.stringify({
          text: editBody.trim(),
          attachmentUrl: parsed.attachmentUrl,
          attachmentType: parsed.attachmentType,
          attachmentName: parsed.attachmentName,
          attachmentSize: parsed.attachmentSize,
          mimeType: parsed.mimeType
        })
      }
      const updated = await api.patch(`/api/messages/${message.id}`, { body: finalBody })
      setMessages((current) => current.map((m) => m.id === message.id ? updated : m))
      setEditingMessageId(null)
      setEditBody('')
      await loadInbox(true)
    } catch (err) {
      setError(err.message || 'Failed to edit message.')
    } finally {
      setSending(false)
    }
  }

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message?')) return
    setSending(true)
    setError('')
    try {
      await api.del(`/api/messages/${messageId}`)
      setMessages((current) => current.filter((m) => m.id !== messageId))
      setActiveMenuMessageId(null)
      await loadInbox(true)
    } catch (err) {
      setError(err.message || 'Failed to delete message.')
    } finally {
      setSending(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const type = file.type || ''
    const size = file.size || 0

    const isImage = type.startsWith('image/')
    const isVideo = type.startsWith('video/')
    const isDoc = type === 'application/pdf' || 
                  type === 'application/msword' || 
                  type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

    if (!isImage && !isVideo && !isDoc) {
      setError('Unsupported file type.')
      return
    }

    if (isImage && size > 10 * 1024 * 1024) {
      setError('File is too large.')
      return
    }
    if (isVideo && size > 50 * 1024 * 1024) {
      setError('File is too large.')
      return
    }
    if (isDoc && size > 20 * 1024 * 1024) {
      setError('File is too large.')
      return
    }

    setError('')
    setSelectedFile(file)
    if (isImage) {
      setFilePreviewUrl(URL.createObjectURL(file))
    } else {
      setFilePreviewUrl('')
    }
    setRecordedAudioBlob(null)
    setAudioPreviewUrl('')
  }

  const clearSelectedFile = () => {
    setSelectedFile(null)
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl)
    setFilePreviewUrl('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const startRecording = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        setRecordedAudioBlob(blob)
        setAudioPreviewUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
      setRecordingTime(0)
      setSelectedFile(null)
      setFilePreviewUrl('')
    } catch (err) {
      setError('Microphone permission denied or not supported by browser.')
    }
  }

  useEffect(() => {
    let interval = null
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((time) => time + 1)
      }, 1000)
    } else {
      clearInterval(interval)
    }
    return () => clearInterval(interval)
  }, [isRecording])

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
    setIsRecording(false)
  }

  const cancelRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
    setIsRecording(false)
    setRecordedAudioBlob(null)
    setAudioPreviewUrl('')
  }

  const clearVoiceNote = () => {
    setRecordedAudioBlob(null)
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl)
    setAudioPreviewUrl('')
  }

  const openCamera = async () => {
    setError('')
    setCameraOpen(true)
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (err) {
        setError('Camera permission denied or camera not available.')
        setCameraOpen(false)
      }
    }, 100)
  }

  const capturePhoto = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    canvas.toBlob((blob) => {
      const file = new File([blob], 'snapshot.jpg', { type: 'image/jpeg' })
      setSelectedFile(file)
      setFilePreviewUrl(URL.createObjectURL(file))
      closeCamera()
    }, 'image/jpeg')
  }

  const closeCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject
      stream.getTracks().forEach(track => track.stop())
    }
    setCameraOpen(false)
  }

  useEffect(() => {
    if (user) {
      loadInbox()
    } else {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    const targetConvId = searchParams.get('conversationId')
    if (targetConvId && conversations.length > 0 && handledConvIdRef.current !== targetConvId) {
      const targetId = parseInt(targetConvId, 10)
      const match = conversations.find(c => c.id === targetId)
      if (match) {
        setActiveConversation(match)
        handledConvIdRef.current = targetConvId
      }
    }
  }, [searchParams, conversations])

  useEffect(() => {
    if (!user) return () => {}
    const interval = setInterval(() => {
      loadInbox(true)
      if (activeConversation) {
        api.get(`/api/messages/conversations/${activeConversation.id}/messages`)
          .then((data) => setMessages(data || []))
          .catch(() => {})
      }
    }, 15000)
    return () => clearInterval(interval)
  }, [user?.id, activeConversation?.id])

  const filteredContacts = useMemo(() => {
    const value = query.trim().toLowerCase()
    const existingUserIds = new Set(conversations.map((item) => item.otherParticipant?.userId).filter(Boolean))
    return contacts
      .filter((contact) => !existingUserIds.has(contact.id))
      .filter((contact) => {
        if (!value) return true
        return `${contact.fullName} ${contact.email} ${contact.relationship}`.toLowerCase().includes(value)
      })
  }, [contacts, conversations, query])

  const filteredConversations = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return conversations
    return conversations.filter((conversation) => {
      const other = conversation.otherParticipant
      const last = conversation.lastMessage
      return `${other?.fullName || ''} ${other?.email || ''} ${last?.body || ''}`.toLowerCase().includes(value)
    })
  }, [conversations, query])

  const selected = activeConversation?.otherParticipant

  const renderMessageContent = (message) => {
    const parsed = parseMessageBody(message.body)
    
    return (
      <div className="space-y-2">
        {parsed.text && <p className="whitespace-pre-wrap">{parsed.text}</p>}
        
        {parsed.attachmentUrl && (
          <div className="mt-1">
            {parsed.attachmentType === 'image' && (
              <div className="message-bubble-media rounded-lg overflow-hidden border border-slate-200/20 max-w-[280px]">
                <img 
                  src={`${API_URL}${parsed.attachmentUrl}`} 
                  alt={parsed.attachmentName || 'Image Attachment'} 
                  className="max-w-full h-auto cursor-pointer hover:opacity-90 max-h-[200px] object-cover"
                  onClick={() => window.open(`${API_URL}${parsed.attachmentUrl}`, '_blank')}
                />
              </div>
            )}
            
            {parsed.attachmentType === 'video' && (
              <div className="message-bubble-media rounded-lg overflow-hidden border border-slate-200/20 max-w-[280px]">
                <video 
                  src={`${API_URL}${parsed.attachmentUrl}`} 
                  controls 
                  preload="metadata"
                  className="max-w-full h-auto max-h-[220px]"
                />
              </div>
            )}
            
            {parsed.attachmentType === 'audio' && (
              <div className="message-bubble-audio py-1.5 px-3 bg-white/10 dark:bg-black/20 rounded-xl flex items-center gap-2 max-w-[280px]">
                <audio 
                  src={`${API_URL}${parsed.attachmentUrl}`} 
                  controls 
                  preload="metadata"
                  className="max-w-full h-8"
                />
              </div>
            )}
            
            {parsed.attachmentType === 'document' && (
              <div className="message-bubble-document flex items-center gap-3 p-3 bg-white/5 dark:bg-black/10 rounded-xl border border-white/10 dark:border-black/20">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs uppercase">
                  {parsed.attachmentName?.split('.').pop() || 'doc'}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-xs font-bold truncate text-white">{parsed.attachmentName || 'Attachment File'}</p>
                  <p className="text-[9px] opacity-60">{(parsed.attachmentSize / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <a 
                  href={`${API_URL}${parsed.attachmentUrl}`} 
                  download={parsed.attachmentName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-400 text-[10px] font-black uppercase text-white flex items-center justify-center shrink-0 tracking-wider shadow-sm transition-colors"
                >
                  Get
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="messages-page animate-rise">
      <section className="messages-hero">
        <div>
          <p className="messages-kicker">Secure Workspace</p>
          <h1>Messages</h1>
          <p>Coordinate with admins, assigned surveyors, and assigned clients in one persistent inbox.</p>
        </div>
        <div className="messages-hero-stat">
          <strong>{conversations.reduce((sum, item) => sum + Number(item.unreadCount || 0), 0)}</strong>
          <span>Unread</span>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      )}

      <section className="messages-shell">
        <aside className="messages-sidebar">
          <div className="messages-search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search conversations..."
            />
          </div>

          <div className="messages-list custom-scrollbar">
            {loading ? (
              <p className="messages-muted">Loading inbox...</p>
            ) : filteredConversations.length === 0 && filteredContacts.length === 0 ? (
              <p className="messages-muted">No available conversations yet.</p>
            ) : (
              <>
                {filteredConversations.map((conversation) => {
                  const other = conversation.otherParticipant
                  const active = activeConversation?.id === conversation.id
                  const lastParsed = parseMessageBody(conversation.lastMessage?.body)
                  const lastPreviewText = lastParsed.attachmentUrl 
                    ? `📎 Attachment (${lastParsed.attachmentType})`
                    : lastParsed.text
                  return (
                    <button
                      type="button"
                      key={conversation.id}
                      className={`message-conversation ${active ? 'message-conversation-active' : ''}`}
                      onClick={() => openConversation(conversation)}
                    >
                      <span className="message-avatar">{initials(other?.fullName, other?.email)}</span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="message-name">{other?.fullName || 'Conversation'}</span>
                        <span className="message-preview truncate block max-w-[150px]">
                          {lastPreviewText || roleLabel(other?.role)}
                        </span>
                      </span>
                      <span className="message-meta">
                        <span>{formatTime(conversation.lastMessageAt || conversation.updatedAt)}</span>
                        {conversation.unreadCount > 0 && <b>{conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}</b>}
                      </span>
                    </button>
                  )
                })}

                {filteredContacts.length > 0 && (
                  <div className="messages-contact-block">
                    <p>Start Conversation</p>
                    {filteredContacts.map((contact) => (
                      <button
                        type="button"
                        key={contact.id}
                        className="message-conversation"
                        onClick={() => startConversation(contact)}
                      >
                        <span className="message-avatar">{initials(contact.fullName, contact.email)}</span>
                        <span className="min-w-0 flex-1 text-left">
                          <span className="message-name">{contact.fullName}</span>
                          <span className="message-preview">{contact.relationship} &middot; {roleLabel(contact.role)}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </aside>

        <main className="messages-thread">
          {activeConversation ? (
            <>
              <div className="messages-thread-head">
                <div className="message-avatar message-avatar-large">{initials(selected?.fullName, selected?.email)}</div>
                <div className="min-w-0">
                  <h2>{selected?.fullName || 'Conversation'}</h2>
                  <p>{roleLabel(selected?.role)} &middot; {selected?.email}</p>
                </div>
              </div>

              <div className="messages-thread-body custom-scrollbar">
                {threadLoading ? (
                  <p className="messages-muted">Opening conversation...</p>
                ) : messages.length === 0 ? (
                  <div className="messages-empty">
                    <h3>No messages yet</h3>
                    <p>Send the first message to start this secure workspace conversation.</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isEditing = editingMessageId === message.id
                    const parsed = parseMessageBody(message.body)
                    const canEdit = message.mine || user?.role === 'ADMIN'
                    const canDelete = message.mine || user?.role === 'ADMIN'
                    const isMenuOpen = activeMenuMessageId === message.id

                    return (
                      <div key={message.id} className={`message-bubble-row ${message.mine ? 'message-bubble-row-mine' : ''} group relative mb-2`}>
                        <div className="flex items-start gap-2 max-w-[85%] relative">
                          
                          {message.mine && !isEditing && (
                            <div className="self-center md:opacity-0 group-hover:opacity-100 transition-opacity relative">
                              <button
                                type="button"
                                onClick={(e) => handleMenuToggle(e, message.id, true)}
                                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-emerald-950/40 text-slate-400 dark:text-slate-300 transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                title="Message options"
                                aria-label="Message options"
                              >
                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="1.5" />
                                  <circle cx="12" cy="5" r="1.5" />
                                  <circle cx="12" cy="19" r="1.5" />
                                </svg>
                              </button>
                              {isMenuOpen && renderMenu(message, parsed, canEdit, canDelete)}
                            </div>
                          )}

                          {isEditing ? (
                            <div className="bg-slate-100 dark:bg-emerald-950/20 p-3 rounded-2xl border border-slate-200 dark:border-emerald-900 w-full min-w-[280px]">
                              <textarea
                                value={editBody}
                                onChange={(e) => setEditBody(e.target.value)}
                                className="w-full bg-white dark:bg-[#0D2F27] border border-slate-200 dark:border-emerald-950 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 text-ink dark:text-slate-200 resize-none h-20"
                              />
                              <div className="flex justify-end gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={handleCancelEdit}
                                  className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded bg-slate-200 dark:bg-emerald-900/30 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(message)}
                                  className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded bg-emerald-500 text-white hover:bg-emerald-600"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className={`message-bubble ${message.mine ? 'message-bubble-mine' : ''} relative`}>
                              {renderMessageContent(message)}
                              <span className="flex items-center gap-1.5 flex-wrap justify-between">
                                <span>{message.mine ? 'You' : message.senderName} &middot; {formatTime(message.createdAt)}</span>
                                {message.updatedAt && (
                                  <span className="text-[9px] opacity-75 italic font-medium ml-1 bg-white/10 px-1 rounded">edited</span>
                                )}
                              </span>
                            </div>
                          )}

                          {!message.mine && !isEditing && (
                            <div className="self-center md:opacity-0 group-hover:opacity-100 transition-opacity relative">
                              <button
                                type="button"
                                onClick={(e) => handleMenuToggle(e, message.id, false)}
                                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-emerald-950/40 text-slate-400 dark:text-slate-300 transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                title="Message options"
                                aria-label="Message options"
                              >
                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="1.5" />
                                  <circle cx="12" cy="5" r="1.5" />
                                  <circle cx="12" cy="19" r="1.5" />
                                </svg>
                              </button>
                              {isMenuOpen && renderMenu(message, parsed, canEdit, canDelete)}
                            </div>
                          )}

                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <form className="messages-compose flex flex-col gap-3 p-4 bg-slate-50/50 dark:bg-emerald-950/5 border-t border-slate-200/60 dark:border-emerald-950/40" onSubmit={sendMessage}>
                {selectedFile && (
                  <div className="flex items-center gap-3 p-3 bg-white dark:bg-[#0D2F27] border border-slate-200 dark:border-emerald-950 rounded-2xl shadow-sm animate-rise">
                    {filePreviewUrl ? (
                      <img src={filePreviewUrl} alt="Preview" className="h-10 w-10 object-cover rounded-lg border border-slate-200 dark:border-emerald-950" />
                    ) : (
                      <div className="h-10 w-10 flex items-center justify-center bg-slate-100 dark:bg-[#071F1A] rounded-lg text-slate-500 dark:text-slate-400 font-bold text-xs uppercase border border-slate-200 dark:border-emerald-950">
                        {selectedFile.name.split('.').pop() || 'doc'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button type="button" onClick={clearSelectedFile} className="text-slate-400 hover:text-rose-500 font-bold text-xl p-1 leading-none">&times;</button>
                  </div>
                )}

                {isRecording && (
                  <div className="flex items-center justify-between gap-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-950/50 rounded-2xl shadow-sm animate-pulse">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                      <span className="text-xs font-bold text-[#063F35] dark:text-emerald-300">Recording Voice Note...</span>
                    </div>
                    <span className="text-xs font-bold font-mono text-[#063F35] dark:text-emerald-300">
                      {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                    </span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={stopRecording} className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold">Stop</button>
                      <button type="button" onClick={cancelRecording} className="px-3 py-1 bg-slate-200 dark:bg-emerald-900/20 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold">Cancel</button>
                    </div>
                  </div>
                )}

                {audioPreviewUrl && (
                  <div className="flex items-center gap-3 p-3 bg-white dark:bg-[#0D2F27] border border-slate-200 dark:border-emerald-950 rounded-2xl shadow-sm animate-rise">
                    <div className="h-10 w-10 flex items-center justify-center bg-emerald-500 text-white rounded-xl text-lg shrink-0 shadow-sm">🎙️</div>
                    <audio src={audioPreviewUrl} controls className="flex-1 max-w-xs sm:max-w-md h-8" />
                    <button type="button" onClick={clearVoiceNote} className="text-slate-400 hover:text-rose-500 font-bold text-xl p-1 leading-none">&times;</button>
                  </div>
                )}

                <div className="flex items-center gap-2 w-full">
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-emerald-950 bg-white dark:bg-[#0D2F27] text-slate-500 dark:text-slate-300 transition hover:border-emerald-300 dark:hover:border-emerald-500/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-95 shadow-sm"
                      title="Attach file"
                    >
                      <svg viewBox="0 0 24 24" className="h-5.5 w-5.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                      </svg>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileChange}
                      accept="image/png, image/jpeg, image/jpg, image/webp, video/mp4, video/webm, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    />

                    <button
                      type="button"
                      onClick={openCamera}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-emerald-950 bg-white dark:bg-[#0D2F27] text-slate-500 dark:text-slate-300 transition hover:border-emerald-300 dark:hover:border-emerald-500/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-95 shadow-sm"
                      title="Capture image"
                    >
                      <svg viewBox="0 0 24 24" className="h-5.5 w-5.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border transition active:scale-95 shadow-sm ${
                        isRecording 
                          ? 'border-rose-500 bg-rose-500 text-white animate-pulse' 
                          : 'border-slate-200 dark:border-emerald-950 bg-white dark:bg-[#0D2F27] text-slate-500 dark:text-slate-300 hover:border-emerald-300 dark:hover:border-emerald-500/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 dark:hover:text-emerald-400'
                      }`}
                      title="Record Voice Note"
                    >
                      <svg viewBox="0 0 24 24" className="h-5.5 w-5.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
                      </svg>
                    </button>
                  </div>

                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder="Write a message..."
                    className="flex-1 bg-white dark:bg-[#0D2F27] border border-slate-200 dark:border-emerald-950 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 text-ink dark:text-slate-200 resize-none h-10 leading-tight"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage(e)
                      }
                    }}
                  />
                  <Button disabled={sending || (!body.trim() && !selectedFile && !recordedAudioBlob)} className="shrink-0 h-10 px-5 font-black uppercase text-xs tracking-wider">
                    {sending ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="messages-empty messages-empty-center">
              <div className="message-avatar message-avatar-large">{initials(user?.fullName, user?.email)}</div>
              <h2>Select a conversation</h2>
              <p>Choose an existing thread or start a permitted role-based conversation.</p>
            </div>
          )}
        </main>
      </section>

      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0D2F27] border border-slate-200 dark:border-emerald-950 rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-rise">
            <h3 className="text-lg font-bold text-ink dark:text-slate-100 mb-4 font-display">Capture Photo</h3>
            <div className="relative aspect-video w-full rounded-2xl bg-black overflow-hidden border border-slate-200 dark:border-emerald-950">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="secondary" onClick={closeCamera} className="font-bold text-xs uppercase tracking-wider">Cancel</Button>
              <Button onClick={capturePhoto} className="font-bold text-xs uppercase tracking-wider">Take Photo</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
