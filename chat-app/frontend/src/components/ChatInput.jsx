import { useState, useRef, useEffect } from 'react';

const ChatInput = ({ isLoading, onSendMessage, darkMode }) => {
  const [message, setMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
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

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in your browser. Try Chrome.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
      return;
    }

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      
      setMessage(prev => prev + transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTextTypes = ['.txt', '.pdf'];
    const validImageTypes = ['.png', '.jpg', '.jpeg'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validTextTypes.includes(ext) && !validImageTypes.includes(ext)) {
      alert('Please select a .txt, .pdf, .png, or .jpg file');
      return;
    }

    setAttachedFile(file);
    setIsUploading(true);

    try {
      // Handle images - convert to base64 for vision model
      if (validImageTypes.includes(ext)) {
        const reader = new FileReader();
        await new Promise((resolve, reject) => {
          reader.onload = () => {
            const base64 = reader.result;
            setFileContent(`[IMAGE:${file.name}]\n${base64}`);
            resolve();
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        setIsUploading(false);
        return;
      }

      // Send text/PDF to backend for processing
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setFileContent(data.content);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to process file');
      handleRemoveFile();
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
    setFileContent('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isLoading || submittingRef.current || !message.trim()) return;
    
    submittingRef.current = true;
    
    onSendMessage(message, fileContent);
    setMessage('');
    handleRemoveFile();
    
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
    if (!fileContent) return;
    const prompt = `Can you analyze this file and answer questions about it? Here's the content:\n\n${fileContent}`;
    setMessage(prompt);
  };

  return (
    <div className={`sticky bottom-0 border-t px-4 py-4 ${darkMode ? 'border-zinc-800/30 bg-[#0a0a0a]/95' : 'border-zinc-200 bg-white/95'} backdrop-blur-md`}>
      <div className="max-w-[800px] mx-auto">
        {attachedFile && (
          <div className="mb-3 flex items-center gap-2">
            <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg ${darkMode ? 'bg-zinc-800/60' : 'bg-zinc-100'}`}>
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className={`text-sm flex-1 truncate ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                {isUploading ? 'Processing...' : attachedFile.name}
              </span>
              <button
                type="button"
                onClick={handleAskAboutFile}
                disabled={isUploading || !fileContent}
                className={`text-xs px-2 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isUploading ? 'hidden' : ''}`}
              >
                Ask about this
              </button>
              <button
                type="button"
                onClick={handleRemoveFile}
                disabled={isUploading}
                className={`p-1 rounded-md hover:bg-zinc-700 ${darkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700'} disabled:opacity-50`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className={`relative flex items-end rounded-2xl border transition-all duration-200 shadow-sm ${darkMode ? 'bg-zinc-900/80 border-zinc-700/50 hover:border-zinc-600/50 focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20' : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20'}`}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf,.png,.jpg,.jpeg"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-3 ml-1 rounded-lg transition-colors ${darkMode ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200'}`}
              title="Attach file"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleVoiceInput}
              disabled={isLoading || isUploading}
              className={`p-3 rounded-lg transition-colors ${isRecording ? 'text-red-500 bg-red-500/10' : darkMode ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
              title={isRecording ? 'Stop recording' : 'Voice input'}
            >
              {isRecording ? (
                <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
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
              placeholder={isLoading ? "AI is thinking..." : "Message Claw AI..."}
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
              className="m-2 p-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:shadow-emerald-600/30 disabled:hover:shadow-none"
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