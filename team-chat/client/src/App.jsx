
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import EmojiPicker, {
  Theme,
  EmojiStyle,
  SuggestionMode,
} from "emoji-picker-react";
import "./App.css";

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

const USER_LIST = ["Alan", "Bob", "Carol", "Dean", "Elin"];

const avatarColors = [
  "#e77e83",
  "#c9dc65",
  "#e58b8e",
  "#8b9de0",
  "#e6a16c",
];

const randomUser = () =>
  USER_LIST[Math.floor(Math.random() * USER_LIST.length)];

function getAvatarColor(user) {
  const index = USER_LIST.indexOf(user);
  return avatarColors[index >= 0 ? index : 0];
}

function formatTime(message) {
  const value =
    message.timestamp ||
    message.createdAt ||
    message.displayTime;

  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function renderText(text) {
  return String(text || "")
    .split(/(@\w+)/g)
    .map((part, index) =>
      /^@\w+$/.test(part) ? (
        <span key={index} className="mention">
          {part}
        </span>
      ) : (
        part
      )
    );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [connected, setConnected] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  const socketRef = useRef(null);
  const threadRef = useRef(null);
  const inputRef = useRef(null);
  const emojiRef = useRef(null);
  const emojiButtonRef = useRef(null);

  // Socket.IO connection
  useEffect(() => {
    const socket = io(SERVER_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    // Load previous messages
    socket.on("history", (history) => {
      if (!Array.isArray(history)) return;

      setMessages(
        history.map((message) => ({
          ...message,
          displayTime:
            message.timestamp ||
            message.createdAt ||
            new Date().toISOString(),
        }))
      );
    });

    // Receive new messages
    socket.on("message", (message) => {
      setMessages((previous) => [
        ...previous,
        {
          ...message,
          displayTime:
            message.timestamp ||
            message.createdAt ||
            new Date().toISOString(),
        },
      ]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Automatically scroll to latest message
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop =
        threadRef.current.scrollHeight;
    }
  }, [messages]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        emojiRef.current &&
        !emojiRef.current.contains(event.target) &&
        !emojiButtonRef.current?.contains(event.target)
      ) {
        setShowEmoji(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setShowEmoji(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // @mention suggestions
  const mentionMatch = text.match(/@(\w*)$/);

  const mentionOptions = mentionMatch
    ? USER_LIST.filter((user) =>
      user.toLowerCase().startsWith(
        mentionMatch[1].toLowerCase()
      )
    )
    : [];

  // Insert selected mention
  const pickMention = (user) => {
    setText((previous) =>
      previous.replace(/@(\w*)$/, `@${user} `)
    );

    inputRef.current?.focus();
  };

  // Insert selected emoji
  const addEmoji = (emojiData) => {
    setText((previous) => previous + emojiData.emoji);
    inputRef.current?.focus();
  };

  // Send message
  const send = (event) => {
    event.preventDefault();

    const messageText = text.trim();

    if (!messageText || !connected) return;

    socketRef.current?.emit("message", {
      user: randomUser(),
      text: messageText,
    });

    setText("");
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  return (
    <main className="chat">

      {/* Header */}
      <header className="chat-header">
        <div>
          <h1>Introductions</h1>
          <p>This Channel Is For Company Wide Chatter</p>
        </div>

        <div className="header-right">
          <span
            className={`dot ${connected ? "on" : "off"}`}
          />

          <span className="connection-text">
            {connected ? "Connected" : "Connecting..."}
          </span>

          <span className="member-count">5 | 100</span>
          <span className="members-icon">♧</span>
        </div>
      </header>

      {/* Message Thread */}
      <ul className="thread" ref={threadRef}>
        {messages.length === 0 && (
          <li className="empty">
            Welcome to Team Chat! 👋
            <p>Send a message to start interacting.</p>
          </li>
        )}

        {messages.map((message, index) => (
          <li
            key={message.id ?? `${message.user}-${index}`}
            className="message"
          >
            <span
              className="avatar"
              style={{
                backgroundColor: getAvatarColor(message.user),
              }}
            >
              {message.user?.[0] || "?"}
            </span>

            <div className="message-content">
              <div className="message-heading">
                <strong>{message.user}</strong>

                <span className="timestamp">
                  {formatTime(message)}
                </span>
              </div>

              <div className="message-bubble">
                {renderText(message.text)}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Message Composer */}
      <form className="composer" onSubmit={send}>

        {/* Mention Suggestions */}
        {mentionOptions.length > 0 && (
          <ul className="popup mentions">
            {mentionOptions.map((user) => (
              <li key={user}>
                <button
                  type="button"
                  onClick={() => pickMention(user)}
                >
                  @{user}
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Emoji Picker */}
        {showEmoji && (
          <div
            className="emoji-picker-container"
            ref={emojiRef}
          >
            <EmojiPicker
              onEmojiClick={addEmoji}
              theme={Theme.DARK}
              emojiStyle={EmojiStyle.NATIVE}
              suggestedEmojisMode={SuggestionMode.FREQUENT}
              width="100%"
              height={430}
              searchDisabled={false}
              searchPlaceHolder="Search emojis..."
              skinTonesDisabled={false}
              previewConfig={{
                showPreview: false,
              }}
              lazyLoadEmojis={false}
            />
          </div>
        )}

        <div className="input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Type Message"
            maxLength={500}
            disabled={!connected}
            aria-label="Message"
          />

          {/* Emoji Button */}
          <button
            ref={emojiButtonRef}
            type="button"
            className={`emoji-button ${showEmoji ? "active" : ""}`}
            onClick={() =>
              setShowEmoji((previous) => !previous)
            }
            aria-label="Open emoji picker"
            aria-expanded={showEmoji}
            disabled={!connected}
          >
            ☺
          </button>

          {/* Send Button */}
          <button
            type="submit"
            className="send"
            disabled={!connected || !text.trim()}
          >
            Send
          </button>
        </div>
      </form>
    </main>
  );
}
