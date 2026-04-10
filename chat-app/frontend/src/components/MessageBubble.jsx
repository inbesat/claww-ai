import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

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
    margin: '1em 0',
    overflow: 'auto',
    borderRadius: '0.5rem',
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

const MessageBubble = ({ message, darkMode }) => {
  const isUser = message.sender === 'user';
  const isStreaming = message.isStreaming;
  const [copied, setCopied] = useState(false);
  
  const bubbleClasses = isUser
    ? 'bg-[#10a37f] text-white'
    : 'bg-zinc-100 dark:bg-[#2a2a2a] text-zinc-900 dark:text-[#e5e5e5]';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const CopyButton = () => (
    <button
      onClick={handleCopy}
      className={`absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-200/80 dark:bg-zinc-700/60 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all duration-200 opacity-0 group-hover:opacity-100`}
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
            
            if (!inline && (match || children)) {
              return (
                <div className="relative group">
                  <SyntaxHighlighter
                    style={chatgptDark}
                    language={language || 'text'}
                    PreTag="div"
                    customStyle={{
                      margin: '1em 0',
                      borderRadius: '0.5rem',
                      fontSize: '14px',
                      background: '#1e1e1e',
                      maxHeight: '400px',
                      overflow: 'auto',
                    }}
                    wrapLines={true}
                    wrapLongLines={true}
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
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
        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-600/30">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </div>
      )}
      <div className="relative">
          <div className={`max-w-[85%] ${bubbleClasses} px-5 py-3.5 rounded-2xl shadow-sm animate-slide-up`}>
          <div className="text-[15px] leading-relaxed">
            {isUser ? (
              renderMarkdown(message.text)
            ) : (
              <>
                {renderMarkdown(message.text)}
                {isStreaming && <span className="inline-block w-0.5 h-4 ml-0.5 bg-zinc-400 animate-pulse" />}
              </>
            )}
          </div>
        </div>
        {!isUser && !isStreaming && (
          <div className="absolute -top-1 -right-1">
            {copied ? (
              <span className="text-xs bg-emerald-600 text-white px-2 py-1 rounded-lg shadow-sm">Copied!</span>
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
