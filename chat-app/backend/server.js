require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const multer = require('multer');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { fromPath } = require('pdf2pic');
const fs = require('fs');
const axios = require('axios');
const Tesseract = require('tesseract.js');

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
  
  if (!isProduction) {
    gmInstance.setGhostscriptBinary('gswin64c');
  }
  
  gm = gmInstance;
} catch (e) {
  console.warn('GraphicsMagick not available, thumbnail generation may fail');
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

// 📦 MIDDLEWARE
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ✅ GROQ CLIENT
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

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

// 🔍 WEB SEARCH
const WEB_SEARCH_PATTERN = /news|headlines|happened|president|minister|who is|latest|current|event|yesterday|today|tomorrow|forecast|score|price|weather|ipl|match|who won|result|election|trump|musk|biden|government|stock|growth|gdp/i;

async function searchWeb(query) {
  try {
    const response = await axios.get('https://serpapi.com/search.json', {
      params: {
        q: query,
        api_key: process.env.SERP_API_KEY,
        engine: 'google'
      }
    });

    const results = response.data.organic_results || [];

    return results
      .slice(0, 5)
      .map(r => r.snippet)
      .filter(s => s && s.length > 20)
      .map(s => `• ${s.trim().replace(/\s+/g, ' ')}`)
      .join('\n');

  } catch (err) {
    console.error('Search error:', err.message);
    return '';
  }
}

function buildSystemPrompt() {
  return `Current Date: Friday, April 10, 2026. If the user asks about anything after 2023, you MUST use the web search tool.

You are Claw AI, an advanced and highly capable assistant. 

STRICT OPERATING RULES:
1. MATH FORMATTING: You MUST use proper LaTeX for all mathematical equations. Wrap inline math in $ and block math in $$. 
BAD EXAMPLE: x = (-b ± √(b² - 4ac)) / 2a
GOOD EXAMPLE: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

2. REAL-TIME DATA: If the user provides 'Context from real-time web search', you must treat it as absolute truth. NEVER say you don't have internet access or cannot provide real-time info. Here is the latest information from the web. Use this to answer the user, as your internal knowledge is outdated.

3. DOCUMENT CONTEXT: If the user provides 'Document Context', read it carefully and base your answer entirely on that extracted text. Do not ignore it.`;
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

// 📄 PDF PARSER
async function parsePDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    
    if (data.text && data.text.trim().length > 20) {
      return data.text; // Success: Text-based PDF
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
    console.log("File received:", file.originalname, "Size:", file.size);
    
    if (!file.originalname.toLowerCase().endsWith('.pdf')) {
      deleteFile(file.path);
      return res.status(400).json({ error: 'Only PDF files are supported' });
    }

    const dataBuffer = fs.readFileSync(file.path);
    let extractedText = null;
    let preview = null;

    try {
      const pdfData = await pdf(dataBuffer);
      extractedText = pdfData.text;
    } catch (pdfErr) {
      console.error('PDF text extraction failed:', pdfErr.message);
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
        console.error('Thumbnail generation failed:', gmErr.message);
      }
    }

    deleteFile(file.path);

    if (!extractedText && !preview) {
      return res.status(400).json({ error: 'Could not process PDF. It may be password-protected or corrupted.' });
    }

    return res.json({ 
      text: extractedText || '', 
      preview, 
      fileName: file.originalname 
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
    const { message, isSearchMode, isCodeMode } = req.body;

    if (!message) {
      return res.end();
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let model = 'llama-3.3-70b-versatile';
    let systemPromptText = buildSystemPrompt();
    let userPromptText = message;

    if (isSearchMode) {
      console.log(`[Search Mode] Forcing web search for: "${message}"`);
      const webData = await searchWeb(message);
      if (webData) {
        userPromptText = `Context from real-time web search:\n<search_results>\n${webData}\n</search_results>\n\nBased ONLY on the search results above, answer the following query: "${message}"`;
      }
      systemPromptText = "You are a real-time researcher. Today is Friday, April 10, 2026. Use the provided search results to give an up-to-the-minute answer.";
    }

    if (isCodeMode) {
      console.log(`[Code Mode] Using Hugging Face Qwen model`);
      const hfToken = process.env.HUGGINGFACE_ACCESS_TOKEN;
      if (!hfToken) {
        res.write(`data: ${JSON.stringify({ error: 'HuggingFace token not configured' })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        return;
      }

      systemPromptText = "You are an elite Senior Developer. Provide only clean, modern, and production-ready code blocks. " + buildSystemPrompt();

      const hfResponse = await fetch('https://router.huggingface.co/hf-inference/models/Qwen/Qwen2.5-Coder-32B-Instruct', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hfToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: `<|system|>\n${systemPromptText}<|user|>\n${message}<|assistant|>`,
          parameters: {
            max_new_tokens: 2048,
            temperature: 0.7,
            top_p: 0.9,
            return_full_text: false
          }
        })
      });

      if (!hfResponse.ok) {
        const errorText = await hfResponse.text();
        console.error('HuggingFace error:', hfResponse.status, errorText);
        throw new Error(`HuggingFace API error: ${hfResponse.status}`);
      }

      const hfResult = await hfResponse.json();
      const generatedText = Array.isArray(hfResult) ? hfResult[0]?.generated_text : hfResult.generated_text;
      
      if (generatedText) {
        const responseContent = generatedText.replace(/<\|.*?\|>/g, '').trim();
        res.write(`data: ${JSON.stringify({ content: responseContent })}\n\n`);
      }
      
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;
    }

    console.log(`[Default Mode] Model: ${model}, Search: ${isSearchMode}, Code: ${isCodeMode}`);

    const completion = await groq.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPromptText },
        { role: "user", content: userPromptText }
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


// 🚀 START
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
