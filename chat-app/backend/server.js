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

const app = express();
const PORT = process.env.PORT || 3001;

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

// 📦 MIDDLEWARE
app.use(cors());
app.use(express.json());

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }
});

// 🔍 WEB SEARCH
const WEB_SEARCH_PATTERN = /today|latest|current|now|news|score|price|weather|ipl|match|who won|result/i;

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
  return `You are Claw AI, an advanced and highly capable assistant. 

STRICT OPERATING RULES:
1. MATH FORMATTING: You MUST use proper LaTeX for all mathematical equations. Wrap inline math in $ and block math in $$. 
BAD EXAMPLE: x = (-b ± √(b² - 4ac)) / 2a
GOOD EXAMPLE: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

2. REAL-TIME DATA: If the user provides 'Context from real-time web search', you must treat it as absolute truth. NEVER say you don't have internet access or cannot provide real-time info. 

3. DOCUMENT CONTEXT: If the user provides 'Document Context', read it carefully and base your answer entirely on that extracted text. Do not ignore it.`;
}

async function buildPrompt(message) {
  const needsWebSearch = WEB_SEARCH_PATTERN.test(message);
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

app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt required' });
    }

    const imageUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?width=1024&height=1024&model=flux&seed=${Math.floor(Math.random() * 100000)}&nologo=true`;
    return res.json({ image: imageUrl });
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
    const { message } = req.body;

    if (!message) {
      return res.end();
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const { systemPrompt, userPrompt } = await buildPrompt(message);

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
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
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});


// 🚀 START
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
