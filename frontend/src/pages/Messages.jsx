import React, { useEffect, useMemo, useState } from 'react'
import Button from '../components/Button'
import { api } from '../api/http'
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

export default function Messages() {
  const { user } = useAuth()
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

  const loadInbox = async (silent = false) => {
    if (!user) {
      setLoading(false)
      setError('Your session is not ready. Please sign in again if this message remains visible.')
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

  const sendMessage = async (event) => {
    event.preventDefault()
    if (!activeConversation || !body.trim() || sending) return
    setSending(true)
    setError('')
    try {
      const sent = await api.post(`/api/messages/conversations/${activeConversation.id}/messages`, { body })
      setMessages((current) => [...current, sent])
      setBody('')
      await loadInbox(true)
    } catch (err) {
      setError(err.message || 'Unable to send message.')
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadInbox()
    } else {
      setLoading(false)
    }
  }, [user?.id])

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
                        <span className="message-preview">{conversation.lastMessage?.body || roleLabel(other?.role)}</span>
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
                  messages.map((message) => (
                    <div key={message.id} className={`message-bubble-row ${message.mine ? 'message-bubble-row-mine' : ''}`}>
                      <div className={`message-bubble ${message.mine ? 'message-bubble-mine' : ''}`}>
                        <p>{message.body}</p>
                        <span>{message.mine ? 'You' : message.senderName} &middot; {formatTime(message.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form className="messages-compose" onSubmit={sendMessage}>
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Write a message..."
                  rows={2}
                />
                <Button disabled={sending || !body.trim()} className="shrink-0">
                  {sending ? 'Sending...' : 'Send'}
                </Button>
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
    </div>
  )
}
