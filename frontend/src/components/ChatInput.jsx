import { useState, useRef, useEffect } from 'react';

const API_URL = (import.meta.env.VITE_API_URL || 'https://claww-ai-3.onrender.com').trim();

const ChatInput = ({ isLoading, onSendMessage, onFileProcessed, darkMode, activeCanvas, onToggleCanvas }) => {
  const [message, setMessage] = useState('');
  const [fileContext, setFileContext] = useState(null);
  const [attachedFileName, setAttachedFileName] = useState('');
  const [imageContext, setImageContext] = useState(null);
  const [isImageMode, setIsImageMode] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isCanvasMode, setIsCanvasMode] = useState(false);
  const [isVaultMode, setIsVaultMode] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const submittingRef = useRef(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [message]);

  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in your browser. Try Chrome.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      
      setMessage(prev => prev + transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setIsUploading(true);
      try {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        setImageContext(base64);
        setAttachedFileName(file.name);
      } catch (err) {
        console.error('Image read error:', err);
        alert('Failed to read image');
      } finally {
        setIsUploading(false);
      }
      return;
    }

    setAttachedFileName(file.name);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

       const controller = new AbortController();
       const timeoutId = setTimeout(() => controller.abort(), 60000);

        const response = await fetch(`${file.type === 'application/pdf' ? `${API_URL}/api/process-pdf` : `${API_URL}/api/upload`}`, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

       clearTimeout(timeoutId);

       if (!response.ok) {
         if (response.status === 413) {
           throw new Error('File too large. Maximum size is 50MB.');
         }
         throw new Error(`Upload failed: ${response.status}`);
       }

       const data = await response.json();

       if (file.type === 'application/pdf') {
         // Handle PDF response from /api/process-pdf: { text, fileName, numPages }
         onFileProcessed({
           text: data.text,
           fileName: data.fileName,
           numPages: data.numPages
         });
         setAttachedFileName('');
       } else {
         // Handle other file response from /api/upload: { message, textLength }
         // For now, we'll store a simple indication that file was processed
         setFileContext(`${data.message} (${data.textLength} characters extracted)`);
       }
    } catch (err) {
      console.error('Upload error:', err);
      alert(err.message || 'Failed to process file');
      handleRemoveFile();
    } finally {
      setIsUploading(false);
    }
  };

const handleRemoveFile = () => {
    setAttachedFileName('');
    setFileContext(null);
    setImageContext(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isLoading || submittingRef.current || !message.trim()) return;
    
    submittingRef.current = true;
    
    onSendMessage(message, fileContext, isImageMode, isSearchMode, isCodeMode, imageContext, isCanvasMode, isVaultMode);
    setMessage('');
    handleRemoveFile();
    setIsImageMode(false);
    setIsSearchMode(false);
    setIsCodeMode(false);
    setIsCanvasMode(false);
    
    setTimeout(() => {
      submittingRef.current = false;
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }, 100);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleAskAboutFile = () => {
    if (!fileContext) return;
    setMessage("What is this document about?");
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

return (
    <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-black/40 backdrop-blur-xl border-t border-white/10 px-2 md:px-4 py-3 md:py-4 z-50 shadow-[0_-4px_20px_rgba(217,70,239,0.1)]">
      <div className="max-w-[800px] mx-auto">
        {attachedFileName && imageContext && (
          <div className="mb-3 flex items-center gap-2">
            <div className={`relative flex items-center gap-2 px-3 py-2 rounded-lg border ${darkMode ? 'bg-zinc-800/60 border-zinc-700' : 'bg-zinc-100 border-zinc-200'}`}>
              <img src={imageContext} alt="Preview" className="w-10 h-10 rounded-lg object-cover border border-zinc-600" />
              <span className={`text-sm flex-1 truncate ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                {attachedFileName}
              </span>
              <span className="text-xs px-2 py-1 rounded-md bg-violet-600 text-white">
                Vision
              </span>
              <button
                type="button"
                onClick={handleRemoveFile}
                className={`p-1 rounded-md hover:bg-zinc-700 transition-all duration-300 ${darkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        {attachedFileName && !imageContext && (
          <div className="mb-3 flex items-center gap-2">
            <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border ${darkMode ? 'bg-zinc-800/60 border-zinc-700' : 'bg-zinc-100 border-zinc-200'}`}>
              <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className={`text-sm flex-1 truncate ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                {isUploading ? `Reading ${attachedFileName}...` : attachedFileName}
              </span>
              <button
                type="button"
                onClick={handleAskAboutFile}
                disabled={isUploading || !fileContext}
                className={`text-xs px-2 py-1 rounded-md bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ${isUploading ? 'hidden' : ''}`}
              >
                Ask about this
              </button>
              <button
                type="button"
                onClick={handleRemoveFile}
                disabled={isUploading}
                className={`p-1 rounded-md hover:bg-zinc-700 transition-all duration-300 ${darkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700'} disabled:opacity-50`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className={`relative flex items-end rounded-2xl border transition-all duration-300 shadow-sm ${isImageMode ? 'shadow-[0_0_15px_rgba(139,92,246,0.5)] border-violet-500/70 ring-1 ring-violet-500/30' : darkMode ? 'bg-zinc-900/80 border-zinc-700/50 hover:border-zinc-600/50 focus-within:ring-1 focus-within:ring-violet-500/50 focus-within:border-violet-500/50' : 'bg-white border-zinc-200 hover:border-zinc-300 focus-within:ring-1 focus-within:ring-violet-500/50 focus-within:border-violet-500/50'} ${isImageMode ? (darkMode ? 'bg-zinc-900/90' : 'bg-violet-50') : ''}`}>
<input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
               className={`p-3 ml-1 rounded-lg transition-all duration-300 hover:scale-110 ${darkMode ? 'text-zinc-500 hover:text-fuchsia-400 hover:bg-zinc-800' : 'text-zinc-400 hover:text-fuchsia-400 hover:bg-zinc-200'}`}
              title="Attach file"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
</svg>
            </button>
            <button
              type="button"
              onClick={() => setShowToolsMenu(prev => !prev)}
               className={`p-3 rounded-lg transition-all duration-300 hover:scale-110 ${showToolsMenu || isImageMode || isSearchMode || isCodeMode || activeCanvas || isCanvasMode || isListening ? 'text-violet-400 bg-violet-500/20' : darkMode ? 'text-zinc-500 hover:text-fuchsia-400 hover:bg-zinc-800/50' : 'text-zinc-400 hover:text-fuchsia-400 hover:bg-zinc-200'}`}
              title="Tools"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            {showToolsMenu && (
              <div className="absolute bottom-full mb-2 left-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-2 w-56 z-50">
                <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-3 py-2 uppercase tracking-wider">Tools</div>
                <button
                  onClick={() => setIsSearchMode(prev => !prev)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${isSearchMode ? 'bg-violet-500/10 text-violet-400' : darkMode ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-100'}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  Web Search
                  {isSearchMode && <span className="ml-auto w-2 h-2 rounded-full bg-violet-500" />}
                </button>
                <button
                  onClick={() => setIsCodeMode(prev => !prev)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${isCodeMode ? 'bg-violet-500/10 text-violet-400' : darkMode ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-100'}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Code Mode
                  {isCodeMode && <span className="ml-auto w-2 h-2 rounded-full bg-violet-500" />}
                </button>
                <button
                  onClick={() => setIsImageMode(prev => !prev)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${isImageMode ? 'bg-violet-500/10 text-violet-400' : darkMode ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-100'}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18l-.813-2.096L6 15l2.187-.904L9 12l.813 2.096L12 15l-2.187.904zM17.813 7.904L17 10l-.813-2.096L14 7l2.187-.904L17 4l.813 2.096L20 7l-2.187.904zM14 19l.813-2.096L17 16l-2.187-.904L14 13l-.813 2.096L11 16l2.187.904L14 19z" />
                  </svg>
                  Image Gen
                  {isImageMode && <span className="ml-auto w-2 h-2 rounded-full bg-violet-500" />}
                </button>
                <button
                  onClick={toggleListening}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${isListening ? 'bg-red-500/10 text-red-400' : darkMode ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-100'}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Voice Mode
                  {isListening && <span className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                </button>
                <button
                  onClick={() => activeCanvas ? onToggleCanvas(null) : setIsCanvasMode(prev => !prev)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${activeCanvas || isCanvasMode ? 'bg-violet-500/10 text-violet-400' : darkMode ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-100'}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                  Canvas Mode
                  {(activeCanvas || isCanvasMode) && <span className="ml-auto w-2 h-2 rounded-full bg-violet-500" />}
                </button>
                <button
                  onClick={() => setIsVaultMode(prev => !prev)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${isVaultMode ? 'bg-violet-500/10 text-violet-400' : darkMode ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-100'}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                  Vault Mode
                  {isVaultMode && <span className="ml-auto w-2 h-2 rounded-full bg-violet-500" />}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={toggleListening}
              disabled={isLoading || isUploading}
               className={`p-3 rounded-lg transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${isListening ? 'text-red-500 bg-red-500/20 animate-pulse' : darkMode ? 'text-zinc-500 hover:text-fuchsia-400 hover:bg-zinc-800/50' : 'text-zinc-400 hover:text-fuchsia-400 hover:bg-zinc-200'}`}
              title={isListening ? 'Stop recording' : 'Voice input'}
            >
              {isListening ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93h2c0 3.31 2.69 6 6 6s6-2.69 6-6h2c0 4.08-3.06 7.44-7 7.93V19h4v2H8v-2h4v-3.07z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLoading ? (isImageMode ? "Synapse AI is imagining your request..." : "AI is thinking...") : isImageMode ? "Describe the image you want to create..." : "Message Synapse AI..."}
              className={`w-full px-2 py-4 bg-transparent focus:outline-none resize-none transition-all ${darkMode ? 'text-[#fafafa] placeholder-zinc-500' : 'text-zinc-900 placeholder-zinc-400'}`}
              disabled={isLoading || isUploading}
              rows={1}
              spellCheck="false"
              autoComplete="off"
              style={{ minHeight: '56px', maxHeight: '120px' }}
            />
            <button
              type="submit"
              disabled={isLoading || isUploading || !message.trim()}
              className="m-2 p-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 active:from-violet-700 active:to-fuchsia-700 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/30 disabled:hover:shadow-none"
            >
              {isLoading ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              )}
            </button>
          </div>
        </form>
        <p className={`text-center text-xs mt-2 font-medium ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
          <span className="inline-flex items-center gap-1">
            <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${darkMode ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-200 text-zinc-600'}`}>↵</kbd>
            <span>send</span>
            <span className={`mx-1.5 ${darkMode ? 'text-zinc-700' : 'text-zinc-300'}`}>·</span>
            <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${darkMode ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-200 text-zinc-600'}`}>shift</kbd>
            <span>+</span>
            <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${darkMode ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-200 text-zinc-600'}`}>↵</kbd>
            <span>new line</span>
          </span>
        </p>
      </div>
    </div>
  );
};

export default ChatInput;
