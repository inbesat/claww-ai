import React from 'react';

const CodexModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const Section = ({ icon, title, children }) => (
    <div className="bg-white/5 p-5 rounded-xl border border-white/10 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
      </div>
      <div className="text-sm text-zinc-400 leading-relaxed">{children}</div>
    </div>
  );

  const LegendItem = ({ icon, label, desc }) => (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/5">
      <span className="text-xl">{icon}</span>
      <div>
        <span className="text-sm font-medium text-zinc-300">{label}</span>
        <span className="text-xs text-zinc-500 ml-2">— {desc}</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[#0a0a0a]/95 backdrop-blur-3xl border border-white/10 rounded-3xl max-w-4xl w-full max-h-[88vh] overflow-y-auto custom-scrollbar">
        <div className="sticky top-0 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/95 to-transparent p-6 pb-4 z-10">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-fuchsia-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent animate-pulse">
            Welcome to Synapse OS
          </h1>
          <p className="text-zinc-400 mt-2 text-base">Your persistent, action-oriented intelligence platform.</p>
        </div>
        
        <div className="p-6 pt-2 space-y-4">
          <Section 
            icon="🧠" 
            title="1. The Neural Vault (Permanent Memory)"
          >
            <p className="mb-2"><strong>What it is:</strong> Synapse remembers your documents forever using Pinecone vector storage.</p>
            <p><strong>How to use:</strong> Click the <strong>📎 Paperclip</strong> icon in the sidebar to upload a PDF, TXT, or DOCX file. Synapse will:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-300">
              <li>Extract all text using OCR and pdf-parse</li>
              <li>Vectorize it into Pinecone embeddings</li>
              <li>Store it for semantic search</li>
            </ul>
            <p className="mt-2 text-zinc-300">Try uploading a contract and asking: <em>"What does page 3 say about the payment terms?"</em></p>
            <p className="mt-2 text-zinc-500 text-xs">Duplicate uploads are automatically skipped to save resources.</p>
          </Section>

          <Section 
            icon="💹" 
            title="2. Financial Ticker (Live Market Data)"
          >
            <p className="mb-2"><strong>What it is:</strong> Real-time stock prices displayed as glowing visual cards.</p>
            <p><strong>How to use:</strong> Simply ask:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-300">
              <li><em>"What's the price of $NVDA?"</em></li>
              <li><em>"How is Tesla doing today?"</em></li>
              <li><em>"Show me AAPL with percentage change"</em></li>
            </ul>
            <p className="mt-2 text-zinc-300">Synapse will fetch live data via Alpha Vantage and display a <strong>Stock Card</strong> with:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-300">
              <li>Live price (e.g., <strong>$142.50</strong>)</li>
              <li>Change value (e.g., <strong>+$2.35</strong>)</li>
              <li>Percentage (e.g., <strong>+1.68%</strong>)</li>
            </ul>
            <div className="mt-3 flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> <span className="text-emerald-400 font-medium">Green Glow</span> = Stock UP</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span> <span className="text-rose-400 font-medium">Red Glow</span> = Stock DOWN</span>
            </div>
          </Section>

          <Section 
            icon="🔍" 
            title="3. Web Search (Live Intelligence)"
          >
            <p className="mb-2"><strong>What it is:</strong> Synapse browses the web for real-time information.</p>
            <p><strong>How to use:</strong> Ask about anything after 2023:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-300">
              <li><em>"Latest news on SpaceX?"</em></li>
              <li><em>"What's the current weather in Tokyo?"</em></li>
              <li><em>"Who won the election yesterday?"</em></li>
            </ul>
            <p className="mt-2 text-zinc-300">Synapse uses SerpApi to fetch top Google results, then summarizes them naturally.</p>
            <p className="mt-2 text-zinc-500 text-xs">Look for the <strong>🔍 Pulsing dot</strong> in the chat to know when search is active.</p>
          </Section>

          <Section 
            icon="✨" 
            title="4. Visionary Core (Image Generation)"
          >
            <p className="mb-2"><strong>What it is:</strong> Built-in 4K AI image generation via HuggingFace.</p>
            <p><strong>How to use:</strong> Simply type <strong>"Generate an image of..."</strong> followed by your vision:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-300">
              <li><em>"Generate an image of a futuristic city at night"</em></li>
              <li><em>"Create a logo for my tech startup"</em></li>
              <li><em>"Draw a cyberpunk samurai"</em></li>
            </ul>
            <p className="mt-2 text-zinc-300">Synapse sends your prompt to Stable Diffusion and returns a downloadable 4K image.</p>
          </Section>

          <Section 
            icon="🎨" 
            title="5. The Canvas (Workspace)"
          >
            <p className="mb-2"><strong>What it is:</strong> A god-mode UI for deep work without losing context.</p>
            <p><strong>How to use:</strong> When Synapse generates:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-300">
              <li>Long code blocks</li>
              <li>Complex UI components</li>
              <li>Detailed essays or documents</li>
            </ul>
            <p className="mt-2 text-zinc-300">A <strong>Canvas panel</strong> slides in from the right, allowing side-by-side editing with syntax highlighting—keeping your chat history intact while you work.</p>
          </Section>

          <Section 
            icon="📱" 
            title="6. Native App Installation (PWA)"
          >
            <p className="mb-2"><strong>What it is:</strong> Synapse runs as a native app on your device.</p>
            <p><strong>How to install:</strong></p>
            <div className="mt-2 space-y-3 text-zinc-300">
              <div>
                <p className="font-medium text-zinc-100">On Mobile (iOS/Android):</p>
                <p className="text-zinc-400">Tap <strong>Share</strong> → <strong>Add to Home Screen</strong></p>
              </div>
              <div>
                <p className="font-medium text-zinc-100">On Desktop (Chrome/Edge):</p>
                <p className="text-zinc-400">Click the <strong>Install icon</strong> (⬇) in the URL bar</p>
              </div>
            </div>
            <p className="mt-3 text-zinc-300">Synapse will run in <strong>full-screen</strong> as a native app, free of browser chrome—perfect for daily use.</p>
          </Section>

          <Section 
            icon="🎭" 
            title="7. The Atmosphere (Theme Engine)"
          >
            <p className="mb-2"><strong>What it is:</strong> A CSS-variable UI engine that transforms the entire app's aesthetic.</p>
            <p><strong>How to use:</strong> Use the <strong>Theme / Vibe</strong> buttons in the sidebar:</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white">
                <p className="font-bold">Cyberpunk</p>
                <p>Fuchsia/Cyan</p>
              </div>
              <div className="p-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                <p className="font-bold">Forest</p>
                <p>Emerald/Gold</p>
              </div>
              <div className="p-2 rounded-lg bg-zinc-600 text-white">
                <p className="font-bold">Minimal</p>
                <p>Slate/White</p>
              </div>
            </div>
            <p className="mt-2 text-zinc-300">The <strong>Aura background</strong> automatically adapts to your selected theme's colors.</p>
          </Section>

          <div className="bg-white/5 p-5 rounded-xl border border-white/10">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
              📖 The UI Legend
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LegendItem icon="📎" label="Paperclip" desc="Upload to Vault" />
              <LegendItem icon="🔍" label="Search" desc="Web Search active" />
              <LegendItem icon="✨" label="Sparkles" desc="AI is thinking" />
              <LegendItem icon="🟢" label="Green" desc="Stock UP" />
              <LegendItem icon="🔴" label="Red" desc="Stock DOWN" />
              <LegendItem icon="🖼️" label="Image" desc="Generate Image" />
              <LegendItem icon="🎭" label="Theme" desc="Switch Vibe" />
              <LegendItem icon="📊" label="Chart" desc="Data Viz" />
              <LegendItem icon="📧" label="Email" desc="Send Email" />
              <LegendItem icon="🌐" label="Browser" desc="Web Agent" />
              <LegendItem icon="📈" label="Vault" desc="Pinecone Memory" />
              <LegendItem icon="💹" label="Ticker" desc="Stock Card" />
            </div>
          </div>

          <div className="pt-4 pb-2">
            <button
              onClick={onClose}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-fuchsia-600 via-violet-600 to-fuchsia-600 text-white font-semibold hover:from-fuchsia-500 hover:to-violet-500 transition-all shadow-lg shadow-fuchsia-500/20 animate-pulse"
            >
              Get Started ✨
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodexModal;