
import './App.css'
import { io } from "socket.io-client";
import { useEffect, useMemo, useRef, useState } from "react";

const QUICK_EMOJIS = ["😀", "😂", "😍", "👍", "🔥", "🎉", "❤️", "🙏"];

function App() {
  const [username, setUsername] = useState("");
  const [draftUsername, setDraftUsername] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [messageText, setMessageText] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const usernameRef = useRef("");
  const selectedUserRef = useRef("");
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    const socket = io("https://chatappbackend-1-62nc.onrender.com/");
    socketRef.current = socket;

    socket.on("onlineUsers", (users) => {
      setOnlineUsers(users);
    });

    socket.on("newMessage", (message) => {
      setUnreadCounts((prev) => {
        if (
          message.to !== usernameRef.current ||
          message.from === usernameRef.current ||
          message.from === selectedUserRef.current
        ) {
          return prev;
        }

        return {
          ...prev,
          [message.from]: (prev[message.from] || 0) + 1,
        };
      });
      setMessages((prev) => [...prev, message]);
    });

    socket.on("typing", (payload) => {
      setTypingUsers((prev) => {
        const user = payload?.from;
        if (!user) {
          return prev;
        }

        return {
          ...prev,
          [user]: Boolean(payload?.isTyping),
        };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedUser]);

  const availableUsers = useMemo(
    () => onlineUsers.filter((user) => user !== username),
    [onlineUsers, username]
  );

  const selectUser = (user) => {
    if (selectedUser && selectedUser !== user) {
      emitTyping(false, selectedUser);
    }
    setSelectedUser(user);
    setUnreadCounts((prev) => {
      if (!prev[user]) {
        return prev;
      }

      const next = { ...prev };
      delete next[user];
      return next;
    });
  };

  const conversation = useMemo(
    () =>
      messages.filter((msg) => {
        if (!selectedUser || !username) {
          return false;
        }
        return (
          (msg.from === username && msg.to === selectedUser) ||
          (msg.from === selectedUser && msg.to === username)
        );
      }),
    [messages, selectedUser, username]
  );

  const joinChat = (event) => {
    event.preventDefault();
    const safeName = draftUsername.trim().slice(0, 24);
    if (!safeName || !socketRef.current) {
      return;
    }

    setUsername(safeName);
    socketRef.current.emit("join", safeName);
  };

  const sendMessage = (event) => {
    event.preventDefault();
    if (!messageText.trim() || !selectedUser || !socketRef.current) {
      return;
    }

    socketRef.current.emit("sendMessage", {
      to: selectedUser,
      text: messageText,
    });
    socketRef.current.emit("typing", { to: selectedUser, isTyping: false });
    setMessageText("");
    setShowEmojiPicker(false);
  };

  const emitTyping = (isTyping, toUser = selectedUser) => {
    if (!socketRef.current || !toUser) {
      return;
    }
    socketRef.current.emit("typing", { to: toUser, isTyping });
  };

  const handleMessageChange = (event) => {
    const nextText = event.target.value;
    setMessageText(nextText);

    if (!selectedUser) {
      return;
    }

    emitTyping(nextText.trim().length > 0);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(false);
    }, 1200);
  };

  const appendEmoji = (emoji) => {
    setMessageText((prev) => `${prev}${emoji}`.slice(0, 500));
    emitTyping(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(false);
    }, 1200);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  if (!username) {
    return (
      <main className="join-wrapper">
        <form className="join-card" onSubmit={joinChat}>
          <h1>Quick Chat</h1>
          

          <p>Enter your name to start chatting instantly.</p>
         
          <input
            type="text"
            value={draftUsername}
            onChange={(e) => setDraftUsername(e.target.value)}
            placeholder="Your username"
            maxLength={24}
            required
          />
          <button type="submit">Join Chat</button>
        </form>
      </main>
    );
  }

  return (
    <main className="chat-layout">
      <aside className="users-panel">
<div className='profile'>
  <img className='image' src="https://www.pngmart.com/files/23/Profile-PNG-Photo.png" alt="" />
  <div>
         <p className='name'> {username}</p>
         <p className='name'>My Account</p>
         </div>
</div>
<hr />

        <h2>Online</h2>
        <ul>
          {availableUsers.length === 0 && (
            <li className="muted">No other users online</li>
          )}
          {availableUsers.map((user) => (
            <li key={user}>
              <button
                type="button"
                className={selectedUser === user ? "active" : ""}
                onClick={() => selectUser(user)}
              >
                <span className="dot" />
                <span className="user-name">{user}</span>
                {unreadCounts[user] > 0 && (
                  <span className="unread-badge">{unreadCounts[user]}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="chat-panel">
        <header>
          <h2>{selectedUser ? `Chat with ${selectedUser}` : "Select a friend"}</h2>
         
          {selectedUser && typingUsers[selectedUser] && (
            <small className="typing-indicator">{selectedUser} is typing...</small>
          )}
        </header>

        <div className="messages">
          {!selectedUser && <p className="muted">Choose a friend to begin chatting.</p>}
          {selectedUser && conversation.length === 0 && (
            <p className="muted">No messages yet. Say hello!</p>
          )}

          {conversation.map((msg) => (
            <div
              key={msg.id}
              className={`message-bubble ${msg.from === username ? "mine" : "theirs"}`}
            >
              <p>{msg.text}</p>
              <small>{new Date(msg.timestamp).toLocaleTimeString()}</small>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form className="message-form" onSubmit={sendMessage}>
          <button
            type="button"
            className="emoji-toggle"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            disabled={!selectedUser}
            aria-label="Toggle emoji picker"
          >
            🙂
          </button>
          <input
            type="text"
            value={messageText}
            onChange={handleMessageChange}
            placeholder={selectedUser ? "Type a message..." : "Select a user first"}
            disabled={!selectedUser}
            maxLength={500}
            required
          />
          <button type="submit" disabled={!selectedUser}>
            Send
          </button>
        </form>
        {showEmojiPicker && selectedUser && (
          <div className="emoji-picker">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="emoji-item"
                onClick={() => appendEmoji(emoji)}
                aria-label={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default App
