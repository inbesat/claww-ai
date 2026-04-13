import React from 'react';

const Canvas = ({ content, onClose, language = 'html' }) => {
  return (
    <div className="flex-1 flex flex-col m-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg-subtle)]/80 backdrop-blur-md shadow-2xl overflow-hidden">
      <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-zinc-800/50 bg-zinc-900/50' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${darkMode ? 'text-zinc-300' : 'text-gray-700'}`}>Live Artifact</span>
          <span className="text-xs px-2 py-0.5 rounded bg-violet-500/20 text-violet-600 border border-violet-500/30">
            {language || 'html'}
          </span>
        </div>
        <button
          onClick={onClose}
          className={`p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 ${darkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-gray-500 hover:text-gray-700'} transition-all duration-300`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <iframe
        title="artifact-preview"
        srcDoc={content}
        sandbox="allow-scripts allow-modals"
        className="w-full flex-1 bg-white rounded-b-xl border-none"
      />
    </div>
  );
};

export default Canvas;