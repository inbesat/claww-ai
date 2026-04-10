import { useState } from 'react';

const Sidebar = ({ sessionId, chatHistory, onNewChat, onSelectChat, onDeleteChat, onRenameChat, darkMode, isCollapsed, onToggleCollapse }) => {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

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

  return (
    <div className={`flex flex-col h-full transition-all ${darkMode ? 'bg-[#0a0a0a]' : 'bg-white'}`}>
      <div className={`flex items-center gap-3 px-3 py-4 ${isCollapsed ? 'justify-center' : ''}`}>
        <button
          onClick={onToggleCollapse}
          className={`p-2 rounded-lg hover:bg-zinc-800/50 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-all duration-200 ${isCollapsed ? '' : ''}`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {!isCollapsed && (
          <span className="text-xl font-bold bg-gradient-to-r from-violet-500 to-fuchsia-500 text-transparent bg-clip-text">
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