require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const OpenAI = require('openai');
const multer = require('multer');

let pdfjsLib;
try {
  pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  pdfjsLib.GlobalWorkerOptions.workerSrc = false;
} catch (e) {
  console.error('[PDF.js] Failed to load:', e.message);
}

const mammoth = require('mammoth');
const { fromPath } = require('pdf2pic');
const fs = require('fs');
const axios = require('axios');
const Tesseract = require('tesseract.js');
const cheerio = require('cheerio');
const { Pinecone } = require('@pinecone-database/pinecone');
const { HfInference } = require('@huggingface/inference');
const nodemailer = require('nodemailer');

process.on('uncaughtException', (err) => {
  console.error('SYSTEM CRASH:', err.stack);
});
process.on('unhandledRejection', (reason, promise) => { console.error('Unhandled Rejection:', reason); });

const app = express();
const PORT = process.env.PORT || 3001;

app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

let playwright;
try {
  playwright = require('playwright');
} catch (e) {
  console.log('[Browser] Playwright not available');
}

let gm;
try {
  const gmModule = require('gm');
  const isProduction = process.env.NODE_ENV === 'production';
  
  const gmConfig = { 
    imageMagick: false
  };
  
  if (!isProduction) {
    gmConfig.appPath = 'E:/claw-code-main (3) (1)/claw-code-main/claw-code-main/GraphicsMagick-1.3.46-Q16/';
  }
  
  const gmInstance = gmModule.subClass(gmConfig);
  
  const gsBinary = isProduction ? 'gs' : 'gswin64c';
  gmInstance.setGhostscriptBinary(gsBinary);
  console.log(`[GraphicsMagick] Ghostscript binary set to: ${gsBinary}`);
  
  gm = gmInstance;
} catch (e) {
  console.warn('GraphicsMagick not available, thumbnail generation may fail');
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

// 📦 MIDDLEWARE
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(express.raw({ type: 'application/pdf', limit: '100mb' }));

// ✅ GROQ CLIENT
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

// ✅ PINECONE & HF CLIENTS
let pinecone, pineconeIndex;
if (process.env.PINECONE_API_KEY) {
  pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  pineconeIndex = pinecone.Index('synapse-vault');
  console.log('[Pinecone] Connected to synapse-vault index');
}

let hf;
if (process.env.HF_TOKEN) {
  hf = new HfInference(process.env.HF_TOKEN);
  console.log('[HuggingFace] Inference client initialized');
}

// ✅ ENV CHECK
if (!process.env.GROQ_API_KEY) {
  throw new Error("❌ GROQ_API_KEY missing");
}
if (!process.env.SERP_API_KEY) {
  throw new Error("❌ SERP_API_KEY missing");
}

// 📦 MULTER UPLOAD CONFIG
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }
});

// 🕷️ PAGE SCRAPER
async function scrapePage(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`[Scraper] Blocked or error for ${url}: ${response.status}`);
      return '';
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const text = $('p, h1, h2, h3, article, main, section').text();
    const cleaned = text.replace(/\s+/g, ' ').trim();
    
    return cleaned.length > 5000 ? cleaned.substring(0, 5000) : cleaned;

  } catch (err) {
    console.error(`[Scraper] Failed to scrape ${url}:`, err.message);
    return '';
  }
}

// 🔍 WEB SEARCH WITH DEEP SCRAPING
const WEB_SEARCH_PATTERN = /news|headlines|happened|president|minister|who is|latest|current|event|yesterday|today|tomorrow|forecast|score|price|weather|ipl|match|who won|result|election|trump|musk|biden|government|stock|growth|gdp/i;

async function searchWeb(query) {
  try {
    const response = await axios.get('https://serpapi.com/search.json', {
      params: {
        q: query,
        api_key: process.env.SERP_API_KEY,
        engine: 'google',
        num: 5
      }
    });

    const results = response.data.organic_results || [];
    const snippets = results
      .slice(0, 5)
      .map(r => r.snippet)
      .filter(s => s && s.length > 20)
      .map(s => `• ${s.trim().replace(/\s+/g, ' ')}`)
      .join('\n');

    const topUrls = results.slice(0, 2).map(r => r.link).filter(Boolean);
    
    let deepContent = '';
    if (topUrls.length > 0) {
      console.log(`[Deep Scrap] Fetching top ${topUrls.length} URLs...`);
      const scrapedResults = await Promise.all(
        topUrls.map(async url => ({ url, text: await scrapePage(url) }))
      );
      const validScrapes = scrapedResults
        .filter(s => s.text.length > 100)
        .map(s => `--- SOURCE: ${s.url} ---\n${s.text}`);
      if (validScrapes.length > 0) {
        deepContent = '\n\n--- DEEP CONTENT FROM SOURCES ---\n' + validScrapes.join('\n\n--- NEXT SOURCE ---\n\n');
      }
    }

    const maxTotalLength = 12000;
    let combined = snippets;
    if (deepContent) {
      combined = `${snippets}\n\n${deepContent}`;
      if (combined.length > maxTotalLength) {
        combined = combined.substring(0, maxTotalLength) + '\n\n[Content truncated due to length...]';
      }
    }

    return combined;

  } catch (err) {
    console.error('Search error:', err.message);
    return '';
  }
}

function buildSystemPrompt() {
  return `Current Date: Friday, April 10, 2026. If the user asks about anything after 2023, you MUST use the web search tool.

You are Synapse AI, an advanced and highly capable assistant. 

STRICT OPERATING RULES:
1. MATH FORMATTING: You MUST use proper LaTeX for all mathematical equations. Wrap inline math in $ and block math in $$. 
BAD EXAMPLE: x = (-b ± √(b² - 4ac)) / 2a
GOOD EXAMPLE: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

2. REAL-TIME DATA: If the user provides 'Context from real-time web search', you must treat it as absolute truth. NEVER say you don't have internet access or cannot provide real-time info. Here is the latest information from the web. Use this to answer the user, as your internal knowledge is outdated.

3. DOCUMENT CONTEXT: If the user provides 'Document Context', read it carefully and base your answer entirely on that extracted text. Do not ignore it.

4. DATA VISUALIZATION: When asked for charts, graphs, or data visualization, output a JSON code block with language 'chart-data' containing: { "type": "bar|line|area", "data": [{key: value, ...}], "colors": ["#violet", "#fuchsia"] }.`;
}

async function buildPrompt(message, forceSearch = false) {
  const needsWebSearch = forceSearch || WEB_SEARCH_PATTERN.test(message);
  let webData = '';
  
  if (needsWebSearch) {
    console.log(`[] Web search triggered for: "${message}"`);
    webData = await searchWeb(message);
    console.log(`[] Web Data Fetched:`, webData ? webData : "None/Empty");
  }

  let finalUserPrompt = message;
  if (webData) {
    finalUserPrompt = `Context from real-time web search:\n<search_results>\n${webData}\n</search_results>\n\nBased ONLY on the search results above, answer the following query: "${message}"`;
  }

  return {
    systemPrompt: buildSystemPrompt(),
    userPrompt: finalUserPrompt
  };
}

// 📄 PDF PARSER (Page-by-page streaming for memory efficiency)
async function parsePDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdf = await pdfjsLib.getDocument({ data: dataBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
      
      if (i % 10 === 0) {
        console.log(`[ParsePDF] Processed page ${i} of ${pdf.numPages}`);
      }
      
      page.cleanup();
    }
    
    pdf.destroy();
    
    if (fullText.trim().length > 20) {
      return fullText;
    }

    console.log("PDF lacks text, attempting OCR...");
    const options = {
      density: 300,
      saveFilename: "temp_page",
      savePath: "./uploads",
      format: "png",
      width: 2550,
      height: 3300
    };
    const storeAsImage = fromPath(filePath, options);
    const convertedImage = await storeAsImage(1);
    
    const result = await Tesseract.recognize(convertedImage.path, 'eng');
    deleteFile(convertedImage.path);
    
    return result.data.text.trim() || null;
  } catch (err) {
    console.error('PDF parse/OCR error:', err.message);
    return null;
  }
}

// 🖼️ OCR
async function extractTextFromImage(filePath) {
  try {
    const result = await Tesseract.recognize(filePath, 'eng');
    return result.data.text.trim() || null;
  } catch (err) {
    console.error('OCR error:', err.message);
    return null;
  }
}

// 🧹 DELETE FILE
function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('Delete error:', err.message);
  }
}

// 📁 FILE UPLOAD
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const file = req.file;
    const ext = file.originalname.toLowerCase().split('.').pop();
    let content = null;
    let type = ext;

    if (ext === 'txt') {
      content = fs.readFileSync(file.path, 'utf-8');
    } else if (ext === 'pdf') {
      content = await parsePDF(file.path);
      if (!content) return res.status(400).json({ error: 'Could not extract text from PDF.' });
    } else if (['jpg', 'jpeg', 'png'].includes(ext)) {
      content = await extractTextFromImage(file.path);
    } else if (ext === 'docx') {
      const result = await mammoth.extractRawText({ path: file.path });
      content = result.value;
    } else {
      deleteFile(file.path);
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    deleteFile(file.path);
    return res.json({ content, type });

  } catch (err) {
    console.error('Upload error:', err);
    if (req.file) deleteFile(req.file.path);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

// 📄 PDF PROCESSING WITH THUMBNAIL
app.post('/api/process-pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const file = req.file;
    console.log(`[Process PDF] Received: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    
    if (!file.originalname.toLowerCase().endsWith('.pdf')) {
      deleteFile(file.path);
      return res.status(400).json({ error: 'Only PDF files are supported' });
    }

    const dataBuffer = fs.readFileSync(file.path);
    let extractedText = null;
    let preview = null;
    let numPages = 0;

    try {
      const pdf = await pdfjsLib.getDocument({ data: dataBuffer }).promise;
      numPages = pdf.numPages;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
        page.cleanup();
        
        if (i % 10 === 0) {
          console.log(`[Process PDF] Processed page ${i} of ${pdf.numPages}`);
        }
      }
      
      extractedText = fullText;
      pdf.destroy();
      console.log(`[Process PDF] Extracted ${numPages} pages, ${extractedText.length} characters`);
    } catch (pdfErr) {
      console.error('[Process PDF] Text extraction failed:', pdfErr.message);
    }

    if (gm) {
      try {
        console.log("Rendering PDF thumbnail for:", file.originalname);
        const thumbnailBuffer = await new Promise((resolve, reject) => {
          gm(file.path + '[0]')
            .resize(500, null)
            .toBuffer('PNG', (err, buffer) => {
              if (err) reject(err);
              else resolve(buffer);
            });
        });
        preview = `data:image/png;base64,${thumbnailBuffer.toString('base64')}`;
      } catch (gmErr) {
        console.error('Thumbnail generation failed:', gmErr.message, gmErr.stack);
      }
    }

    deleteFile(file.path);

    if (!extractedText && !preview) {
      return res.status(400).json({ error: 'Could not process PDF. It may be password-protected or corrupted.' });
    }

    return res.json({ 
      text: extractedText || '', 
      preview, 
      fileName: file.originalname,
      numPages
    });

  } catch (err) {
    console.error('PDF processing error:', err);
    if (req.file) deleteFile(req.file.path);
    return res.status(500).json({ error: err.message || 'PDF processing failed' });
  }
});

app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt required' });
    }

    const cleanPrompt = prompt.replace(/!\[.*?\]\(.*?\)/g, '').replace(/[#?&]/g, '').trim();

    if (!cleanPrompt) {
      return res.status(400).json({ error: 'Prompt required' });
    }

    const token = process.env.HUGGINGFACE_ACCESS_TOKEN;
    if (!token) {
      return res.status(500).json({ error: 'HuggingFace token not configured' });
    }

    const hfResponse = await fetch('https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: cleanPrompt })
    });

    if (!hfResponse.ok) {
      const errorText = await hfResponse.text();
      console.error('HuggingFace error:', hfResponse.status, errorText);
      throw new Error(`HuggingFace API error: ${hfResponse.status}`);
    }

    const buffer = await hfResponse.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const base64Image = `data:image/jpeg;base64,${base64}`;

    console.log('Generated FLUX image (base64 length):', base64.length);

    return res.json({ image: base64Image });
  } catch (err) {
    console.error('Image generation error:', err);
    return res.status(500).json({ error: err.message || 'Image generation failed' });
  }
});

// 🗄️ KNOWLEDGE VAULT UPLOAD
app.post('/api/vault/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!pineconeIndex || !hf) {
      return res.status(500).json({ error: 'Pinecone or HuggingFace not configured' });
    }

    const file = req.file;
    console.log(`[Vault] Processing: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    const ext = file.originalname.toLowerCase().split('.').pop();
    
    const chunks = [];
    const chunkSize = 1000;
    const overlap = 200;

    if (ext === 'pdf') {
      try {
        const dataBuffer = fs.readFileSync(file.path);
        const pdf = await pdfjsLib.getDocument({ data: dataBuffer }).promise;
        console.log(`[Vault] PDF loaded: ${pdf.numPages} pages`);
        
        let pageTextBuffer = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          
          pageTextBuffer += pageText + '\n';
          
          // Process chunks as we accumulate text
          while (pageTextBuffer.length >= chunkSize) {
            const chunk = pageTextBuffer.slice(0, chunkSize).trim();
            if (chunk.length > 50) {
              chunks.push(chunk);
            }
            pageTextBuffer = pageTextBuffer.slice(chunkSize - overlap);
          }
          
          // Heartbeat log every 10 pages
          console.log(`[Streaming] Page ${i} indexed...`);
          
          // Memory management: pause every 20 pages to allow GC
          if (i % 20 === 0) {
            page.cleanup();
            await new Promise(r => setTimeout(r, 100));
            if (global.gc) global.gc();
          } else {
            page.cleanup();
          }
        }
        
        // Process remaining text in buffer
        if (pageTextBuffer.trim().length > 50) {
          chunks.push(pageTextBuffer.trim());
        }
        
        pdf.destroy();
        console.log(`[Vault] PDF parsed: ${chunks.length} chunks created`);
        
      } catch (pdfErr) {
        console.error('[Vault] PDF parse error:', pdfErr.message);
        deleteFile(file.path);
        return res.status(400).json({ error: 'Could not parse PDF. It may be encrypted or corrupted.' });
      }
    } else if (ext === 'txt') {
      const text = fs.readFileSync(file.path, 'utf-8');
      for (let i = 0; i < text.length; i += (chunkSize - overlap)) {
        const chunk = text.slice(i, i + chunkSize).trim();
        if (chunk.length > 50) {
          chunks.push(chunk);
        }
      }
    } else if (ext === 'docx') {
      const result = await mammoth.extractRawText({ path: file.path });
      const text = result.value;
      for (let i = 0; i < text.length; i += (chunkSize - overlap)) {
        const chunk = text.slice(i, i + chunkSize).trim();
        if (chunk.length > 50) {
          chunks.push(chunk);
        }
      }
    }

    deleteFile(file.path);

    if (chunks.length === 0) {
      return res.status(400).json({ error: 'Could not extract enough text from file' });
    }

    console.log(`[Vault] Created ${chunks.length} chunks`);
    
    // Force GC before embedding
    if (global.gc) global.gc();

    try {
      // Process embeddings in batches to manage memory
      const vectors = [];
      const batchSize = 50;
      
      for (let i = 0; i < chunks.length; i += batchSize) {
        const chunkBatch = chunks.slice(i, i + batchSize);
        
        const embeddings = await hf.featureExtraction({
          model: 'sentence-transformers/all-MiniLM-L6-v2',
          inputs: chunkBatch
        });

        chunkBatch.forEach((chunk, j) => {
          const embedding = Array.isArray(embeddings[j]) ? embeddings[j] : embeddings;
          vectors.push({
            id: `${file.originalname}-${i + j}`,
            values: embedding,
            metadata: { text: chunk, source: file.originalname }
          });
        });

        // Memory management: pause between batches
        if (global.gc) global.gc();
        await new Promise(r => setTimeout(r, 50));
      }

      // Upsert to Pinecone in batches
      const upsertBatchSize = 100;
      for (let i = 0; i < vectors.length; i += upsertBatchSize) {
        const batch = vectors.slice(i, i + upsertBatchSize);
        await pineconeIndex.upsert(batch);
      }

      console.log(`[Vault] Upserted ${vectors.length} vectors for ${file.originalname}`);
      
      if (global.gc) global.gc();
      
      return res.json({ success: true, chunks: vectors.length, filename: file.originalname });
    } catch (embeddingErr) {
      console.error('[Vault] Embedding error:', embeddingErr.message);
      return res.status(503).json({ error: 'Server Busy - Please try again later' });
    }

  } catch (err) {
    console.error('Vault upload error:', err);
    if (req.file) deleteFile(req.file.path);
    
    if (err.message?.includes('heap') || err.message?.includes('memory')) {
      return res.status(503).json({ error: 'Server Busy - Please try with a smaller file' });
    }
    return res.status(500).json({ error: err.message || 'Vault upload failed' });
  }
});


// 🧠 NORMAL CHAT
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    const { systemPrompt, userPrompt } = await buildPrompt(message);

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    return res.json({
      content: completion.choices[0].message.content
    });

  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({ error: err.message });
  }
});


// ⚡ STREAM CHAT
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { message, isSearchMode, isCodeMode, imageContext, isVaultMode } = req.body;

    if (!message) {
      return res.end();
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let model = 'llama-3.3-70b-versatile';
    let systemPromptText = buildSystemPrompt();
    let userContent = message;

    // Inject persona context
    if (personaStore.persona && personaStore.persona.trim()) {
      systemPromptText += `\n\nUSER BACKGROUND CONTEXT:\n${personaStore.persona}\nRemember this context when responding.`;
    }

    // Inject agentic workflow instructions if message contains "Plan:" or "Agent Mode"
    if (message.toLowerCase().includes('plan:') || message.toLowerCase().includes('agent mode')) {
      systemPromptText += `\n\nAGENTIC WORKFLOW: When executing complex tasks, use these thinking tags:\n- [PLANNING] Describe your step-by-step approach\n- [RESEARCHING] Gather necessary information\n- [EXECUTING] Implement the solution\nEnd each section clearly so the UI can display status.`;
    
    // Add browser agent instruction
    systemPromptText += `\n\nBROWSER AGENT: If the user asks to browse a website, get flight prices, or perform live web actions, output a hidden JSON block exactly formatted like this: \`[BROWSER_ACTION: {"url": "https://...", "task": "screenshot"}]\`. Use "screenshot" to capture the page or "extract" to get the HTML content.`;
    }

    if (imageContext) {
      console.log(`[Vision Mode] Using meta-llama/llama-4-scout-17b-16e-instruct`);
      model = 'meta-llama/llama-4-scout-17b-16e-instruct';
      userContent = [
        { type: "text", text: message },
        { type: "image_url", image_url: { url: imageContext } }
      ];
      systemPromptText = "You are Synapse AI with vision capabilities. Analyze the provided image and answer questions about it accurately.";
    } else if (isVaultMode && pineconeIndex && hf) {
      console.log(`[Vault Mode] Querying knowledge base for: "${message}"`);
      try {
        const queryEmbedding = await hf.featureExtraction({
          model: 'sentence-transformers/all-MiniLM-L6-v2',
          inputs: message
        });
        
        const queryResponse = await pineconeIndex.query({
          vector: queryEmbedding,
          topK: 3,
          includeMetadata: true
        });

        if (queryResponse.matches && queryResponse.matches.length > 0) {
          const vaultContext = queryResponse.matches
            .map(m => `--- From ${m.metadata?.source || 'document'} ---\n${m.metadata?.text || ''}`)
            .join('\n\n');
          
          userContent = `Context from Knowledge Vault:\n<vault_documents>\n${vaultContext}\n</vault_documents>\n\nBased on the documents above, answer: "${message}"`;
          console.log(`[Vault Mode] Found ${queryResponse.matches.length} relevant documents`);
        }
      } catch (vaultErr) {
        console.error('[Vault Mode] Error querying Pinecone:', vaultErr.message);
      }
      systemPromptText = "You are Synapse AI with access to a private Knowledge Vault. Answer questions using the provided document context. If the context doesn't contain enough information, state that clearly.";
    } else if (isSearchMode) {
      console.log(`[Search Mode] Forcing web search for: "${message}"`);
      const webData = await searchWeb(message);
      if (webData) {
        userContent = `Context from real-time web search:\n<search_results>\n${webData}\n</search_results>\n\nBased ONLY on the search results above, answer the following query: "${message}"`;
      }
      systemPromptText = "You are a real-time researcher. Today is Friday, April 10, 2026. Use the provided search results to give an up-to-the-minute answer. You MUST include the source URLs at the very bottom of your response under a 'Sources:' heading.";
    }

    if (isCodeMode) {
      console.log(`[Code Mode] Using Groq with Senior Developer prompt`);
      systemPromptText = "You are an elite Senior Developer. Provide only clean, modern, and production-ready code blocks. Do not use conversational filler.";
    }

    console.log(`[Default Mode] Model: ${model}, Search: ${isSearchMode}, Code: ${isCodeMode}`);

    const completion = await groq.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPromptText },
        { role: "user", content: userContent }
      ],
      stream: true
    });

    for await (const chunk of completion) {
      const content = chunk.choices?.[0]?.delta?.content;

      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

  } catch (err) {
    console.error('Stream error:', err);

    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  }
});


// ❤️ HEALTH
app.get('/', (req, res) => res.send('Claw AI Backend is Live!'));
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// 🧠 PERSONA MEMORY (In-Memory Store)
const personaStore = {};

app.get('/api/persona', (req, res) => {
  const persona = personaStore.persona || '';
  res.json({ persona });
});

app.post('/api/persona', (req, res) => {
  const { persona } = req.body;
  personaStore.persona = persona || '';
  res.json({ success: true });
});

const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

app.post('/api/action/email', async (req, res) => {
  const { to, subject, body } = req.body;
  
  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
  }
  
  try {
    await emailTransporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text: body
    });
    console.log(`[Email Action] Sent to ${to}: ${subject}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[Email Action] Failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// 🚀 START
const httpServer = http.createServer(app);
httpServer.timeout = 120000; // 2 minute timeout for large file processing

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('[Socket] Client connected:', socket.id);
  
  socket.on('join-room', (sessionId) => {
    socket.join(sessionId);
    console.log(`[Socket] ${socket.id} joined room: ${sessionId}`);
  });
  
  socket.on('canvas-update', ({ sessionId, code }) => {
    socket.to(sessionId).emit('canvas-update', code);
  });
  
  socket.on('disconnect', () => {
    console.log('[Socket] Client disconnected:', socket.id);
  });
});

// 🌍 BROWSER AGENT
const browserAgent = async (url, task = 'screenshot') => {
  if (!playwright) {
    return { error: 'Browser automation not available on this server' };
  }
  
  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    if (task === 'screenshot') {
      const screenshot = await page.screenshot({ encoding: 'base64' });
      return { screenshot, url };
    } else if (task === 'extract') {
      const content = await page.content();
      return { content: content.slice(0, 10000), url };
    }
    
    await browser.close();
    return { success: true, url };
  } catch (err) {
    if (browser) await browser.close();
    return { error: err.message };
  }
};

app.post('/api/browser', async (req, res) => {
  const { url, task } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL required' });
  }
  
  try {
    const result = await browserAgent(url, task);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
