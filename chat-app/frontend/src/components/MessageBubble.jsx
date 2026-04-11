import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { saveAs } from 'file-saver';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
  const socketRef = useRef(null);
  const isLocalUpdate = useRef(false);
  
  const previewableLanguages = ['html', 'css', 'javascript', 'xml', 'js', 'css', 'html'];
  const canPreview = previewableLanguages.includes(language?.toLowerCase());

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
        <div className="flex items-center gap-2">
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

const MessageBubble = ({ message, darkMode, onOpenCanvas, sessionId }) => {
  const isUser = message.sender === 'user';
  const isStreaming = message.isStreaming;
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const bubbleClasses = isUser
    ? 'bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20 rounded-2xl rounded-br-sm'
    : 'bg-white dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 shadow-sm rounded-2xl rounded-bl-sm';

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
                          Canvas
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

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-3 group animate-fade-in`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/30 border border-violet-400/30">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </div>
      )}
      <div className="relative">
          <div className={`max-w-[85%] ${bubbleClasses} px-5 py-3.5 rounded-2xl shadow-sm animate-slide-up`}>
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
