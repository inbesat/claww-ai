import React, { useState, useRef, useEffect } from 'react';

const themes = [
  { id: 'cyberpunk', name: 'Cyberpunk', from: 'from-fuchsia-600', to: 'to-violet-600', text: 'text-white' },
  { id: 'forest', name: 'Forest', from: 'from-emerald-600', to: 'to-teal-600', text: 'text-white' },
  { id: 'minimal', name: 'Minimal', from: 'from-zinc-500', to: 'to-zinc-600', text: 'text-white' },
  { id: 'matrix', name: 'Matrix', from: 'from-green-600', to: 'to-green-400', text: 'text-black' },
  { id: 'vaporwave', name: 'Vaporwave', from: 'from-pink-500', to: 'to-cyan-400', text: 'text-black' },
  { id: 'nord', name: 'Nord', from: 'from-sky-600', to: 'to-blue-600', text: 'text-white' },
  { id: 'bloodmoon', name: 'Blood Moon', from: 'from-red-700', to: 'to-red-900', text: 'text-white' },
  { id: 'solareclipse', name: 'Eclipse', from: 'from-yellow-400', to: 'to-orange-500', text: 'text-black' },
  { id: 'ocean', name: 'Ocean', from: 'from-cyan-400', to: 'to-blue-600', text: 'text-white' },
];

const tonePresets = [
  { label: "Default ⚡️", prompt: "" },
  { label: "Hacker", prompt: "Act as an elite, sarcastic cybersecurity hacker. Keep answers technical and edgy." },
  { label: "Funny Friend", prompt: "Act as my hilarious best friend. Use slang, make jokes, and keep the vibe super casual and fun." },
  { label: "Cute GF 💖", prompt: "Act as my sweet, supportive, and cute girlfriend. Use emojis, be affectionate, and ask how my day is going." }
];

const Sidebar = ({ sessionId, chatHistory, onNewChat, onSelectChat, onDeleteChat, onRenameChat, darkMode, setDarkMode, isCollapsed, onToggleCollapse, isMobileOpen, onCloseMobile, onOpenCodex, aiTone, setAiTone, theme, setTheme, macros, setMacros, temperature, setTemperature, memoryDepth, setMemoryDepth, fontStyle, setFontStyle, useLocalLlm, setUseLocalLlm, isNotebookMode, setIsNotebookMode, handleNotebookToggle }) => {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [isUploadingVault, setIsUploadingVault] = useState(false);
  const [persona, setPersona] = useState('');
  const [isSavingPersona, setIsSavingPersona] = useState(false);
  const [openSections, setOpenSections] = useState({ identity: false, vault: false, persona: false, theme: false, macros: false, engine: false, sync: false });
  const vaultInputRef = useRef(null);

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

   useEffect(() => {
     const API_URL = (import.meta.env.VITE_API_URL || 'https://claww-ai-3.onrender.com').trim();
     fetch(`${API_URL}/api/persona`)
       .then(res => res.json())
       .then(data => setPersona(data.persona || ''))
       .catch(console.error);
   }, []);

  const handlePersonaChange = (e) => setPersona(e.target.value);

       const handleSavePersona = async () => {
     setIsSavingPersona(true);
     try {
       const API_URL = (import.meta.env.VITE_API_URL || 'https://claww-ai-3.onrender.com').trim();
       await fetch(`${API_URL}/api/persona`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ persona }),
       });
     } catch (err) {
       console.error('Failed to save persona:', err);
     } finally {
       setIsSavingPersona(false);
     }
   };

  const handleVaultUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const fileSize = file.size / 1024 / 1024;
    const isLargeFile = fileSize > 10;
    
    setIsUploadingVault(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('file', files[i]);
    }

     // Create AbortController with 60 second timeout
     const controller = new AbortController();
     const timeoutId = setTimeout(() => controller.abort(), 60000);

     try {
       const API_URL = (import.meta.env.VITE_API_URL || 'https://claww-ai-3.onrender.com').trim();
       const response = await fetch(`${API_URL}/api/vault/upload`, {
         method: 'POST',
         body: formData,
         signal: controller.signal,
       });
      clearTimeout(timeoutId);
      
      const data = await response.json();
      if (data.success) {
        console.log(`Uploaded ${data.chunks} chunks from ${data.filename}`);
      } else {
        if (response.status === 503) {
          alert('Server Busy - Please try with a smaller file or wait a moment');
        } else {
          alert(data.error || 'Upload failed');
        }
      }
    } catch (err) {
      console.error('Vault upload error:', err);
      if (err.name === 'AbortError') {
        alert('Upload timed out - the document is very large. Please try a smaller file.');
      } else {
        alert('Failed to upload to vault');
      }
    } finally {
      clearTimeout(timeoutId);
      setIsUploadingVault(false);
      if (vaultInputRef.current) vaultInputRef.current.value = '';
    }
  };

  const handleStartEdit = (e, chat) => {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditTitle(chat.title);
  };

  const handleSaveEdit = (chatId) => {
    if (editTitle.trim()) {
      onRenameChat(chatId, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleKeyDown = (e, chatId) => {
    if (e.key === 'Enter') {
      handleSaveEdit(chatId);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  const handleDelete = (e, chatId) => {
    e.stopPropagation();
    onDeleteChat(chatId);
  };

  const handleExport = () => {
    const configData = {
      theme,
      fontStyle,
      macros,
      temperature,
      memoryDepth,
      aiTone,
      persona
    };
    const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'synapse-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.theme) { setTheme(parsed.theme); localStorage.setItem('theme', parsed.theme); document.documentElement.setAttribute('data-theme', parsed.theme); }
        if (parsed.fontStyle) { setFontStyle(parsed.fontStyle); localStorage.setItem('synapse_font', parsed.fontStyle); }
        if (parsed.macros) { setMacros(parsed.macros); localStorage.setItem('synapse_macros', JSON.stringify(parsed.macros)); }
        if (parsed.temperature !== undefined) { setTemperature(parsed.temperature); localStorage.setItem('synapse_temp', parsed.temperature.toString()); }
        if (parsed.memoryDepth !== undefined) { setMemoryDepth(parsed.memoryDepth); localStorage.setItem('synapse_memory', parsed.memoryDepth.toString()); }
        if (parsed.aiTone !== undefined) { setAiTone(parsed.aiTone); localStorage.setItem('ai_tone', parsed.aiTone); }
        if (parsed.persona) { setPersona(parsed.persona); }
        alert('Profile synced successfully!');
      } catch (err) {
        alert('Invalid config file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

const SynapseLogo = ({ className = "w-6 h-6", glow = false }) => (
  <div className={`relative flex items-center justify-center ${glow ? 'after:absolute after:inset-0 after:bg-[var(--accent-primary)]/30 after:blur-xl after:rounded-full' : ''}`}>
    <svg className={`${className} relative z-10`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="var(--accent-primary)" strokeWidth="1" strokeOpacity="0.1" />
      <circle cx="12" cy="12" r="8" stroke="var(--accent-primary)" strokeWidth="1.5" strokeOpacity="0.4" strokeDasharray="4 2" />
      <path d="M12 4V8M12 16V20M4 12H8M16 12H20" stroke="var(--accent-primary)" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.6"/>
      <path d="M12 8.5L15.5 12L12 15.5L8.5 12L12 8.5Z" fill="var(--accent-primary)" className="animate-pulse" />
    </svg>
  </div>
);

return (
    <div className={`flex flex-col h-full transition-all`} style={{ backgroundColor: 'var(--theme-bg)' }}>
      <div className={`flex items-center gap-2 px-2 py-4 ${isCollapsed ? 'justify-center' : ''}`}>
        {isMobileOpen ? (
          <button
            onClick={onCloseMobile}
            className="p-2 rounded-lg hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <button
            onClick={onToggleCollapse}
            className={`p-2 rounded-lg hover:bg-zinc-800/50 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-all duration-200 ${isCollapsed ? '' : ''}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <SynapseLogo className={`${isCollapsed ? 'w-8 h-8' : 'w-8 h-8'}`} glow />
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </button>
        {!isCollapsed && (
          <>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] bg-clip-text text-transparent">
              Synapse
            </span>
            <div className="ml-4 flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full cursor-pointer hover:bg-white/10 transition-all" onClick={() => handleNotebookToggle?.()}>
              <svg className={`w-4 h-4 ${isNotebookMode ? 'text-emerald-400' : 'text-zinc-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className={`text-xs font-bold ${isNotebookMode ? 'text-emerald-400' : 'text-zinc-500'}`}>Notebook</span>
            </div>
          </>
        )}
      </div>
      
      <div className="px-3">
        <button 
          onClick={onNewChat}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl transition-all duration-300 text-sm font-light hover:shadow-lg active:scale-[0.98] border-none ${isCollapsed ? 'w-12 h-12 p-0' : ''}`}
          style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', boxShadow: '0 4px 15px var(--glow-color)' }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          {!isCollapsed && "New Chat"}
        </button>
      </div>

{!isCollapsed && (
        <div className="px-3 mt-4">
          <div className="rounded-xl border border-white/10 bg-[var(--theme-bg-subtle)]/50 backdrop-blur-md">
            <button
              onClick={() => toggleSection('vault')}
              className="w-full flex items-center justify-between px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s8-1.79 8-4" />
                </svg>
                <span className="text-xs font-medium" style={{ color: 'var(--theme-text)' }}>Knowledge Vault</span>
              </div>
              <svg className={`w-4 h-4 transition-transform duration-200 ${openSections.vault ? 'rotate-180' : ''}`} style={{ color: 'var(--theme-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openSections.vault && (
              <div className="px-3 pb-3">
                <input
                  ref={vaultInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.txt,.docx"
                  onChange={handleVaultUpload}
                  className="hidden"
                  id="vault-upload"
                />
                <label
                  htmlFor="vault-upload"
                  className={`block w-full text-center text-xs py-2 rounded-lg cursor-pointer transition-all duration-200 ${
                    isUploadingVault 
                      ? 'bg-zinc-700/50 text-zinc-400 cursor-wait'
                      : 'bg-[var(--theme-bg-subtle)] hover:bg-[var(--theme-border)] text-[var(--theme-text)] border'
                  }`}
                >
                  {isUploadingVault ? 'Indexing 100+ pages... 📚' : 'Add Documents'}
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {!isCollapsed && (
        <div className="px-3 mt-2">
          <div className="flex items-center justify-center gap-2 py-1.5 rounded-lg bg-zinc-900/30 border border-zinc-800/50">
            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 animate-pulse" />
            <span className="text-[10px] text-zinc-500">System Online</span>
          </div>
        </div>
      )}

      {!isCollapsed && (
        <div className="px-3 mt-4">
          <div className="rounded-xl border bg-[var(--theme-bg-subtle)]/50 backdrop-blur-md" style={{ borderColor: 'var(--theme-border)' }}>
            <button
              onClick={() => toggleSection('identity')}
              className="w-full flex items-center justify-between px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 8m0 0h8m-8 0c1.656-1.066 3-2.78 3-5.085a6.958 6.958 0 01-1.002-3.02 6.961 6.961 0 01-.023-3.036m-3.038 3.127l.052-.085a9.94 9.94 0 01-.032-1.372m4.244 4.803l-.085-.076a10.44 10.44 0 01-1.26-1.893l.066-.11a10.7 10.7 0 01.932-1.765m.391 2.782c-.128.397-.252.8-.37 1.208" />
                </svg>
                <span className="text-xs font-medium" style={{ color: 'var(--theme-text)' }}>Personal Identity</span>
              </div>
              <svg className={`w-4 h-4 transition-transform duration-200 ${openSections.identity ? 'rotate-180' : ''}`} style={{ color: 'var(--theme-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openSections.identity && (
              <div className="px-3 pb-3">
                <textarea
                  value={persona}
                  onChange={handlePersonaChange}
                  placeholder="I am a developer, use friendly tone..."
                  className="w-full text-xs p-2 rounded-lg resize-none border bg-[var(--theme-bg-subtle)] border-[var(--theme-border)] text-[var(--theme-text)] placeholder-[var(--theme-text-muted)]"
                  rows={2}
                />
                <button
                  onClick={handleSavePersona}
                  disabled={isSavingPersona}
                  className="mt-2 w-full text-xs py-1.5 rounded-lg transition-all bg-[var(--accent-primary)] text-white hover:opacity-90"
                >
                  {isSavingPersona ? 'Saved!' : 'Save Identity'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {!isCollapsed && (
        <div className="px-3 mt-4">
          <div className="rounded-xl border border-white/10 bg-[var(--theme-bg-subtle)]/50 backdrop-blur-md">
            <button
              onClick={() => toggleSection('macros')}
              className="w-full flex items-center justify-between px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
                <span className="text-xs font-medium" style={{ color: 'var(--theme-text)' }}>Slash Commands</span>
              </div>
              <svg className={`w-4 h-4 transition-transform duration-200 ${openSections.macros ? 'rotate-180' : ''}`} style={{ color: 'var(--theme-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openSections.macros && (
              <div className="px-3 pb-3">
                <div className="flex flex-col gap-2 mb-3">
                  {macros.map((macro, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono text-[var(--accent-primary)] truncate">{macro.command}</div>
                        <div className="text-[10px] text-[var(--theme-text-muted)] truncate">{macro.prompt}</div>
                      </div>
                      <button
                        onClick={() => setMacros(macros.filter((_, i) => i !== idx))}
                        className="p-1 rounded hover:bg-red-500/20 text-red-400 shrink-0"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Command"
                    className="flex-1 text-xs p-1.5 rounded border bg-[var(--theme-bg-subtle)] border-[var(--theme-border)] text-[var(--theme-text)] placeholder-[var(--theme-text-muted)]"
                    id="new-macro-command"
                  />
                  <input
                    type="text"
                    placeholder="Prompt"
                    className="flex-1 text-xs p-1.5 rounded border bg-[var(--theme-bg-subtle)] border-[var(--theme-border)] text-[var(--theme-text)] placeholder-[var(--theme-text-muted)]"
                    id="new-macro-prompt"
                  />
                  <button
                    onClick={() => {
                      const cmd = document.getElementById('new-macro-command').value.trim();
                      const pr = document.getElementById('new-macro-prompt').value.trim();
                      if (cmd && pr) {
                        setMacros([...macros, { command: cmd.startsWith('/') ? cmd : '/' + cmd, prompt: pr }]);
                        document.getElementById('new-macro-command').value = '';
                        document.getElementById('new-macro-prompt').value = '';
                      }
                    }}
                    className="px-3 py-1 text-xs rounded bg-[var(--accent-primary)] text-white hover:opacity-90"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!isCollapsed && (
        <div className="px-3 mt-4">
          <div className="rounded-xl border border-white/10 bg-[var(--theme-bg-subtle)]/50 backdrop-blur-md">
            <button
              onClick={() => toggleSection('engine')}
              className="w-full flex items-center justify-between px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-xs font-medium" style={{ color: 'var(--theme-text)' }}>Engine Room</span>
              </div>
              <svg className={`w-4 h-4 transition-transform duration-200 ${openSections.engine ? 'rotate-180' : ''}`} style={{ color: 'var(--theme-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openSections.engine && (
              <div className="px-3 pb-3 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-[var(--theme-text-muted)]">Creativity</span>
                    <span className="text-[10px] font-mono text-[var(--accent-primary)]">{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-[var(--theme-border)] accent-[var(--accent-primary)]"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-[var(--theme-text-muted)]">Logical</span>
                    <span className="text-[9px] text-[var(--theme-text-muted)]">Chaotic</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-[var(--theme-text-muted)]">Memory Depth</span>
                    <span className="text-[10px] font-mono text-[var(--accent-primary)]">{memoryDepth}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={memoryDepth}
                    onChange={(e) => setMemoryDepth(parseInt(e.target.value))}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-[var(--theme-border)] accent-[var(--accent-primary)]"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-[var(--theme-text-muted)]">Retaining last {memoryDepth} messages</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-[var(--theme-border)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-[var(--theme-text-muted)]">Offline Mode (Ollama)</span>
                    <span className={`text-[10px] font-mono ${useLocalLlm ? 'text-green-400' : 'text-[var(--theme-text-muted)]'}`}>
                      {useLocalLlm ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <button
                    onClick={() => setUseLocalLlm?.(!useLocalLlm)}
                    className={`w-full py-2 rounded-lg text-xs font-medium transition-all ${
                      useLocalLlm 
                        ? 'bg-[var(--accent-primary)] text-white shadow-lg' 
                        : 'bg-[var(--theme-bg-subtle)] text-[var(--theme-text-muted)] border border-[var(--theme-border)]'
                    }`}
                  >
                    {useLocalLlm ? '🟢 Using Local Llama3' : '🔴 Using Cloud API'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!isCollapsed && (
        <div className="px-3 mt-4">
          <div className="rounded-xl border border-white/10 bg-[var(--theme-bg-subtle)]/50 backdrop-blur-md">
            <button
              onClick={() => toggleSection('theme')}
              className="w-full flex items-center justify-between px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                <span className="text-xs font-medium" style={{ color: 'var(--theme-text)' }}>Theme / Vibe</span>
              </div>
              <svg className={`w-4 h-4 transition-transform duration-200 ${openSections.theme ? 'rotate-180' : ''}`} style={{ color: 'var(--theme-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openSections.theme && (
              <div className="px-3 pb-3">
                <div className="grid grid-cols-2 gap-2">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { document.documentElement.setAttribute('data-theme', t.id); setTheme?.(t.id); }}
                      className={`w-full py-2 text-xs font-bold rounded-lg text-center bg-gradient-to-r ${t.from} ${t.to} ${t.text} hover:opacity-90 transition-all ${theme === t.id ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-[var(--theme-text-muted)] uppercase mb-2 mt-4">Typography</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFontStyle?.('sans')}
                    className={`flex-1 py-1.5 text-[10px] rounded-lg transition-all ${fontStyle === 'sans' ? 'ring-1 ring-[var(--accent-primary)] bg-[var(--accent-primary)]/20 text-[var(--theme-text)]' : 'bg-[var(--theme-bg-subtle)] text-[var(--theme-text-muted)] border border-[var(--theme-border)]'}`}
                  >
                    Clean
                  </button>
                  <button
                    onClick={() => setFontStyle?.('mono')}
                    className={`flex-1 py-1.5 text-[10px] rounded-lg transition-all ${fontStyle === 'mono' ? 'ring-1 ring-[var(--accent-primary)] bg-[var(--accent-primary)]/20 text-[var(--theme-text)]' : 'bg-[var(--theme-bg-subtle)] text-[var(--theme-text-muted)] border border-[var(--theme-border)]'}`}
                  >
                    Terminal
                  </button>
                  <button
                    onClick={() => setFontStyle?.('space')}
                    className={`flex-1 py-1.5 text-[10px] rounded-lg transition-all ${fontStyle === 'space' ? 'ring-1 ring-[var(--accent-primary)] bg-[var(--accent-primary)]/20 text-[var(--theme-text)]' : 'bg-[var(--theme-bg-subtle)] text-[var(--theme-text-muted)] border border-[var(--theme-border)]'}`}
                  >
                    Sci-Fi
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!isCollapsed && (
        <div className="px-3 mt-4">
          <div className="rounded-xl border border-white/10 bg-[var(--theme-bg-subtle)]/50 backdrop-blur-md">
            <button
              onClick={() => toggleSection('persona')}
              className="w-full flex items-center justify-between px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387.477a2 2 0 00-1.186 1.186l-.477 2.387a2 2 0 01-.547 1.022l.001.002a2 2 0 001.545.546l2.387-.477a2 2 0 001.186-1.186l.477-2.387a2 2 0 01.547-1.022l.002-.002zM15.5 7.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
                </svg>
                <span className="text-xs font-medium" style={{ color: 'var(--theme-text)' }}>AI Persona & Tone</span>
              </div>
              <svg className={`w-4 h-4 transition-transform duration-200 ${openSections.persona ? 'rotate-180' : ''}`} style={{ color: 'var(--theme-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openSections.persona && (
              <div className="px-3 pb-3">
                <div className="flex flex-wrap gap-2 mb-3">
                  {tonePresets.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setAiTone(preset.prompt)}
                      className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-[var(--accent-primary)]/30 hover:border-[var(--accent-primary)]/50 transition-colors text-zinc-300 hover:text-white"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value)}
                  placeholder="e.g., Act as a senior Python developer and be concise."
                  className="w-full text-xs p-2 rounded-lg resize-none border bg-[var(--theme-bg-subtle)] border-[var(--theme-border)] text-[var(--theme-text)] placeholder-[var(--theme-text-muted)]"
                  rows={2}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {!isCollapsed && (
        <div className="px-3 mt-4">
          <div className="rounded-xl border border-white/10 bg-[var(--theme-bg-subtle)]/50 backdrop-blur-md">
            <button
              onClick={() => toggleSection('sync')}
              className="w-full flex items-center justify-between px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-xs font-medium" style={{ color: 'var(--theme-text)' }}>Profile Sync</span>
              </div>
              <svg className={`w-4 h-4 transition-transform duration-200 ${openSections.sync ? 'rotate-180' : ''}`} style={{ color: 'var(--theme-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openSections.sync && (
              <div className="px-3 pb-3">
                <input
                  type="file"
                  accept=".json"
                  id="config-upload"
                  className="hidden"
                  onChange={handleImport}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleExport}
                    className="flex-1 text-xs py-2 rounded-lg cursor-pointer transition-all bg-[var(--theme-bg-subtle)] hover:bg-[var(--theme-border)] text-[var(--theme-text)] border border-[var(--theme-border)]"
                  >
                    Export Config
                  </button>
                  <label
                    htmlFor="config-upload"
                    className="flex-1 text-xs py-2 rounded-lg cursor-pointer transition-all text-center bg-[var(--theme-bg-subtle)] hover:bg-[var(--theme-border)] text-[var(--theme-text)] border border-[var(--theme-border)]"
                  >
                    Import Config
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={`flex-1 overflow-y-auto mt-6 ${isCollapsed ? '-mx-2 px-2' : '-mx-3 px-3'}`}>
        {!isCollapsed && (
          <h2 className={`mb-3 text-xs font-light uppercase tracking-wider pl-3 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Recent</h2>
        )}
        <div className={`space-y-1.5 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          {chatHistory.map(chat => (
            <div 
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-all duration-200 cursor-pointer ${
                chat.id === sessionId 
                  ? 'bg-[var(--theme-bg-subtle)] text-[var(--theme-text)] border shadow-sm hover:shadow-md' 
                  : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-subtle)] hover:text-[var(--theme-text)]'
              } ${isCollapsed ? 'justify-center px-2 w-14' : ''}`} style={{ borderColor: 'var(--theme-border)' }}
            >
              {isCollapsed ? (
                <svg className="w-5 h-5 shrink-0 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                  {editingId === chat.id ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => handleSaveEdit(chat.id)}
                      onKeyDown={(e) => handleKeyDown(e, chat.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 bg-transparent border-none outline-none text-inherit"
                      autoFocus
                    />
                  ) : (
                    <div className="flex-1 truncate font-light">{chat.title}</div>
                  )}
                </>
              )}
              {!isCollapsed && (
                <div className={`absolute right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${editingId === chat.id ? 'hidden' : ''}`}>
                <button
                  onClick={(e) => handleStartEdit(e, chat)}
                  className="p-1 rounded hover:bg-zinc-500/20"
                  title="Rename"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => handleDelete(e, chat.id)}
                  className="p-1 rounded hover:bg-red-500/20 text-red-400"
                  title="Delete"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </div>
                )}
              </div>
            ))}
          {chatHistory.length === 0 && !isCollapsed && (
            <p className={`text-sm px-3 py-2 font-light ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>No conversations yet</p>
          )}
        </div>
      </div>
      
      <div className="pt-4 border-t mt-4 flex flex-col gap-2">
        <button
          onClick={onOpenCodex}
          className="flex items-center justify-center gap-2 py-3 px-3 rounded-lg text-xs font-bold text-white transition-all"
          style={{ background: 'linear-gradient(to right, var(--accent-secondary), transparent)', borderLeft: '4px solid var(--accent-primary)', boxShadow: '0 0 15px var(--glow-color)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Synapse User Guide
        </button>
        <p className={`text-xs text-center font-light tracking-wide ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>Claw AI v1.0</p>
      </div>
    </div>
  );
};

export default Sidebar;