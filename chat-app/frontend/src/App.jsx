import { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import ChatInput from './components/ChatInput';
import './index.css';

const STORAGE_KEY = 'claw_chats';
const HISTORY_KEY = 'claw_history';
const API_URL = (import.meta.env.VITE_API_URL || 'https://claww-ai-2.onrender.com').trim();

const SYSTEM_PROMPTS = [
  { id: 'default', name: 'Default', prompt: 'You are a helpful AI assistant.' },
  { id: 'coder', name: 'Coding Expert', prompt: 'You are an expert programmer. You help with code, debug errors, and explain programming concepts clearly.' },
  { id: 'writer', name: 'Creative Writer', prompt: 'You are a creative writing assistant.' },
  { id: 'analyst', name: 'Data Analyst', prompt: 'You are a data analysis expert.' },
  { id: 'teacher', name: 'Teacher', prompt: 'You are a patient teacher.' },
];

function App() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [error, setError] = useState(null);
  const [pdfContext, setPdfContext] = useState(null);

  const [systemPrompt, setSystemPrompt] = useState(() => {
    return localStorage.getItem('claw_system_prompt') || 'default';
  });

  const [chatHistory, setChatHistory] = useState(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Session ID
  const [sessionId, setSessionId] = useState(() => {
    const saved = localStorage.getItem('claw_current_session');
    if (saved) return saved;

    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const recent = chatHistory[0]?.id;

    return recent && parsed[recent]
      ? recent
      : Math.random().toString(36).substring(2, 15);
  });

  const messageIdRef = useRef(0);

  // Save to localStorage
  useEffect(() => {
    // Remove isStreaming flag before saving
    const cleanMessages = {};
    Object.keys(messages).forEach(key => {
      cleanMessages[key] = messages[key].map(msg => ({
        ...msg,
        isStreaming: false
      }));
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanMessages));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(chatHistory));
    localStorage.setItem('claw_current_session', sessionId);
    localStorage.setItem('claw_system_prompt', systemPrompt);
  }, [messages, chatHistory, sessionId, systemPrompt]);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));

    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Restore message IDs
  useEffect(() => {
    const savedMessages = messages[sessionId] || [];

    if (savedMessages.length > 0) {
      messageIdRef.current = Math.max(...savedMessages.map(m => m.id || 0));
    } else {
      messageIdRef.current = 0;
    }
  }, [sessionId, messages]);

  const currentMessages = messages[sessionId] || [];

  const handleSendMessage = async (message, fileContext = null, isImageMode = false, isSearchMode = false, isCodeMode = false) => {
    let contextParts = [];
    if (fileContext) contextParts.push(fileContext);
    if (pdfContext) {
      const truncatedPdf = pdfContext.length > 10000 
        ? pdfContext.substring(0, 10000) + '\n\n[Document truncated due to length...]'
        : pdfContext;
      contextParts.push(`Document Content:\n${truncatedPdf}`);
    }
    
    const outboundMessage = contextParts.length > 0
      ? `Message: ${message}\n\n${contextParts.join('\n\n')}`
      : message;

    const userMessage = {
      id: ++messageIdRef.current,
      text: message,
      sender: 'user'
    };

    setMessages(prev => ({
      ...prev,
      [sessionId]: [...(prev[sessionId] || []), userMessage]
    }));

    // Create placeholder for AI message
    const aiMessageId = ++messageIdRef.current;
    setMessages(prev => ({
      ...prev,
      [sessionId]: [
        ...(prev[sessionId] || []),
        {
          id: aiMessageId,
          text: isImageMode ? 'Claw AI is imagining your request...' : '',
          sender: 'ai',
          isStreaming: true
        }
      ]
    }));

    if (isImageMode) {
      setIsGeneratingImage(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      if (isImageMode) {
        if (!message.trim()) {
          throw new Error('Image prompt required');
        }

        console.log('Sending Prompt:', message.trim());
        console.log('Attempting to fetch from:', API_URL + '/api/generate-image');

        const response = await fetch(`${API_URL}/api/generate-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: message.trim() }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('HTTP error response:', response.status, errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const imageUrl = typeof data.image === 'string' ? data.image.trim() : '';

        if (!imageUrl) {
          throw new Error('Image URL missing from API response');
        }

        console.log('Image URL received from backend:', imageUrl);

        console.log('Setting message text (raw):', JSON.stringify(imageUrl));

        setMessages(prev => ({
          ...prev,
          [sessionId]: prev[sessionId].map(msg =>
            msg.id === aiMessageId ? { ...msg, text: imageUrl, isStreaming: false } : msg
          )
        }));

        setChatHistory(prev => [
          ...prev.filter(chat => chat.id !== sessionId),
          {
            id: sessionId,
            title: message.slice(0, 30),
            timestamp: Date.now()
          }
        ]);

        return;
      }

      const sanitizedHistory = currentMessages.map(msg => ({
        ...msg,
        text: msg.text?.startsWith('data:image') ? '[AI Generated Image]' : msg.text
      }));

      const response = await fetch(`${API_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: outboundMessage,
          sessionId,
          history: sanitizedHistory,
          systemPrompt:
            SYSTEM_PROMPTS.find(p => p.id === systemPrompt)?.prompt ||
            SYSTEM_PROMPTS[0].prompt,
          isSearchMode,
          isCodeMode
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.done) {
                // Update chat history with first message
                setChatHistory(prev => [
                  ...prev.filter(chat => chat.id !== sessionId),
                  {
                    id: sessionId,
                    title: message.slice(0, 30),
                    timestamp: Date.now()
                  }
                ]);
                // Mark message as complete
                setMessages(prev => ({
                  ...prev,
                  [sessionId]: prev[sessionId].map(msg => 
                    msg.id === aiMessageId ? { ...msg, isStreaming: false } : msg
                  )
                }));
                break;
              }
              if (parsed.content) {
                fullContent += parsed.content;
                setMessages(prev => ({
                  ...prev,
                  [sessionId]: prev[sessionId].map(msg => 
                    msg.id === aiMessageId ? { ...msg, text: fullContent } : msg
                  )
                }));
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

    } catch (err) {
      const errorMessage = err.message || 'Failed to get response';
      setError(errorMessage);
      console.error('API error:', err);
      // Remove placeholder message on error
      setMessages(prev => ({
        ...prev,
        [sessionId]: prev[sessionId].filter(msg => msg.id !== aiMessageId)
      }));
    } finally {
      setIsLoading(false);
      setIsGeneratingImage(false);
    }
  };

  const handlePdfProcessed = (pdfData) => {
    if (pdfData.preview) {
      const previewMessage = {
        id: ++messageIdRef.current,
        text: `📄 **${pdfData.fileName}**\n\nDocument loaded. You can now ask questions about it.`,
        sender: 'ai',
        isStreaming: false,
        image: pdfData.preview
      };
      setMessages(prev => ({
        ...prev,
        [sessionId]: [...(prev[sessionId] || []), previewMessage]
      }));
    }
    setPdfContext(pdfData.text);
  };

  const handleNewChat = () => {
    setSessionId(Math.random().toString(36).substring(2, 15));
    setError(null);
  };

  const handleDeleteChat = (chatId) => {
    setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
    const newMessages = { ...messages };
    delete newMessages[chatId];
    setMessages(newMessages);
    if (sessionId === chatId) {
      handleNewChat();
    }
  };

  const handleRenameChat = (chatId, newTitle) => {
    setChatHistory(prev => 
      prev.map(chat => 
        chat.id === chatId ? { ...chat, title: newTitle } : chat
      )
    );
  };

  return (
    <div className={`min-h-screen flex ${darkMode ? 'dark' : ''}`}>
      <div className="w-64 hidden md:flex">
        <Sidebar
          sessionId={sessionId}
          chatHistory={chatHistory}
          onNewChat={handleNewChat}
          onSelectChat={(id) => setSessionId(id)}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
          darkMode={darkMode}
        />
      </div>

      <div className="flex-1 flex flex-col">
        <ChatArea
          messages={currentMessages}
          isLoading={isLoading || isGeneratingImage}
          darkMode={darkMode}
        />

        <ChatInput
          isLoading={isLoading || isGeneratingImage}
          onSendMessage={handleSendMessage}
          onFileProcessed={handlePdfProcessed}
          darkMode={darkMode}
        />

        {error && (
          <div className="text-red-500 p-2 text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
