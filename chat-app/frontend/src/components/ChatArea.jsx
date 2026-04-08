import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

const ChatArea = ({ messages, isLoading, darkMode }) => {
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

  return (
    <div 
      ref={chatAreaRef}
      className="flex-1 overflow-y-auto py-6 px-4 bg-white dark:bg-transparent"
    >
      <div className="max-w-[800px] mx-auto space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-28">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 mb-6 border border-emerald-500/20">
              <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-medium text-zinc-900 dark:text-[#fafafa] mb-2">How can I help you today?</h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">I can help you with coding, answer questions, or have a conversation.</p>
          </div>
        )}
        
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} darkMode={darkMode} />
        ))}
      </div>
    </div>
  );
};

export default ChatArea;