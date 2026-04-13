import React, { useState, useEffect, useRef } from 'react';

const THEMES = ['cyberpunk', 'forest', 'minimal', 'matrix', 'vaporwave', 'nord', 'bloodmoon'];

const CommandPalette = ({ 
  isOpen, 
  onClose, 
  macros = [], 
  chatHistory = [], 
  onSelectChat, 
  setZenMode, 
  setTheme, 
  setMessage 
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  if (!isOpen) return null;

  const buildSearchItems = () => {
    const items = [];

    macros.forEach(function(macro) {
      items.push({
        id: 'macro-' + macro.command,
        type: 'macro',
        title: macro.command,
        subtitle: macro.prompt.slice(0, 50) + (macro.prompt.length > 50 ? '...' : ''),
        icon: '⚡',
        action: function() {
          if (setMessage) setMessage(macro.prompt);
          onClose();
        }
      });
    });

    chatHistory.forEach(function(chat, idx) {
      items.push({
        id: 'chat-' + chat.id,
        type: 'chat',
        title: chat.title || ('Chat ' + (idx + 1)),
        subtitle: new Date(chat.timestamp).toLocaleDateString(),
        icon: '💬',
        action: function() {
          if (onSelectChat) onSelectChat(chat.id);
          onClose();
        }
      });
    });

    items.push({
      id: 'toggle-zen',
      type: 'action',
      title: 'Toggle Zen Mode',
      subtitle: 'Hide sidebar and focus on chat',
      icon: '🧘',
      action: function() {
        setZenMode(function(prev) { return !prev; });
        onClose();
      }
    });

    THEMES.forEach(function(themeName) {
      items.push({
        id: 'theme-' + themeName,
        type: 'theme',
        title: 'Theme: ' + (themeName.charAt(0).toUpperCase() + themeName.slice(1)),
        subtitle: 'Switch to ' + themeName + ' theme',
        icon: '🎨',
        action: function() {
          setTheme(themeName);
          onClose();
        }
      });
    });

    return items;
  };

  const allItems = buildSearchItems();

  const filteredItems = query.trim()
    ? allItems.filter(function(item) {
        return item.title.toLowerCase().includes(query.toLowerCase()) ||
               item.subtitle.toLowerCase().includes(query.toLowerCase());
      })
    : allItems;

  useEffect(function() {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(function() {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = function(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(function(prev) { return Math.min(prev + 1, filteredItems.length - 1); });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(function(prev) { return Math.max(prev - 1, 0); });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  useEffect(function() {
    var selectedEl = listRef.current ? listRef.current.children[selectedIndex] : null;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] p-3">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={function(e) { setQuery(e.target.value); }}
            onKeyDown={handleKeyDown}
            placeholder="Search Synapse or type a command..."
            className="w-full bg-transparent text-lg text-zinc-100 placeholder-zinc-500 outline-none"
          />
        </div>

        <div 
          ref={listRef}
          className="max-h-[50vh] overflow-y-auto custom-scrollbar"
        >
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              No results found
            </div>
          ) : (
            filteredItems.map(function(item, index) {
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={function() { setSelectedIndex(index); }}
                  className={'flex items-center gap-3 p-3 mx-2 my-1 rounded-xl cursor-pointer transition-all ' + (
                    index === selectedIndex
                      ? 'bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]/30'
                      : 'hover:bg-white/5 border border-transparent'
                  )}
                >
                  <span className="text-xl">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-zinc-100 font-medium truncate">{item.title}</div>
                    <div className="text-xs text-zinc-500 truncate">{item.subtitle}</div>
                  </div>
                  {index === selectedIndex && (
                    <span className="text-xs text-zinc-400">↵</span>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="p-2 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span>Cmd+K to toggle</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;