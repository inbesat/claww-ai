import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

const ChatArea = ({ messages, isLoading, darkMode, onOpenCanvas }) => {
  const chatAreaRef = useRef(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const prevScrollHeightRef = useRef(0);

  useEffect(() => {
    if (chatAreaRef.current) {
      // Auto-scroll to bottom, but only scroll if content grew or it's a new message
      const scrollHeight = chatAreaRef.current.scrollHeight;
      const wasAtBottom = chatAreaRef.current.scrollHeight - chatAreaRef.current.scrollTop - chatAreaRef.current.clientHeight < 50;
      
      if (messages.length > prevMessagesLengthRef.current || wasAtBottom || prevScrollHeightRef.current < scrollHeight) {
        chatAreaRef.current.scrollTo({
          top: scrollHeight,
          behavior: messages.length > prevMessagesLengthRef.current ? 'smooth' : 'auto'
        });
      }
      prevMessagesLengthRef.current = messages.length;
      prevScrollHeightRef.current = scrollHeight;
    }
  }, [messages, isLoading]);

  // Check if any message is currently streaming
  const hasStreamingMessage = messages.some(msg => msg.isStreaming);

  const FeatureCard = ({ icon, title, description, darkMode }) => (
    <div className={`group p-5 rounded-2xl border transition-all duration-300 cursor-pointer hover:scale-[1.02] ${
      darkMode 
        ? 'bg-zinc-900/50 border-zinc-800 hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10' 
        : 'bg-white border-gray-200 shadow-sm hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10'
    }`}>
      <div className="flex items-start gap-4">
        <div className={`p-2.5 rounded-xl ${
          darkMode ? 'bg-violet-500/20' : 'bg-violet-100'
        }`}>
          <div className="text-violet-500">{icon}</div>
        </div>
        <div>
          <h3 className={`font-semibold text-base mb-1 ${darkMode ? 'text-[#fafafa]' : 'text-zinc-900'}`}>
            {title}
          </h3>
          <p className={`text-sm ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {description}
          </p>
        </div>
      </div>
    </div>
  );

  const GlobeIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );

  const CodeIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  );

  const SparklesIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18l-.813-2.096L6 15l2.187-.904L9 12l.813 2.096L12 15l-2.187.904zM17.813 7.904L17 10l-.813-2.096L14 7l2.187-.904L17 4l.813 2.096L20 7l-2.187.904zM14 19l.813-2.096L17 16l-2.187-.904L14 13l-.813 2.096L11 16l2.187.904L14 19z" />
    </svg>
  );

  const FileIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );

  const LayoutIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  );

  const DatabaseIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  );

  return (
    <div 
      ref={chatAreaRef}
      className={`flex-1 overflow-y-auto py-6 px-4 ${darkMode ? 'bg-[#0a0a0a]' : 'bg-zinc-50'} scrollbar-thin scrollbar-thumb-zinc-700/50 scrollbar-track-transparent`}
    >
      <div className="max-w-[800px] mx-auto space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-violet-500 to-fuchsia-500 text-transparent bg-clip-text mb-4">
                Welcome to Synapse AI
              </h1>
              <p className={`text-lg ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                How can I help you today?
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto mt-8">
              <FeatureCard 
                icon={<GlobeIcon />}
                title="Web Search"
                description="Get real-time answers and live data from the internet."
                darkMode={darkMode}
              />
              <FeatureCard 
                icon={<CodeIcon />}
                title="Code Mode"
                description="Generate production-ready code with an elite AI developer."
                darkMode={darkMode}
              />
              <FeatureCard 
                icon={<SparklesIcon />}
                title="Image Gen"
                description="Create stunning visuals from text descriptions."
                darkMode={darkMode}
              />
              <FeatureCard 
                icon={<FileIcon />}
                title="Document Analysis"
                description="Upload PDFs and ask questions about their content."
                darkMode={darkMode}
              />
              <FeatureCard 
                icon={<LayoutIcon />}
                title="Canvas"
                description="Interactive workspace for live coding, document editing, and side-by-side previews."
                darkMode={darkMode}
              />
              <FeatureCard 
                icon={<DatabaseIcon />}
                title="Knowledge Vault"
                description="Your personal long-term memory. Upload full libraries and chat with all your data at once."
                darkMode={darkMode}
              />
            </div>
          </div>
        )}
        
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} darkMode={darkMode} onOpenCanvas={onOpenCanvas} />
        ))}
      </div>
    </div>
  );
};

export default ChatArea;