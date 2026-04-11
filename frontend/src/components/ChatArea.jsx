import React, { useState, useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import StockCard from './StockCard';
import ChartVisualizer from './ChartVisualizer';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const SynapseChart = ({ chartData, darkMode }) => {
  const { type, data, colors = ['#8b5cf6', '#d946ef'] } = chartData;
  
  const chartColors = {
    bar: colors[0],
    line: colors[0] || '#8b5cf6',
    area: colors[0] || '#8b5cf6',
    pie: colors
  };

  const containerClass = darkMode 
    ? 'bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4' 
    : 'bg-white border border-gray-200 rounded-2xl p-4 shadow-sm';

  if (type === 'bar') {
    return (
      <div className={`${containerClass} my-4`}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#3f3f46' : '#e5e5e5'} />
            <XAxis dataKey={Object.keys(data[0] || {})[0]} stroke={darkMode ? '#71717a' : '#6b7280'} />
            <YAxis stroke={darkMode ? '#71717a' : '#6b7280'} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: darkMode ? '#18181b' : '#fff', 
                border: `1px solid ${darkMode ? '#3f3f46' : '#e5e5e5'}`,
                borderRadius: '8px'
              }}
            />
            <Bar dataKey={Object.keys(data[0] || {})[1]} fill={chartColors.bar} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'line') {
    return (
      <div className={`${containerClass} my-4`}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#3f3f46' : '#e5e5e5'} />
            <XAxis dataKey={Object.keys(data[0] || {})[0]} stroke={darkMode ? '#71717a' : '#6b7280'} />
            <YAxis stroke={darkMode ? '#71717a' : '#6b7280'} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: darkMode ? '#18181b' : '#fff', 
                border: `1px solid ${darkMode ? '#3f3f46' : '#e5e5e5'}`,
                borderRadius: '8px'
              }}
            />
            <Line type="monotone" dataKey={Object.keys(data[0] || {})[1]} stroke={chartColors.line} strokeWidth={2} dot={{ fill: chartColors.line }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'area') {
    return (
      <div className={`${containerClass} my-4`}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#3f3f46' : '#e5e5e5'} />
            <XAxis dataKey={Object.keys(data[0] || {})[0]} stroke={darkMode ? '#71717a' : '#6b7280'} />
            <YAxis stroke={darkMode ? '#71717a' : '#6b7280'} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: darkMode ? '#18181b' : '#fff', 
                border: `1px solid ${darkMode ? '#3f3f46' : '#e5e5e5'}`,
                borderRadius: '8px'
              }}
            />
            <Area type="monotone" dataKey={Object.keys(data[0] || {})[1]} stroke={chartColors.area} fill={chartColors.area} fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'pie') {
    return (
      <div className={`${containerClass} my-4`}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              dataKey={Object.values(data[0] || {})[1]}
              nameKey={Object.keys(data[0] || {})[0]}
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={chartColors.pie[index % chartColors.pie.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: darkMode ? '#18181b' : '#fff', 
                border: `1px solid ${darkMode ? '#3f3f46' : '#e5e5e5'}`,
                borderRadius: '8px'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
};

const API_URL = (import.meta.env.VITE_API_URL || 'https://claww-ai-3.onrender.com').trim();

const BrowserActionCard = ({ actionJson, darkMode }) => {
  const [status, setStatus] = useState('loading');
  const [result, setResult] = useState(null);
  const { url, task } = JSON.parse(actionJson);
  
  useEffect(() => {
    const browse = async () => {
      try {
        const res = await fetch(`${API_URL}/api/browser`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, task })
        });
        const data = await res.json();
        if (data.error) {
          setStatus('error');
        } else if (data.screenshot) {
          setStatus('complete');
          setResult(data.screenshot);
        } else {
          setStatus('complete');
        }
      } catch (err) {
        setStatus('error');
      }
    };
    browse();
  }, []);
  
  return (
    <div className={`mt-3 p-4 rounded-xl border ${darkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${status === 'loading' ? 'bg-blue-500 animate-pulse' : status === 'error' ? 'bg-red-500' : 'bg-green-500'}`} />
        <span className={darkMode ? 'text-zinc-300' : 'text-gray-700'}>
          {status === 'loading' ? '🌐 Browsing...' : status === 'error' ? '❌ Browser failed' : '✅ Browser complete'}
        </span>
        <span className="text-xs text-zinc-500 ml-auto">{url}</span>
      </div>
      {result && (
        <img src={`data:image/png;base64,${result}`} alt="Screenshot" className="w-full rounded" />
      )}
    </div>
  );
};

const EmailActionCard = ({ actionJson, darkMode }) => {
  const [status, setStatus] = useState('preparing');
  
  useEffect(() => {
    const sendEmail = async () => {
      try {
        const res = await fetch(`${API_URL}/api/action/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: actionJson
        });
        const data = await res.json();
        setStatus(data.success ? 'sent' : 'error');
      } catch (err) {
        setStatus('error');
      }
    };
    sendEmail();
  }, []);
  
  const { to } = JSON.parse(actionJson);
  
  return (
    <div className={`mt-3 p-4 rounded-xl border flex items-center gap-3 ${
      darkMode 
        ? status === 'sent' ? 'bg-green-900/20 border-green-700/50' : status === 'error' ? 'bg-red-900/20 border-red-700/50' : 'bg-violet-900/20 border-violet-700/50'
        : status === 'sent' ? 'bg-green-50 border-green-200' : status === 'error' ? 'bg-red-50 border-red-200' : 'bg-violet-50 border-violet-200'
    }`}>
      {status === 'preparing' ? (
        <>
          <span className="text-lg">📧</span>
          <span className={darkMode ? 'text-zinc-300' : 'text-zinc-700'}>
            Email preparing to send to <span className="font-medium">{to}</span>...
          </span>
          <span className="ml-auto w-3 h-3 rounded-full bg-violet-500 animate-pulse" />
        </>
      ) : status === 'sent' ? (
        <>
          <span className="text-lg">✅</span>
          <span className={darkMode ? 'text-green-400' : 'text-green-700'}>
            Email successfully sent to <span className="font-medium">{to}</span>
          </span>
        </>
      ) : (
        <>
          <span className="text-lg">❌</span>
          <span className={darkMode ? 'text-red-400' : 'text-red-700'}>
            Failed to send email to <span className="font-medium">{to}</span>
          </span>
        </>
      )}
    </div>
  );
};

const ChatArea = ({ messages, isLoading, darkMode, onOpenCanvas, currentAgentStep, sessionId, isVoiceMode, isHandsFree, selectedVoiceIndex, toolActive, toolName }) => {
  const [isListening, setIsListening] = useState(false);
  const [voices, setVoices] = useState([]);
  const recognitionRef = useRef(null);
  
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);
  
  const speak = (text) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (voices[selectedVoiceIndex]) {
      utterance.voice = voices[selectedVoiceIndex];
    }
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => {
      if (isHandsFree && isVoiceMode) {
        startListening();
      }
    };
    window.speechSynthesis.speak(utterance);
  };
  
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.log('Speech recognition not supported');
      return;
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    
    recognitionRef.current.onstart = () => setIsListening(true);
    recognitionRef.current.onend = () => setIsListening(false);
    recognitionRef.current.onerror = () => setIsListening(false);
    
    recognitionRef.current.start();
  };
  
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      window.speechSynthesis?.cancel();
    };
  }, []);
  
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && !lastMsg.isStreaming && lastMsg.sender === 'ai' && isVoiceMode && !isHandsFree) {
      const textOnly = lastMsg.text?.replace(/[#*`\[\]]/g, '').slice(0, 500);
      if (textOnly && textOnly.length > 10) {
        speak(textOnly);
      }
    }
  }, [messages, isLoading]);
  
  const chatAreaRef = useRef(null);
  const scrollAnchorRef = useRef(null);

  useEffect(() => {
    if (scrollAnchorRef.current) {
      scrollAnchorRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Check if any message is currently streaming
  const hasStreamingMessage = messages.some(msg => msg.isStreaming);

  const ToolActiveIndicator = ({ toolActive, toolName }) => {
    if (!toolActive) return null;
    const toolLabel = toolName === 'get_stock_price' ? 'Accessing Market Data...' : 'Searching the web...';
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-900/40 border border-violet-500/30">
        <span className="w-2 h-2 rounded-full bg-fuchsia-500 animate-pulse" />
        <span className="text-xs text-fuchsia-300">{toolLabel}</span>
      </div>
    );
  };

  const FeatureCard = ({ icon, title, description, darkMode }) => (
    <div 
      className="h-auto md:aspect-square w-full flex flex-col items-center justify-center text-center p-4 rounded-3xl backdrop-blur-xl border transition-all duration-500 cursor-pointer hover:scale-[1.02] bg-white/[0.03] border-white/[0.08] hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.4)] hover:border-fuchsia-500/50 hover:bg-white/[0.07]"
    >
      <div className="p-3 rounded-xl mb-3 bg-violet-500/20">
        <div className="text-violet-500 w-6 h-6">{icon}</div>
      </div>
      <h3 className="font-bold text-sm mb-1 text-[#fafafa]">
        {title}
      </h3>
      <p className="text-[11px] leading-relaxed opacity-60 text-zinc-400">
        {description}
      </p>
    </div>
  );

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

  const AgentIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );

  const FingerprintIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 8m0 0h8m-8 0c1.656-1.066 3-2.78 3-5.085a6.958 6.958 0 01-1.002-3.02 6.961 6.961 0 01-.023-3.036m-3.038 3.127l.052-.085a9.94 9.94 0 01-.032-1.372m4.244 4.803l-.085-.076a10.44 10.44 0 01-1.26-1.893l.066-.11a10.7 10.7 0 01.932-1.765m.391 2.782c-.128.397-.252.8-.37 1.208" />
    </svg>
  );

  const ChartIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );

  const MicrophoneIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );

  const StatusBanner = ({ text, darkMode, agentStep }) => {
    const activeStep = agentStep || (text ? (text.match(/\[AGENT_STEP:([^\]]+)\]/)?.[1] || 
      (text.includes('[PLANNING]') ? 'Planning' : 
       text.includes('[RESEARCHING]') ? 'Researching' : 
       text.includes('[EXECUTING]') ? 'Executing' : null)) : null);
    
    if (!activeStep) return null;
    
    return (
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
        <div className={`flex items-center gap-3 px-5 py-3 rounded-full backdrop-blur-2xl border shadow-2xl ${
          darkMode 
            ? 'bg-gradient-to-r from-violet-900/90 to-fuchsia-900/90 border-violet-600/50' 
            : 'bg-gradient-to-r from-violet-100/90 to-fuchsia-100/90 border-violet-300'
        }`}>
          <div className="relative">
            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 animate-pulse block" />
            <span className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 animate-ping opacity-75" />
          </div>
          <span className={`text-sm font-semibold bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent`}>
            {activeStep}
          </span>
        </div>
      </div>
    );
  };

  const currentStatus = messages.length > 0 ? messages[messages.length - 1].text : '';

  return (
    <div 
      ref={chatAreaRef}
      className={`flex-1 overflow-y-auto h-[calc(100vh-140px)] py-6 px-4 md:pt-6 pt-20 ${darkMode ? 'bg-[#0a0a0a]' : 'bg-zinc-50'} scrollbar-thin scrollbar-thumb-zinc-700/50 scrollbar-track-transparent`}
    >
      <div className="max-w-[800px] mx-auto space-y-4 pb-4">
        <ToolActiveIndicator toolActive={toolActive} toolName={toolName} />
        {messages.length === 0 && (
            <div className="text-center py-16">
            <div className="mb-8">
              <div className="flex justify-center mb-6">
                <SynapseLogo className="w-20 h-20 text-violet-500" glow={true} />
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tighter bg-gradient-to-b from-white via-white to-zinc-500 bg-clip-text text-transparent mb-2">
                Welcome to Synapse AI
              </h1>
              <p className="text-lg text-zinc-500">
                How can I help you today?
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mt-8 pb-32">
              <FeatureCard 
                icon={<SynapseLogo />}
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
                title="Multiplayer Canvas"
                description="Real-time collaborative coding with inviteable friends."
                darkMode={darkMode}
              />
              <FeatureCard 
                icon={<DatabaseIcon />}
                title="100-Page PDF Vault"
                description="Advanced RAG for deep analysis of massive documents."
                darkMode={darkMode}
              />
              <FeatureCard 
                icon={<AgentIcon />}
                title="Browser Agent"
                description="AI that browses live websites and extracts data."
                darkMode={darkMode}
              />
              <FeatureCard 
                icon={<ChartIcon />}
                title="Visual Flowcharts"
                description="Generate Mermaid.js diagrams and charts instantly."
                darkMode={darkMode}
              />
              <FeatureCard 
                icon={<MicrophoneIcon />}
                title="Voice Mode"
                description="Hands-free interaction with native speech-to-text."
                darkMode={darkMode}
              />
              <FeatureCard 
                icon={<FingerprintIcon />}
                title="Persona Memory"
                description="A tailored experience that remembers who you are."
                darkMode={darkMode}
              />
            </div>
          </div>
        )}
        
        {messages.map((message) => {
          const hasChartData = message.text && message.text.includes('```chart-data');
          let chartData = null;
          let emailActionJson = null;
          let displayText = message.text;
          
          if (hasChartData) {
            try {
              const chartMatch = message.text.match(/```chart-data\n([\s\S]*?)```/);
              if (chartMatch) {
                chartData = JSON.parse(chartMatch[1]);
              }
            } catch (e) {
              console.error('Chart parse error:', e);
            }
          }
          
          // Parse and clean email action from text
          const emailMatch = message.text?.match(/\[EMAIL_ACTION:\s*(\{.*?\})\]/s);
          if (emailMatch) {
            try {
              emailActionJson = emailMatch[1];
              displayText = message.text.replace(emailMatch[0], '');
            } catch (e) {
              console.error('Email action parse error:', e);
            }
          }
          
          // Parse and clean browser action from text
          const browserMatch = message.text?.match(/\[BROWSER_ACTION:\s*(\{.*?\})\]/s);
          let browserActionJson = null;
          if (browserMatch) {
            try {
              browserActionJson = browserMatch[1];
              displayText = message.text.replace(browserMatch[0], '');
            } catch (e) {
              console.error('Browser action parse error:', e);
            }
          }
          
          // Parse stock metadata from message
          let stockData = null;
          const stockMatch = message.text?.match(/\[STOCK_DATA:\s*(\{.*?\})\]/s);
          if (stockMatch) {
            try {
              stockData = JSON.parse(stockMatch[1]);
              displayText = message.text.replace(stockMatch[0], '');
            } catch (e) {
              console.error('Stock data parse error:', e);
            }
          }
          
          return (
            <div key={message.id}>
              {message.metadata?.chartData && (
                <ChartVisualizer 
                  data={message.metadata.chartData.data} 
                  type={message.metadata.chartData.type} 
                />
              )}
              {stockData && (
                <StockCard 
                  symbol={stockData.symbol} 
                  price={stockData.price} 
                  change={stockData.change} 
                  percentChange={stockData.percentChange}
                  companyName={stockData.companyName}
                />
              )}
              {chartData ? (
                <SynapseChart chartData={chartData} darkMode={darkMode} />
              ) : (
                <MessageBubble 
                  message={{ ...message, text: displayText }} 
                  darkMode={darkMode} 
                  onOpenCanvas={onOpenCanvas} 
                  sessionId={sessionId}
                />
              )}
              {emailActionJson && <EmailActionCard actionJson={emailActionJson} darkMode={darkMode} />}
              {browserActionJson && <BrowserActionCard actionJson={browserActionJson} darkMode={darkMode} />}
            </div>
          );
        })}

        <StatusBanner text={currentStatus} darkMode={darkMode} agentStep={currentAgentStep} />
        
        {isVoiceMode && (
          <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2 rounded-full backdrop-blur-xl ${darkMode ? 'bg-zinc-900/90 border border-zinc-700' : 'bg-white/90 border border-gray-200'}`}>
            <button
              onClick={isListening ? () => recognitionRef.current?.stop() : startListening}
              className={`p-2 rounded-full transition-all ${isListening ? 'bg-red-500 animate-pulse' : 'bg-violet-600 hover:bg-violet-500'}`}
              title={isListening ? 'Stop listening' : 'Start voice input'}
            >
              <MicrophoneIcon />
            </button>
            
            <button
              onClick={() => setIsHandsFree(!isHandsFree)}
              className={`px-3 py-1.5 text-xs rounded-full transition-all ${isHandsFree ? 'bg-green-600 text-white' : darkMode ? 'bg-zinc-700 text-zinc-300' : 'bg-gray-200 text-gray-600'}`}
              title={isHandsFree ? 'Hands-free mode ON' : 'Hands-free mode OFF'}
            >
              {isHandsFree ? '🤖 Auto' : '🎤 Manual'}
            </button>
            
            <select
              value={selectedVoiceIndex}
              onChange={(e) => setSelectedVoiceIndex(Number(e.target.value))}
              className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-gray-100 text-gray-600'}`}
            >
              {voices.slice(0, 10).map((voice, i) => (
                <option key={i} value={i}>{voice.name.split(' ')[0]}</option>
              ))}
            </select>
          </div>
        )}
        
        <div ref={scrollAnchorRef} />
      </div>
    </div>
  );
};

export default ChatArea;