import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { saveAs } from 'file-saver';
import { io } from 'socket.io-client';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
});

const MermaidDiagram = ({ code, darkMode }) => {
  const [svg, setSvg] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const render = async () => {
      try {
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, code);
        setSvg(svg);
      } catch (e) {
        console.error('Mermaid render error:', e);
        setSvg('<text>Diagram error</text>');
      }
    };
    render();
  }, [code]);

  return (
    <div 
      ref={containerRef}
      className={`my-4 p-4 rounded-lg overflow-x-auto ${darkMode ? 'bg-zinc-900' : 'bg-gray-50'}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

const API_URL = (import.meta.env.VITE_API_URL || 'https://claww-ai-3.onrender.com').trim();

const chatgptDark = {
  'code[class*="language-"]': {
    color: '#e5e5e5',
    background: 'none',
    fontFamily: "Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace",
    fontSize: '14px',
    textAlign: 'left',
    whiteSpace: 'pre',
    wordSpacing: 'normal',
    wordBreak: 'normal',
    wordWrap: 'normal',
    lineHeight: '1.5',
    tabSize: 2,
    hyphens: 'none',
  },
  'pre[class*="language-"]': {
    color: '#e5e5e5',
    background: '#1e1e1e',
    fontFamily: "Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace",
    fontSize: '14px',
    padding: '12px 16px',
    margin: '0',
    overflow: 'auto',
    borderRadius: '0 0 0.5rem 0.5rem',
    lineHeight: '1.5',
    tabSize: 2,
  },
  comment: { color: '#6a9955' },
  prolog: { color: '#6a9955' },
  doctype: { color: '#6a9955' },
  cdata: { color: '#6a9955' },
  punctuation: { color: '#d4d4d4' },
  property: { color: '#9cdcfe' },
  tag: { color: '#569cd6' },
  boolean: { color: '#569cd6' },
  number: { color: '#b5cea8' },
  constant: { color: '#9cdcfe' },
  symbol: { color: '#b5cea8' },
  selector: { color: '#d7ba7d' },
  'attr-name': { color: '#9cdcfe' },
  string: { color: '#ce9178' },
  char: { color: '#ce9178' },
  builtin: { color: '#d4d4d4' },
  inserted: { color: '#b5cea8' },
  operator: { color: '#d4d4d4' },
  entity: { color: '#d4d4d4', cursor: 'help' },
  url: { color: '#d4d4d4' },
  '.language-css .token.string': { color: '#d4d4d4' },
  '.style .token.string': { color: '#d4d4d4' },
  atrule: { color: '#9cdcfe' },
  'attr-value': { color: '#ce9178' },
  keyword: { color: '#569cd6' },
  function: { color: '#dcdcaa' },
  'class-name': { color: '#dcdcaa' },
  regex: { color: '#d16969' },
  variable: { color: '#9cdcfe' },
};

const PreviewableCodeBlock = ({ code, language, darkMode }) => {
  const [activeTab, setActiveTab] = useState('code');
  const previewableLanguages = ['html', 'css', 'javascript', 'xml', 'js', 'css', 'html'];
  const canPreview = previewableLanguages.includes(language?.toLowerCase());

  const containerClass = darkMode 
    ? 'bg-[#1e1e1e] border border-zinc-700' 
    : 'bg-white border border-gray-200';

  return (
    <div className={`relative my-3 rounded-lg overflow-hidden ${containerClass}`}>
      <div className={`flex items-center justify-between px-3 py-2 ${darkMode ? 'bg-zinc-800/80' : 'bg-gray-100'}`}>
        <span className={`text-xs font-medium uppercase ${darkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
          {language || 'text'}
        </span>
        {canPreview && (
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('code')}
              className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                activeTab === 'code'
                  ? 'bg-violet-600 text-white'
                  : darkMode 
                    ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
              }`}
            >
              Code
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                activeTab === 'preview'
                  ? 'bg-violet-600 text-white'
                  : darkMode 
                    ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
              }`}
            >
              Preview
            </button>
          </div>
        )}
      </div>
      
      {activeTab === 'code' ? (
        <SyntaxHighlighter
          style={chatgptDark}
          language={language || 'text'}
          PreTag="div"
          customStyle={{
            margin: 0,
            borderRadius: '0 0 0.5rem 0.5rem',
            fontSize: '14px',
            background: darkMode ? '#1e1e1e' : '#f8f8f8',
            maxHeight: '400px',
            overflow: 'auto',
          }}
          wrapLines={true}
          wrapLongLines={true}
        >
          {code}
        </SyntaxHighlighter>
      ) : (
        <iframe
          title="preview"
          srcDoc={code}
          sandbox="allow-scripts"
          className="w-full h-[400px] bg-white rounded-b-md border-none"
        />
      )}
    </div>
  );
};

export const LargePreviewableCodeBlock = ({ code, language, darkMode, sessionId }) => {
  const [activeTab, setActiveTab] = useState('code');
  const [localCode, setLocalCode] = useState(code);
  const [isLiveCollab, setIsLiveCollab] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [execMode, setExecMode] = useState('');
  const socketRef = useRef(null);
  const isLocalUpdate = useRef(false);
  const pyodideRef = useRef(null);
  
  const langMap = { python: 'python3', javascript: 'node-js', js: 'node-js', python3: 'python3', 'node-js': 'node-js', cpp: 'cpp', c: 'c', rust: 'rust', java: 'java' };
  const previewableLanguages = ['html', 'css', 'javascript', 'xml', 'js', 'css', 'html'];
  const canPreview = previewableLanguages.includes(language?.toLowerCase());
  const canExecute = ['python', 'javascript', 'python3', 'js', 'node-js'].includes(language?.toLowerCase());

  useEffect(() => {
    if (!sessionId) return;
    
    socketRef.current = io(API_URL, {
      transports: ['websocket'],
      reconnection: true
    });
    
    socketRef.current.on('connect', () => {
      socketRef.current.emit('join-room', sessionId);
      setIsLiveCollab(true);
    });
    
    socketRef.current.on('canvas-update', (newCode) => {
      isLocalUpdate.current = true;
      setLocalCode(newCode);
      isLocalUpdate.current = false;
    });
    
    return () => {
      socketRef.current?.disconnect();
    };
  }, [sessionId]);

  useEffect(() => {
    setLocalCode(code);
  }, [code]);

  const handleCodeChange = (e) => {
    const newCode = e.target.value;
    setLocalCode(newCode);
    
    if (sessionId && socketRef.current) {
      socketRef.current.emit('canvas-update', { sessionId, code: newCode });
    }
  };

  const handleCopyInviteLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('session', sessionId);
    navigator.clipboard.writeText(url.toString());
  };

  const handleDownload = () => {
    const blob = new Blob([localCode], { type: 'text/html;charset=utf-8' });
    saveAs(blob, 'index.html');
  };

  const handleDeploy = () => {
    const netlifyUrl = 'https://app.netlify.com/drop';
    window.open(netlifyUrl, '_blank');
  };

  const loadPyodide = async () => {
    if (pyodideRef.current) return pyodideRef.current;
    if (!window.loadPyodide) {
      await new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
        script.onload = resolve;
        document.head.appendChild(script);
      });
    }
    pyodideRef.current = await window.loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/' });
    return pyodideRef.current;
  };

  const executeCode = async () => {
    setIsExecuting(true);
    setConsoleOutput('');
    const lang = language?.toLowerCase() || 'javascript';
    
    try {
      if (lang === 'python' || lang === 'python3') {
        setExecMode('⚡ Local (Pyodide)');
        const pyodide = await loadPyodide();
        pyodide.runPython(localCode);
        setConsoleOutput('Execution complete.');
      } else if (lang === 'javascript' || lang === 'js' || lang === 'node-js') {
        setExecMode('⚡ Local (Node.js)');
        try {
          const result = new Function(localCode)();
          setConsoleOutput(result !== undefined ? String(result) : 'Execution complete.');
        } catch (e) {
          setConsoleOutput(`Error: ${e.message}`);
        }
      } else {
        setExecMode('☁️ Cloud (Piston)');
        const mappedLang = langMap[lang] || lang;
        const response = await fetch('https://emacs.piston.rs/api/v2/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: mappedLang, version: '*', files: [{ content: localCode }] })
        });
        const result = await response.json();
        setConsoleOutput(result.run?.output || result.run?.stderr || 'No output.');
      }
    } catch (err) {
      setConsoleOutput(`Error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const containerClass = darkMode 
    ? 'bg-[#1e1e1e] border border-zinc-700' 
    : 'bg-white border border-gray-200';

  return (
    <div className={`relative my-3 rounded-lg overflow-hidden ${containerClass}`}>
      <div className={`flex items-center justify-between px-3 py-2 ${darkMode ? 'bg-zinc-800/80' : 'bg-gray-100'}`}>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium uppercase ${darkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
            {language || 'text'}
          </span>
          {canPreview && (
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('code')}
                className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                  activeTab === 'code'
                    ? 'bg-violet-600 text-white'
                    : darkMode 
                      ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                }`}
              >
                Code
              </button>
              {canPreview ? (
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                    activeTab === 'preview'
                      ? 'bg-violet-600 text-white'
                      : darkMode 
                        ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Preview
                </button>
              ) : canExecute ? (
                <button
                  onClick={() => setActiveTab('console')}
                  className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                    activeTab === 'console'
                      ? 'bg-violet-600 text-white'
                      : darkMode 
                        ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Console
                </button>
              ) : null}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canExecute && (
            <button
              onClick={executeCode}
              disabled={isExecuting}
              className="px-2.5 py-1 text-xs rounded-md flex items-center gap-1 transition-all bg-green-600 hover:bg-green-500 text-white disabled:opacity-50"
              title="Run Code"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              {isExecuting ? 'Running...' : 'Run'}
            </button>
          )}
          <button
            onClick={handleDownload}
            className={`px-2.5 py-1 text-xs rounded-md flex items-center gap-1 transition-all ${
              darkMode 
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 bg-zinc-800' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200 bg-gray-200'
            }`}
            title="Download as HTML"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
          <button
            onClick={handleDeploy}
            className={`px-2.5 py-1 text-xs rounded-md flex items-center gap-1 transition-all bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500`}
            title="Deploy to Netlify"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Deploy
          </button>
        </div>
      </div>
      
      {sessionId && (
        <div className={`flex items-center gap-2 px-3 py-1.5 text-xs ${darkMode ? 'bg-zinc-800/50 text-zinc-400' : 'bg-gray-50 text-gray-500'}`}>
          <span className={`flex items-center gap-1.5 ${isLiveCollab ? 'text-green-500' : ''}`}>
            <span className={`w-2 h-2 rounded-full ${isLiveCollab ? 'bg-green-500 animate-pulse' : 'bg-zinc-500'}`} />
            {isLiveCollab ? 'Live Collab' : 'Offline'}
          </span>
          {isLiveCollab && (
            <button
              onClick={handleCopyInviteLink}
              className="ml-auto text-xs px-2 py-1 rounded bg-violet-600 text-white hover:bg-violet-500 transition-all"
            >
              Copy Invite Link
            </button>
          )}
        </div>
      )}
      
      {activeTab === 'code' ? (
        <>
          <div className="relative">
            <textarea
              value={localCode}
              onChange={handleCodeChange}
              className={`w-full min-h-[200px] p-3 font-mono text-sm resize-y bg-transparent outline-none ${
                darkMode ? 'text-zinc-200' : 'text-zinc-800'
              }`}
              spellCheck={false}
            />
          </div>
          {canExecute && activeTab === 'code' && (
            <div className={`border-t ${darkMode ? 'border-zinc-700 bg-black' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center justify-between px-3 py-1.5">
                <button
                  onClick={() => setActiveTab('console')}
                  className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                    activeTab === 'console'
                      ? 'bg-zinc-700 text-white'
                      : darkMode
                        ? 'text-zinc-400 hover:text-zinc-200'
                        : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Console
                </button>
                {execMode && (
                  <span className="text-xs text-zinc-500">{execMode}</span>
                )}
              </div>
              {activeTab === 'console' && (
                <div className={`px-3 pb-3 font-mono text-sm text-green-400 whitespace-pre-wrap ${darkMode ? 'bg-black' : 'bg-gray-100'}`}>
                  {isExecuting ? 'Executing...' : consoleOutput || 'Click Run to execute code'}
                  <div className="mt-2 text-xs text-zinc-600">⚡ Powered by Local Pyodide + Piston</div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <iframe
          title="preview"
          srcDoc={localCode}
          sandbox="allow-scripts"
          className="w-full h-[calc(100vh-180px)] bg-white rounded-b-md border-none"
        />
      )}
    </div>
  );
};

const MessageBubble = ({ message, darkMode, onOpenCanvas, sessionId, isUser: propIsUser }) => {
  const isUser = propIsUser ?? message.sender === 'user';
  const isStreaming = message.isStreaming;
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const bubbleClasses = isUser
    ? 'text-white shadow-lg rounded-2xl rounded-br-sm'
    : 'bg-[var(--theme-bg-subtle)]/80 backdrop-blur-md border shadow-sm rounded-2xl rounded-bl-sm';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  useEffect(() => {
    return () => {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, [message.text]);

  const toggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const text = message.text;
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const CopyButton = () => (
    <button
      onClick={handleCopy}
      className={`absolute top-2 right-2 p-1.5 rounded-lg bg-white/80 dark:bg-zinc-800/80 hover:bg-white dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-violet-600 dark:hover:text-violet-400 transition-all duration-300 opacity-0 group-hover:opacity-100 border border-zinc-200/50 dark:border-zinc-700/50`}
      title="Copy"
    >
      {copied ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );

  const SpeakButton = () => (
    <button
      onClick={toggleSpeech}
      className={`absolute top-2 right-14 p-1.5 rounded-lg bg-white/80 dark:bg-zinc-800/80 hover:bg-white dark:hover:bg-zinc-700 transition-all duration-300 opacity-0 group-hover:opacity-100 border border-zinc-200/50 dark:border-zinc-700/50 ${isSpeaking ? 'text-violet-500 animate-pulse' : 'text-zinc-500 dark:text-zinc-400 hover:text-violet-600 dark:hover:text-violet-400'}`}
      title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
    >
      {isSpeaking ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      )}
    </button>
  );

  const renderMarkdown = (text) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        className="prose dark:prose-invert max-w-none"
components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');
            const previewableLanguages = ['html', 'css', 'javascript', 'xml', 'js', 'css', 'html'];
            const canPreview = previewableLanguages.includes(language?.toLowerCase());
            
            if (language?.toLowerCase() === 'mermaid') {
              return <MermaidDiagram code={codeString} darkMode={darkMode} />;
            }
            
            if (!inline && (match || children)) {
              return (
                <div className="relative my-3 rounded-lg overflow-hidden border border-zinc-700/50 dark:bg-[#1e1e1e] bg-gray-100">
                  <div className={`flex items-center justify-between px-3 py-2 ${darkMode ? 'bg-zinc-800/80' : 'bg-gray-200'}`}>
                    <span className={`text-xs font-medium uppercase ${darkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
                      {language || 'text'}
                    </span>
                    <div className="flex items-center gap-2">
                      {canPreview && onOpenCanvas && (
                        <button
                          onClick={() => onOpenCanvas({ code: codeString, language })}
                          className="px-2.5 py-1 text-xs rounded-md bg-violet-600 hover:bg-violet-500 text-white transition-all duration-300 flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                          </svg>
                          Render
                        </button>
                      )}
                    </div>
                  </div>
                  <SyntaxHighlighter
                    style={chatgptDark}
                    language={language || 'text'}
                    PreTag="div"
                    customStyle={{
                      margin: 0,
                      borderRadius: '0 0 0.5rem 0.5rem',
                      fontSize: '13px',
                      background: darkMode ? '#1e1e1e' : '#f8f8f8',
                      maxHeight: '250px',
                      overflow: 'auto',
                    }}
                    wrapLines={true}
                    wrapLongLines={true}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              );
            }
            
            return (
              <code
                className={`px-1.5 py-0.5 rounded ${isUser ? 'bg-white/20' : 'bg-zinc-200 dark:bg-zinc-700'}`}
                {...props}
              >
                {children}
              </code>
            );
          },
          p({ children }) {
            return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>;
          },
          ul({ children }) {
            return <ul className="mb-3 pl-6 list-disc">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="mb-3 pl-6 list-decimal">{children}</ol>;
          },
          li({ children }) {
            return <li className="mb-1">{children}</li>;
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                className="text-emerald-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-zinc-300 dark:border-zinc-600 pl-4 italic my-3">
                {children}
              </blockquote>
            );
          },
          img({ src, alt }) {
            if (!src) return null;

            return (
              <img
                src={src}
                alt={alt || 'Generated image'}
                className="my-3 max-w-full rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm"
              />
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    );
  };

const SynapseLogo = ({ className = "w-6 h-6", glow = false }) => (
  <div className={`relative flex items-center justify-center ${glow ? 'after:absolute after:inset-0 after:bg-violet-500/30 after:blur-xl after:rounded-full' : ''}`}>
    <svg className={`${className} relative z-10`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1" strokeOpacity="0.1" />
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" strokeDasharray="4 2" />
      <path d="M12 4V8M12 16V20M4 12H8M16 12H20" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.6"/>
      <path d="M12 8.5L15.5 12L12 15.5L8.5 12L12 8.5Z" fill="currentColor" className="animate-pulse" />
    </svg>
  </div>
);

return (
  <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-3 group animate-message`}>
    {!isUser && (
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg border border-[var(--accent-primary)]/30" style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}>
        <SynapseLogo className="w-5 h-5 text-white" glow={true} />
      </div>
    )}
    <div className="relative">
      <div 
        className={`max-w-[85%] ${bubbleClasses} px-5 py-3.5 rounded-2xl shadow-sm`}
        style={isUser ? { background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' } : { borderColor: 'var(--theme-border)' }}
      >
        <div className="text-[15px] leading-relaxed">
          {(() => {
            const rawText = message.text || '';
            const embeddedImage = message.image;
            const isBase64Image = rawText.startsWith('data:image') || (embeddedImage && embeddedImage.startsWith('data:image'));
            
            if (isBase64Image) {
              return (
                <>
                  {rawText && <div className="mb-2">{renderMarkdown(rawText)}</div>}
                  <img 
                    src={embeddedImage || rawText} 
                    alt="AI Generated" 
                    className="rounded-xl max-w-full border border-zinc-700 shadow-lg" 
                  />
                </>
              );
            }
            
            const cleanText = typeof rawText === 'string' ? rawText.replace(/^\s*\(|\)\s*$/g, '').trim() : rawText;
            return isUser ? (
              renderMarkdown(cleanText)
            ) : (
              <>
                {renderMarkdown(cleanText)}
                {isStreaming && <span className="inline-block w-0.5 h-4 ml-0.5 bg-zinc-400 animate-pulse" />}
              </>
            );
          })()}
        </div>
      </div>
      {!isUser && !isStreaming && (
        <div className="absolute -top-1 -right-1 flex gap-1">
          <SpeakButton />
          {copied ? (
            <span className="text-xs bg-violet-600 text-white px-2 py-1 rounded-lg shadow-sm">Copied!</span>
          ) : (
            <CopyButton />
          )}
        </div>
      )}
    </div>
  </div>
);
};

export default MessageBubble;
