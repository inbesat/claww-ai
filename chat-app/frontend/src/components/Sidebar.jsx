import React, { useState, useRef, useEffect } from 'react';

const Sidebar = ({ sessionId, chatHistory, onNewChat, onSelectChat, onDeleteChat, onRenameChat, darkMode, isCollapsed, onToggleCollapse, isMobileOpen, onCloseMobile }) => {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [isUploadingVault, setIsUploadingVault] = useState(false);
  const [persona, setPersona] = useState('');
  const [isSavingPersona, setIsSavingPersona] = useState(false);
  const vaultInputRef = useRef(null);

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    fetch(`${API_URL}/api/persona`)
      .then(res => res.json())
      .then(data => setPersona(data.persona || ''))
      .catch(console.error);
  }, []);

  const handlePersonaChange = (e) => setPersona(e.target.value);

  const handleSavePersona = async () => {
    setIsSavingPersona(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
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
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
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
    <div className={`flex flex-col h-full transition-all ${darkMode ? 'bg-[#0a0a0a]' : 'bg-white'}`}>
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
        <SynapseLogo className={`${isCollapsed ? 'w-8 h-8' : 'w-8 h-8'} text-violet-500 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]`} />
        {!isCollapsed && (
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            Synapse
          </span>
        )}
      </div>
      
      <div className="px-3">
        <button 
          onClick={onNewChat}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl transition-all duration-300 text-sm font-light hover:shadow-lg hover:shadow-violet-500/20 active:scale-[0.98] border-none ${isCollapsed ? 'w-12 h-12 p-0' : ''}`}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          {!isCollapsed && "New Chat"}
        </button>
      </div>

      {!isCollapsed && (
        <div className="px-3 mt-4">
          <div className="p-3 rounded-xl border border-white/10 bg-zinc-900/50 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              <span className="text-xs font-medium text-zinc-300">Knowledge Vault</span>
            </div>
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
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/5'
              }`}
            >
              {isUploadingVault ? 'Indexing 100+ pages... this may take a minute 📚' : 'Add Documents'}
            </label>
          </div>
        </div>
      )}

      {!isCollapsed && (
        <div className="px-3 mt-4">
          <div className="p-3 rounded-xl border border-white/10 bg-zinc-900/50 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 8m0 0h8m-8 0c1.656-1.066 3-2.78 3-5.085a6.958 6.958 0 01-1.002-3.02 6.961 6.961 0 01-.023-3.036m-3.038 3.127l.052-.085a9.94 9.94 0 01-.032-1.372m4.244 4.803l-.085-.076a10.44 10.44 0 01-1.26-1.893l.066-.11a10.7 10.7 0 01.932-1.765m.391 2.782c-.128.397-.252.8-.37 1.208" />
              </svg>
              <span className="text-xs font-medium text-zinc-300">Personal Identity</span>
            </div>
            <textarea
              value={persona}
              onChange={handlePersonaChange}
              placeholder="I am a developer, use friendly tone..."
              className="w-full text-xs p-2 rounded-lg resize-none border bg-zinc-800/50 border-white/10 text-zinc-300 placeholder-zinc-500"
              rows={2}
            />
            <button
              onClick={handleSavePersona}
              disabled={isSavingPersona}
              className={`mt-2 w-full text-xs py-1.5 rounded-lg transition-all ${
                isSavingPersona
                  ? 'bg-zinc-700 text-zinc-400'
                  : 'bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white hover:from-fuchsia-500 hover:to-violet-500 shadow-lg shadow-fuchsia-500/20'
              }`}
            >
              {isSavingPersona ? 'Saved!' : 'Save Identity'}
            </button>
          </div>
        </div>
      )}

      {!isCollapsed && (
        <div className="px-3 mt-4">
          <div className={`p-3 rounded-xl border ${darkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-white'}`}>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 8m0 0h8m-8 0c1.656-1.066 3-2.78 3-5.085a6.958 6.958 0 01-1.002-3.02 6.961 6.961 0 01-.023-3.036m-3.038 3.127l.052-.085a9.94 9.94 0 01-.032-1.372m4.244 4.803l-.085-.076a10.44 10.44 0 01-1.26-1.893l.066-.11a10.7 10.7 0 01.932-1.765m.391 2.782c-.128.397-.252.8-.37 1.208" />
              </svg>
              <span className="text-xs font-medium">Personal Identity</span>
            </div>
            <textarea
              value={persona}
              onChange={handlePersonaChange}
              placeholder="I am a developer, use friendly tone..."
              className={`w-full text-xs p-2 rounded-lg resize-none border ${
                darkMode 
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-300 placeholder-zinc-500' 
                  : 'bg-zinc-50 border-zinc-200 text-zinc-700 placeholder-zinc-400'
              }`}
              rows={2}
            />
            <button
              onClick={handleSavePersona}
              disabled={isSavingPersona}
              className={`mt-2 w-full text-xs py-1.5 rounded-lg transition-all ${
                isSavingPersona
                  ? 'bg-zinc-700 text-zinc-400'
                  : 'bg-violet-600 text-white hover:bg-violet-500'
              }`}
            >
              {isSavingPersona ? 'Saved!' : 'Save Identity'}
            </button>
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
                  ? darkMode 
                    ? 'bg-zinc-800/80 text-[#fafafa] border border-zinc-700/50 shadow-sm hover:shadow-md' 
                    : 'bg-violet-50 text-violet-700 border border-violet-200 shadow-sm'
                  : darkMode 
                    ? 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              } ${isCollapsed ? 'justify-center px-2 w-14' : ''}`}
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
      
      <div className={`pt-4 border-t mt-4 ${darkMode ? 'border-zinc-800/30' : 'border-zinc-200'}`}>
        <p className={`text-xs text-center font-light tracking-wide ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>Claw AI v1.0</p>
      </div>
    </div>
  );
};

export default Sidebar;