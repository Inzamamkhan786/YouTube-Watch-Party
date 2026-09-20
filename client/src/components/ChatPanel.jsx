import { useEffect, useRef, useState } from 'react'
import Button from './ui/Button'

function formatTimestamp(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

const SCROLL_THRESHOLD = 120

export default function ChatPanel({
  socket,
  roomId,
  currentUserId,
  canDelete,
  connected,
}) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showNewMessagesIndicator, setShowNewMessagesIndicator] = useState(false)
  const scrollRef = useRef(null)
  const shouldScrollToBottomRef = useRef(true)

  const isNearBottom = () => {
    const container = scrollRef.current
    if (!container) return true
    return container.scrollHeight - container.scrollTop - container.clientHeight <= SCROLL_THRESHOLD
  }

  const scrollToBottom = () => {
    const container = scrollRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
    setShowNewMessagesIndicator(false)
  }

  useEffect(() => {
    if (!socket) return

    setLoading(true)
    const appendMessage = (message) => {
      if (message.roomId !== roomId) return
      setMessages((currentMessages) =>
        currentMessages.some((current) => current.id === message.id)
          ? currentMessages
          : [...currentMessages, message]
      )
    }
    const loadHistory = () => {
      setLoading(true)
      socket.emit('get_recent_messages', { roomId }, (response) => {
        if (!response.ok) {
          setError(response.error ?? 'Unable to load chat history.')
          setLoading(false)
        }
      })
    }
    const handleHistory = (payload) => {
      if (payload.roomId !== roomId) return
      setMessages((currentMessages) => {
        const messagesById = new Map(
          [...currentMessages, ...payload.messages].map((message) => [message.id, message])
        )
        return [...messagesById.values()].sort(
          (left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt)
        )
      })
      setLoading(false)
      setError(null)
    }
    const handleDeleted = (payload) => {
      if (payload.roomId !== roomId) return
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== payload.messageId)
      )
    }
    const handleSocketError = ({ event, message }) => {
      if (event === 'get_recent_messages' || event === 'send_message' || event === 'delete_message') {
        setError(message)
        setLoading(false)
      }
    }

    socket.on('new_message', appendMessage)
    socket.on('recent_messages', handleHistory)
    socket.on('message_deleted', handleDeleted)
    socket.on('socket_error', handleSocketError)
    socket.on('connect', loadHistory)
    if (socket.connected) {
      loadHistory()
    }

    return () => {
      socket.off('new_message', appendMessage)
      socket.off('recent_messages', handleHistory)
      socket.off('message_deleted', handleDeleted)
      socket.off('socket_error', handleSocketError)
      socket.off('connect', loadHistory)
    }
  }, [roomId, socket])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const handleScroll = () => {
      if (isNearBottom()) {
        setShowNewMessagesIndicator(false)
        return
      }

      if (messages.length > 0 && !loading) {
        setShowNewMessagesIndicator(true)
      }
    }

    container.addEventListener('scroll', handleScroll)
    handleScroll()

    return () => container.removeEventListener('scroll', handleScroll)
  }, [messages.length, loading])

  useEffect(() => {
    if (!scrollRef.current) return

    if (shouldScrollToBottomRef.current || isNearBottom()) {
      scrollToBottom()
    } else {
      setShowNewMessagesIndicator(true)
    }

    shouldScrollToBottomRef.current = false
  }, [messages, loading])

  function sendMessage() {
    const message = input.trim()
    if (!message || !socket || !connected) return
    shouldScrollToBottomRef.current = true
    socket.emit('send_message', { roomId, message }, (response) => {
      if (!response.ok) setError(response.error ?? 'Unable to send message.')
    })
    setInput('')
  }

  function handleInputKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  function deleteMessage(messageId) {
    if (!socket || !connected) return
    socket.emit('delete_message', { roomId, messageId }, (response) => {
      if (!response.ok) setError(response.error ?? 'Unable to delete message.')
    })
  }

  return (
    <section className="card flex h-full min-h-0 flex-col overflow-hidden" aria-label="Room chat">
      <div className="card-header shrink-0 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-black)' }}>
            Room chat
          </h2>
          <p className="mt-1 text-[11px]" style={{ color: 'var(--color-black)', opacity: 0.55 }}>
            {connected ? 'Live conversation' : 'Reconnecting to chat...'}
          </p>
        </div>
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: connected ? 'var(--color-blue)' : 'var(--color-primary)' }}
          aria-label={connected ? 'Chat connected' : 'Chat reconnecting'}
        />
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div ref={scrollRef} className="h-full min-h-0 space-y-3 overflow-y-auto p-4 overscroll-contain">
          {loading ? (
            <div className="flex min-h-32 items-center justify-center text-xs" style={{ color: 'var(--color-black)', opacity: 0.55 }}>
              Loading chat history...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex min-h-32 items-center justify-center text-center text-xs" style={{ color: 'var(--color-black)', opacity: 0.55 }}>
              No messages yet. Start the conversation.
            </div>
          ) : (
            messages.map((message) => {
              const isCurrentUser = message.userId === currentUserId
              return (
                <div key={message.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[85%] rounded-lg px-3 py-2"
                    style={{
                      backgroundColor: isCurrentUser ? 'var(--color-primary-soft)' : 'var(--color-muted)',
                      color: 'var(--color-black)',
                    }}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-[11px] font-semibold">
                        {isCurrentUser ? 'You' : `@${message.username}`}
                      </span>
                      <span className="text-[10px] opacity-50">{formatTimestamp(message.createdAt)}</span>
                    </div>
                    <p className="break-words text-sm">{message.message}</p>
                    {canDelete && (
                      <button
                        type="button"
                        className="mt-1 text-[10px] underline opacity-60 hover:opacity-100"
                        onClick={() => deleteMessage(message.id)}
                        disabled={!connected}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {showNewMessagesIndicator && (
          <button
            type="button"
            onClick={() => {
              shouldScrollToBottomRef.current = true
              scrollToBottom()
            }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border px-3 py-1.5 text-[11px] font-semibold shadow-sm"
            style={{
              backgroundColor: 'var(--color-black)',
              borderColor: 'var(--color-black)',
              color: 'var(--color-white)',
            }}
          >
            New messages
          </button>
        )}
      </div>

      {error && (
        <p className="border-t px-4 py-2 text-xs" style={{ borderColor: 'var(--color-muted)', color: 'var(--color-primary)' }} role="status">
          {error}
        </p>
      )}

      <form
        className="shrink-0 flex gap-2 border-t p-3"
        style={{ borderColor: 'var(--color-muted)' }}
        onSubmit={(event) => {
          event.preventDefault()
          sendMessage()
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder={connected ? 'Write a message...' : 'Reconnecting...'}
          disabled={!connected}
          maxLength={2000}
          aria-label="Chat message"
          className="min-w-0 flex-1 rounded border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--color-muted)' }}
        />
        <Button type="submit" size="sm" disabled={!connected || !input.trim()}>
          Send
        </Button>
      </form>
    </section>
  )
}
