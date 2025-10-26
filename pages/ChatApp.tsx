import { db, auth } from '../lib/firebase';
import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, Timestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

interface Message {
  id: string;
  username: string;
  text: string;
  timestamp: Timestamp;
}

interface User {
  uid: string;
  email: string;
  displayName: string;
}

export default function ChatApp() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [authPage, setAuthPage] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Check if user is logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setAuthUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || firebaseUser.email || 'User'
        });
        setError('');
      } else {
        setAuthUser(null);
      }
    });
    return unsubscribe;
  }, []);

  // Get messages from Firebase
  useEffect(() => {
    if (!authUser) return;

    const q = query(collection(db, 'messages'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));
      setMessages(msgs.sort((a, b) => a.timestamp?.toDate?.().getTime() - b.timestamp?.toDate?.().getTime()));
    });
    return unsubscribe;
  }, [authUser]);

  // SIGN UP
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await userCredential.user.getIdToken();
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setAuthPage('login');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else {
        setError(err.message);
      }
    }
    setLoading(false);
  };

  // LOGIN
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else {
        setError(err.message);
      }
    }
    setLoading(false);
  };

  // LOGOUT
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMessages([]);
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  // SEND MESSAGE
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !authUser) return;

    try {
      await addDoc(collection(db, 'messages'), {
        username: authUser.displayName,
        text: newMessage,
        timestamp: Timestamp.now(),
        userId: authUser.uid
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // NOT LOGGED IN - SHOW AUTH PAGE
  if (!authUser) {
    return (
      <div style={styles.authContainer}>
        <div style={styles.authBox}>
          <div style={styles.authHeader}>
            <h1 style={styles.authTitle}>Global Chat</h1>
            <p style={styles.authSubtitle}>Connect with people worldwide</p>
          </div>

          {authPage === 'login' ? (
            <form onSubmit={handleLogin} style={styles.authForm}>
              <h2 style={styles.formTitle}>Sign In</h2>

              <div style={styles.formGroup}>
                <label style={styles.label}>Email or Gmail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  style={styles.input}
                  disabled={loading}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={styles.input}
                  disabled={loading}
                />
              </div>

              {error && <p style={styles.errorText}>{error}</p>}

              <button type="submit" style={styles.primaryButton} disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              <p style={styles.switchText}>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthPage('signup');
                    setError('');
                    setEmail('');
                    setPassword('');
                  }}
                  style={styles.switchLink}
                >
                  Sign Up
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSignUp} style={styles.authForm}>
              <h2 style={styles.formTitle}>Sign Up</h2>

              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  style={styles.input}
                  disabled={loading}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  style={styles.input}
                  disabled={loading}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  style={styles.input}
                  disabled={loading}
                />
              </div>

              {error && <p style={styles.errorText}>{error}</p>}

              <button type="submit" style={styles.primaryButton} disabled={loading}>
                {loading ? 'Creating account...' : 'Sign Up'}
              </button>

              <p style={styles.switchText}>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthPage('login');
                    setError('');
                    setEmail('');
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  style={styles.switchLink}
                >
                  Sign In
                </button>
              </p>
            </form>
          )}

          <p style={styles.disclaimer}>
            Your data is secure and encrypted. We'll never sell your information.
          </p>
        </div>
      </div>
    );
  }

  // LOGGED IN - SHOW CHAT
  return (
    <div style={styles.chatContainer}>
      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.headerTitle}>Global Chat</h1>
            <p style={styles.headerSubtitle}>Signed in as {authUser.email}</p>
          </div>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Sign Out
          </button>
        </div>
      </div>

      {/* MESSAGES */}
      <div style={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyStateText}>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                ...styles.messageWrapper,
                justifyContent: msg.username === authUser.displayName ? 'flex-end' : 'flex-start'
              }}
            >
              <div
                style={{
                  ...styles.messageBubble,
                  ...(msg.username === authUser.displayName
                    ? styles.messageBubbleOwn
                    : styles.messageBubbleOther)
                }}
              >
                {msg.username !== authUser.displayName && (
                  <p style={styles.senderName}>{msg.username}</p>
                )}
                <p style={styles.messageText}>{msg.text}</p>
                <p style={styles.timestamp}>
                  {msg.timestamp?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* INPUT */}
      <form onSubmit={handleSendMessage} style={styles.inputContainer}>
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          style={styles.messageInput}
        />
        <button type="submit" style={styles.sendButton}>
          Send
        </button>
      </form>
    </div>
  );
}

// STYLES
const styles: { [key: string]: React.CSSProperties } = {
  authContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", sans-serif',
    padding: '16px',
  },
  authBox: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    width: '100%',
    maxWidth: '420px',
    padding: '48px 40px',
  },
  authHeader: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  authTitle: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#202124',
    margin: '0 0 8px 0',
    letterSpacing: '-0.5px',
  },
  authSubtitle: {
    fontSize: '14px',
    color: '#5f6368',
    margin: 0,
  },
  authForm: {
    display: 'flex',
    flexDirection: 'column',
  },
  formTitle: {
    fontSize: '24px',
    fontWeight: '500',
    color: '#202124',
    margin: '0 0 24px 0',
  },
  formGroup: {
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#202124',
    marginBottom: '8px',
  },
  input: {
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid #dadce0',
    borderRadius: '8px',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    outline: 'none',
  },
  errorText: {
    color: '#d33b27',
    fontSize: '13px',
    marginBottom: '12px',
    margin: '0 0 12px 0',
  },
  primaryButton: {
    padding: '12px 16px',
    fontSize: '15px',
    fontWeight: '500',
    background: '#1f2937',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '16px',
    transition: 'background-color 0.2s',
  },
  switchText: {
    fontSize: '14px',
    color: '#5f6368',
    textAlign: 'center',
    margin: 0,
  },
  switchLink: {
    background: 'none',
    border: 'none',
    color: '#1967d2',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    textDecoration: 'none',
  },
  disclaimer: {
    fontSize: '12px',
    color: '#9aa0a6',
    textAlign: 'center',
    marginTop: '32px',
    margin: '32px 0 0 0',
  },
  chatContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#f8f9fa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
  },
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '20px 16px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  headerContent: {
    maxWidth: '1024px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: '600',
    margin: 0,
  },
  headerSubtitle: {
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.9)',
    margin: '4px 0 0 0',
  },
  logoutButton: {
    background: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 16px',
    maxWidth: '1024px',
    margin: '0 auto',
    width: '100%',
  },
  emptyState: {
    textAlign: 'center',
    color: '#9ca3af',
    marginTop: '48px',
  },
  emptyStateText: {
    fontSize: '16px',
    color: '#9ca3af',
  },
  messageWrapper: {
    display: 'flex',
    marginBottom: '12px',
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '55%',
    padding: '12px 16px',
    borderRadius: '12px',
    wordWrap: 'break-word',
  },
  messageBubbleOwn: {
    background: '#667eea',
    color: 'white',
  },
  messageBubbleOther: {
    background: 'white',
    color: '#202124',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
  },
  senderName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#5f6368',
    margin: '0 0 4px 0',
  },
  messageText: {
    margin: 0,
    fontSize: '15px',
    lineHeight: '1.4',
  },
  timestamp: {
    fontSize: '12px',
    margin: '6px 0 0 0',
    opacity: 0.7,
  },
  inputContainer: {
    background: 'white',
    borderTop: '1px solid #dadce0',
    padding: '16px',
    display: 'flex',
    gap: '8px',
    maxWidth: '1024px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  messageInput: {
    flex: 1,
    padding: '12px 16px',
    border: '1px solid #dadce0',
    borderRadius: '24px',
    fontSize: '15px',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  sendButton: {
    background: '#667eea',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '24px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    transition: 'background-color 0.2s',
  },
};