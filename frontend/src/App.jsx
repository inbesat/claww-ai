import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import ChatInput from './components/ChatInput';
import CodexModal from './components/CodexModal';
import CommandPalette from './components/CommandPalette';
import ThemeVibe from './components/ThemeVibe';
import { LargePreviewableCodeBlock } from './components/MessageBubble';
import Canvas from './components/Canvas';
import mermaid from 'mermaid';
import './index.css';

try { mermaid.initialize?.({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' }) } catch(e) {}

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

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
    return localStorage.getItem('synapse_dark_mode') !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('synapse_dark_mode', darkMode.toString());
  }, [darkMode]);

  const [activeCanvas, setActiveCanvas] = useState(null);
  const [autoOpenCanvas, setAutoOpenCanvas] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentAgentStep, setCurrentAgentStep] = useState(null);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isHandsFree, setIsHandsFree] = useState(false);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [toolActive, setToolActive] = useState(false);
  const [toolName, setToolName] = useState(null);
  const [showCodex, setShowCodex] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [aiTone, setAiTone] = useState(() => localStorage.getItem('ai_tone') || '');

  const [macros, setMacros] = useState(() => JSON.parse(localStorage.getItem('synapse_macros')) || [{ command: '/roast', prompt: 'Read the following and absolutely destroy it with sarcastic critique: ' }, { command: '/eli5', prompt: 'Explain the following concept like I am a 5 year old: ' }]);

  const [temperature, setTemperature] = useState(() => parseFloat(localStorage.getItem('synapse_temp')) || 0.7);
  const [memoryDepth, setMemoryDepth] = useState(() => parseInt(localStorage.getItem('synapse_memory')) || 10);

  const [zenMode, setZenMode] = useState(false);

  const [isNotebookMode, setIsNotebookMode] = useState(() => localStorage.getItem('synapse_notebook') === 'true');
  const [transitionState, setTransitionState] = useState(null);

  const handleNotebookToggle = () => {
    if (transitionState) return;
    setTransitionState('out');
    setTimeout(() => {
      setIsNotebookMode(!isNotebookMode);
      setTransitionState('in');
      setTimeout(() => {
        setTransitionState(null);
      }, 600);
    }, 600);
  };

  useEffect(() => {
    localStorage.setItem('synapse_notebook', isNotebookMode.toString());
  }, [isNotebookMode]);

  // Theme state
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved || 'cyberpunk';
  });

  // Font style state
  const [fontStyle, setFontStyle] = useState(() => localStorage.getItem('synapse_font') || 'sans');

  // Initialize data-font on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-font', fontStyle);
  }, []);

  // Offline/LLM mode state
  const [useLocalLlm, setUseLocalLlm] = useState(() => localStorage.getItem('synapse_local') === 'true');

  useEffect(() => {
    localStorage.setItem('synapse_local', useLocalLlm.toString());
  }, [useLocalLlm]);

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

  // Welcome Tour - show on first visit only
  useEffect(() => {
    const tourSeen = localStorage.getItem('synapse_tour_seen');
    if (!tourSeen) {
      setShowCodex(true);
      localStorage.setItem('synapse_tour_seen', 'true');
    }
  }, []);

  // Initialize theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Save theme to localStorage
  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Save fontStyle to localStorage
  useEffect(() => {
    localStorage.setItem('synapse_font', fontStyle);
    document.documentElement.setAttribute('data-font', fontStyle);
  }, [fontStyle]);

  // Zen Mode toggle with Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && zenMode) {
        setZenMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zenMode]);

  // Command Palette toggle with Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
      if (e.key === 'Escape' && showCommandPalette) {
        setShowCommandPalette(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCommandPalette]);

  useEffect(() => {
    localStorage.setItem('synapse_macros', JSON.stringify(macros));
  }, [macros]);

  useEffect(() => {
    localStorage.setItem('synapse_temp', temperature.toString());
  }, [temperature]);

  useEffect(() => {
    localStorage.setItem('synapse_memory', memoryDepth.toString());
  }, [memoryDepth]);

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
    localStorage.setItem('ai_tone', aiTone);
  }, [messages, chatHistory, sessionId, systemPrompt, aiTone]);

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

      const sanitizedHistory = currentMessages.map(msg => {
        const cleanMsg = {
          ...msg,
          text: msg.text?.startsWith('data:image') ? '[AI Generated Image]' : msg.text
        };
        if (msg.searchData) {
          cleanMsg.searchData = msg.searchData;
          cleanMsg.isSearchResult = true;
        }
        return cleanMsg;
      });

      const response = await fetch(`${API_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: outboundMessage,
          sessionId,
          history: sanitizedHistory,
          isSearchMode: isSearchMode || message.match(/news|headlines|happened|president|minister|who is|latest|current|event|yesterday|today|tomorrow|forecast|score|price|weather|ipl|match|who won|result|election|trump|musk|biden|government|stock|growth|gdp/i),
          systemPrompt:
            (SYSTEM_PROMPTS.find(p => p.id === systemPrompt)?.prompt ||
            SYSTEM_PROMPTS[0].prompt) + "\n\nIf the user explicitly asks you to send an email, you must output a hidden JSON block exactly formatted like this at the end of your response: `[EMAIL_ACTION: {\"to\": \"target@domain.com\", \"subject\": \"...\", \"body\": \"...\"}]`. Do not output markdown inside the JSON.",
          imageContext,
          isVaultMode,
          temperature,
          memoryDepth,
          useLocalLlm,
          isNotebookMode
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
              // Handle tool active status
              if (parsed.toolActive) {
                setToolActive(true);
                setToolName(parsed.toolName);
              }

              if (parsed.done) {
                setToolActive(false);
                setToolName(null);
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

  const handleForkChat = (messageIndex) => {
    const currentSessionMessages = messages[sessionId] || [];
    const forkedMessages = currentSessionMessages.slice(0, messageIndex + 1);
    
    if (forkedMessages.length === 0) return;
    
    const newSessionId = Date.now().toString();
    const forkedTitle = (forkedMessages[0]?.text || 'Forked Chat').slice(0, 30) + ' (fork)';
    
    const newMessages = { ...messages, [newSessionId]: forkedMessages };
    setMessages(newMessages);
    
    setChatHistory(prev => [
      { id: newSessionId, title: forkedTitle, timestamp: Date.now() },
      ...prev
    ]);
    
    setSessionId(newSessionId);
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
className={`h-[100dvh] flex ${darkMode ? 'dark' : ''}`}
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
    >
      <CodexModal isOpen={showCodex} onClose={() => setShowCodex(false)} />
      <CommandPalette 
        isOpen={showCommandPalette} 
        onClose={() => setShowCommandPalette(false)} 
        macros={macros}
        chatHistory={chatHistory}
        onSelectChat={(id) => setSessionId(id)}
        setZenMode={setZenMode}
        setTheme={setTheme}
        setMessage={(msg) => {
        }}
      />
      <button
        onClick={() => setZenMode(!zenMode)}
        className={`hidden md:flex absolute top-4 right-4 z-50 p-2 rounded-lg transition-all duration-300 ${zenMode ? 'opacity-100' : 'opacity-50 hover:opacity-100'} ${darkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-white text-zinc-700 hover:bg-gray-100'} border ${darkMode ? 'border-zinc-700' : 'border-gray-200'}`}
        title={zenMode ? 'Exit Zen Mode (Esc)' : 'Enter Zen Mode'}
      >
        {zenMode ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        )}
      </button>

      <div className="fixed pointer-events-none blur-[120px] opacity-[0.08] w-[600px] h-[600px] rounded-full z-0 transition-all duration-700"
        style={{
          left: mousePos.x - 300,
          top: mousePos.y - 300,
          background: 'radial-gradient(circle, var(--aura-color, #8b5cf6) 0%, transparent 70%)'
        }}
/>
      <div className={`hidden md:flex ${zenMode ? 'md:hidden w-0 overflow-hidden' : (isSidebarCollapsed ? 'w-20' : 'w-64')} ${isNotebookMode ? 'md:hidden w-0' : ''} transition-all duration-500 z-10`}>
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
          onOpenCodex={() => setShowCodex(true)}
          aiTone={aiTone}
          setAiTone={setAiTone}
          theme={theme}
          setTheme={setTheme}
          macros={macros}
          setMacros={setMacros}
          temperature={temperature}
          setTemperature={setTemperature}
          memoryDepth={memoryDepth}
setMemoryDepth={setMemoryDepth}
          fontStyle={fontStyle}
          setFontStyle={setFontStyle}
          setDarkMode={setDarkMode}
          useLocalLlm={useLocalLlm}
          setUseLocalLlm={setUseLocalLlm}
          isNotebookMode={isNotebookMode}
          setIsNotebookMode={setIsNotebookMode}
          handleNotebookToggle={handleNotebookToggle}
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
              onOpenCodex={() => setShowCodex(true)}
              aiTone={aiTone}
              setAiTone={setAiTone}
              theme={theme}
              setTheme={setTheme}
              macros={macros}
              setMacros={setMacros}
              temperature={temperature}
              setTemperature={setTemperature}
              memoryDepth={memoryDepth}
              setMemoryDepth={setMemoryDepth}
              fontStyle={fontStyle}
              setFontStyle={setFontStyle}
              setDarkMode={setDarkMode}
              useLocalLlm={useLocalLlm}
              setUseLocalLlm={setUseLocalLlm}
              isNotebookMode={isNotebookMode}
              setIsNotebookMode={setIsNotebookMode}
              handleNotebookToggle={handleNotebookToggle}
            />
          </div>
        )}

        <div className={`flex-1 flex flex-col transition-all duration-700 ease-in-out ${activeCanvas ? '' : ''} ${transitionState === 'out' ? 'animate-dust-out' : transitionState === 'in' ? 'animate-dust-in' : ''}`}>
          <div className={`flex-1 flex ${activeCanvas ? 'gap-0' : ''}`}>
            {isNotebookMode && (
              <div className="hidden lg:flex w-72 flex-col bg-[#1e1e1e]/90 border-r border-white/10 p-4">
                <h2 className="text-sm font-bold text-zinc-200 mb-4 flex items-center gap-2">📚 Sources</h2>
                <button className="w-full py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-zinc-300 hover:bg-white/10 transition-colors">+ Add sources</button>
                <div className="mt-4 flex-1 overflow-y-auto">
                  <p className="text-xs text-zinc-500 text-center mt-10">No sources added yet.</p>
                </div>
              </div>
            )}
            <div className={`flex-1 relative flex flex-col min-w-0 transition-all duration-500 ${zenMode ? 'px-10 lg:px-40 border-none bg-transparent' : 'bg-white/5 border-l border-white/10'} ${activeCanvas ? 'w-[35%]' : ''}`}>
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden absolute top-3 left-3 z-40 p-2.5 rounded-full bg-[var(--theme-bg-glass)] backdrop-blur-xl border border-[var(--theme-border)] text-[var(--theme-text)] shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={handleNewChat}
                className="md:hidden absolute top-3 right-3 z-40 p-2.5 rounded-full text-white shadow-lg"
                style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', boxShadow: '0 4px 15px var(--glow-color)' }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
<ChatArea
                messages={currentMessages}
                isLoading={isLoading || isGeneratingImage}
                darkMode={darkMode}
                onOpenCanvas={setActiveCanvas}
                onFork={handleForkChat}
                currentAgentStep={currentAgentStep}
                sessionId={sessionId}
                isVoiceMode={isVoiceMode}
                isHandsFree={isHandsFree}
                selectedVoiceIndex={selectedVoiceIndex}
                toolActive={toolActive}
                toolName={toolName}
                aiTone={aiTone}
              />

              <ChatInput
                isLoading={isLoading || isGeneratingImage}
                onSendMessage={handleSendMessage}
                onFileProcessed={handlePdfProcessed}
                darkMode={darkMode}
                activeCanvas={activeCanvas}
                onToggleCanvas={setActiveCanvas}
                sessionId={sessionId}
                macros={macros}
                zenMode={zenMode}
              />
            </div>
            {isNotebookMode && (
              <div className="hidden xl:flex w-80 flex-col bg-[#1e1e1e]/90 border-l border-white/10 p-4">
                <h2 className="text-sm font-bold text-zinc-200 mb-4">✨ Studio</h2>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/5 border border-white/10 p-3 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                    <div className="text-lg mb-1">🎧</div>
                    <div className="text-xs font-medium text-zinc-300">Audio Overview</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-3 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                    <div className="text-lg mb-1">📝</div>
                    <div className="text-xs font-medium text-zinc-300">Study Guide</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-3 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                    <div className="text-lg mb-1">❓</div>
                    <div className="text-xs font-medium text-zinc-300">Quiz</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-3 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                    <div className="text-lg mb-1">🗂️</div>
                    <div className="text-xs font-medium text-zinc-300">Flashcards</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {activeCanvas && (
            <Canvas 
              content={activeCanvas.code} 
              language={activeCanvas.language}
              onClose={() => setActiveCanvas(null)} 
            />
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

