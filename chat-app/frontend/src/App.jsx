import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import ChatInput from './components/ChatInput';
import { LargePreviewableCodeBlock } from './components/MessageBubble';
import mermaid from 'mermaid';
import './index.css';

try { mermaid.initialize?.({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' }) } catch(e) {}

const STORAGE_KEY = 'claw_chats';
const HISTORY_KEY = 'claw_history';
const API_URL = (import.meta.env.VITE_API_URL || 'https://claww-ai-3.onrender.com').trim();

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

  const [activeCanvas, setActiveCanvas] = useState(null);
  const [autoOpenCanvas, setAutoOpenCanvas] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentAgentStep, setCurrentAgentStep] = useState(null);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isHandsFree, setIsHandsFree] = useState(false);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Session ID
  const [sessionId, setSessionId] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSession = urlParams.get('session');
    if (urlSession) return urlSession;

    const saved = localStorage.getItem('claw_current_session');
    if (saved) return saved;

    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const recent = chatHistory[0]?.id;

    return recent && parsed[recent]
      ? recent
      : Math.random().toString(36).substring(2, 15);
  });

  // Update URL when session changes
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('session', sessionId);
    window.history.replaceState({}, '', url.toString());
  }, [sessionId]);

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

  // Auto-open canvas when AI completes a code response
  useEffect(() => {
    const currentMessages = messages[sessionId] || [];
    if (currentMessages.length === 0) return;
    const lastMsg = currentMessages[currentMessages.length - 1];

    if (autoOpenCanvas && lastMsg.sender === 'ai' && !lastMsg.isStreaming) {
      const codeMatch = lastMsg.text.match(/```(\w+)?\n([\s\S]*?)```/);
      if (codeMatch) {
        setActiveCanvas({ language: codeMatch[1] || 'html', code: codeMatch[2].trim() });
        setAutoOpenCanvas(false);
      }
    }
  }, [messages, sessionId, autoOpenCanvas]);

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

  const handleSendMessage = async (message, fileContext = null, isImageMode = false, isSearchMode = false, isCodeMode = false, imageContext = null, isCanvasMode = false, isVaultMode = false) => {
    let contextParts = [];
    if (fileContext) {
      const truncatedContext = fileContext.length > 10000 
        ? fileContext.substring(0, 10000) + '\n\n[Document truncated due to length...]' 
        : fileContext;
      contextParts.push(`Document Content:\n${truncatedContext}`);
    }
    
    let outboundMessage = contextParts.length > 0
      ? `Message: ${message}\n\n${contextParts.join('\n\n')}`
      : message;

    if (isCanvasMode) {
      setAutoOpenCanvas(true);
      outboundMessage = message + "\n\n(Provide the response as a single, complete HTML/CSS/JS code block)";
    }

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
          text: isImageMode ? 'Synapse AI is imagining your request...' : '',
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
            (SYSTEM_PROMPTS.find(p => p.id === systemPrompt)?.prompt ||
            SYSTEM_PROMPTS[0].prompt) + "\n\nIf the user explicitly asks you to send an email, you must output a hidden JSON block exactly formatted like this at the end of your response: `[EMAIL_ACTION: {\"to\": \"target@domain.com\", \"subject\": \"...\", \"body\": \"...\"}]`. Do not output markdown inside the JSON.",
          isSearchMode,
          isCodeMode,
          imageContext,
          isVaultMode
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
                const stepMatch = fullContent.match(/\[AGENT_STEP:([^\]]+)\]/);
                if (stepMatch) {
                  setCurrentAgentStep(stepMatch[1]);
                } else if (fullContent.includes('[PLANNING]')) {
                  setCurrentAgentStep('Planning');
                } else if (fullContent.includes('[RESEARCHING]')) {
                  setCurrentAgentStep('Researching');
                } else if (fullContent.includes('[EXECUTING]')) {
                  setCurrentAgentStep('Executing');
                }
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
      setCurrentAgentStep(null);
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
    setActiveCanvas(null);
    setAutoOpenCanvas(false);
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
    <div 
      className={`min-h-screen flex ${darkMode ? 'dark' : ''}`}
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
    >
      <div className="fixed pointer-events-none blur-[120px] opacity-[0.05] w-[500px] h-[500px] bg-gradient-to-r from-fuchsia-500 to-violet-600 rounded-full z-0 transition-all duration-500"
        style={{
          left: mousePos.x - 250,
          top: mousePos.y - 250
        }}
      />
      <div className={`hidden md:flex ${isSidebarCollapsed ? 'w-20' : 'w-64'} transition-all duration-300 z-10`}>
        <Sidebar
          sessionId={sessionId}
          chatHistory={chatHistory}
          onNewChat={handleNewChat}
          onSelectChat={(id) => setSessionId(id)}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
          darkMode={darkMode}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        />
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-zinc-900 shadow-2xl">
            <Sidebar
              sessionId={sessionId}
              chatHistory={chatHistory}
              onNewChat={() => { handleNewChat(); setIsSidebarOpen(false); }}
              onSelectChat={(id) => { setSessionId(id); setIsSidebarOpen(false); }}
              onDeleteChat={handleDeleteChat}
              onRenameChat={handleRenameChat}
              darkMode={darkMode}
              isCollapsed={false}
              onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
              isMobileOpen={true}
              onCloseMobile={() => setIsSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex w-full">
        <div className="md:hidden flex items-center justify-between w-full px-4 py-3 backdrop-blur-md bg-black/50 sticky top-0 z-40 border-b border-zinc-800/50">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-300"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-lg font-bold bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">Synapse</span>
          <button
            onClick={handleNewChat}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-300"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <div className={`flex-1 flex flex-col ${activeCanvas ? '' : ''}`}>
          <div className={`flex-1 flex ${activeCanvas ? 'gap-0' : ''}`}>
            <div className={`flex-1 flex flex-col ${activeCanvas ? 'w-[35%]' : ''}`}>
              <ChatArea
                messages={currentMessages}
                isLoading={isLoading || isGeneratingImage}
                darkMode={darkMode}
                onOpenCanvas={setActiveCanvas}
                currentAgentStep={currentAgentStep}
                sessionId={sessionId}
                isVoiceMode={isVoiceMode}
                isHandsFree={isHandsFree}
                selectedVoiceIndex={selectedVoiceIndex}
              />

              <ChatInput
                isLoading={isLoading || isGeneratingImage}
                onSendMessage={handleSendMessage}
                onFileProcessed={handlePdfProcessed}
                darkMode={darkMode}
                activeCanvas={activeCanvas}
                onToggleCanvas={setActiveCanvas}
              />
            </div>
          </div>

          {activeCanvas && (
            <div className={`w-[65%] border-l ${darkMode ? 'border-zinc-800/50 bg-[#0a0a0a]' : 'border-gray-200 bg-white'} flex flex-col animate-fade-in`}>
              <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-zinc-800/50 bg-zinc-900/50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${darkMode ? 'text-zinc-300' : 'text-gray-700'}`}>Canvas</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-violet-500/20 text-violet-600 border border-violet-500/30">
                    {activeCanvas.language || 'code'}
                  </span>
                </div>
                <button
                  onClick={() => setActiveCanvas(null)}
                  className={`p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 ${darkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-gray-500 hover:text-gray-700'} transition-all duration-300`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 p-4 overflow-auto">
                <LargePreviewableCodeBlock code={activeCanvas.code} language={activeCanvas.language} darkMode={darkMode} />
              </div>
            </div>
          )}
        </div>

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

