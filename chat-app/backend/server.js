require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const multer = require('multer');
const pdf = require('pdf-parse');
const fs = require('fs');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }
});

const SYSTEM_PROMPT = `You are a highly intelligent AI assistant designed to provide accurate, clear, and structured responses using real-time data when available.`;

// API Key checks
if (!process.env.GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY missing');
}
if (!process.env.SERP_API_KEY) {
  console.error('❌ SERP_API_KEY missing');
}

app.use(cors());
app.use(express.json());


// 🔍 WEB SEARCH FUNCTION (FINAL)
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
      .map(r => `${r.title}: ${r.snippet}`)
      .join('\n\n');

  } catch (err) {
    console.error('Search error:', err.message);
    return '';
  }
}


// 📄 PDF parser
async function parsePDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (err) {
    console.error('PDF parse error:', err.message);
    return null;
  }
}


// 📁 FILE UPLOAD
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const ext = file.originalname.toLowerCase().split('.').pop();

    if (ext === 'txt') {
      const content = fs.readFileSync(file.path, 'utf-8');
      fs.unlinkSync(file.path);
      return res.json({ content, type: 'text' });
    }

    if (ext === 'pdf') {
      const content = await parsePDF(file.path);
      fs.unlinkSync(file.path);

      if (!content) {
        return res.status(500).json({ error: 'Failed to parse PDF' });
      }

      return res.json({ content, type: 'pdf' });
    }

    fs.unlinkSync(file.path);
    return res.status(400).json({ error: 'Unsupported file type' });

  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
});


// 🧠 CHAT (SMART WEB SEARCH)
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    console.log("User:", message);

    // 🔍 Always try web search
    let webData = await searchWeb(message);

    console.log("Web data:", webData);

    let finalPrompt = message;

    if (webData && webData.length > 20) {
      finalPrompt = `
Use this real-time data to answer accurately:

${webData}

User question:
${message}
`;
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: finalPrompt }
      ]
    });

    return res.json({
      content: completion.choices[0]?.message?.content
    });

  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({ error: err.message });
  }
});


// ⚡ STREAM CHAT (ALSO SMART)
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      res.end();
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let webData = await searchWeb(message);

    let finalPrompt = message;

    if (webData && webData.length > 20) {
      finalPrompt = `
Use this real-time data to answer accurately:

${webData}

User question:
${message}
`;
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: finalPrompt }
      ],
      stream: true
    });

    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content;

      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

  } catch (err) {
    console.error('Stream error:', err);
    res.end();
  }
});


// ❤️ HEALTH CHECK
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});


// 🚀 START SERVER
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});