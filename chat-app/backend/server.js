require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const multer = require('multer');
const pdf = require('pdf-parse');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Groq client
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Check API key
if (!process.env.GROQ_API_KEY) {
  console.error('❌ ERROR: GROQ_API_KEY not found in .env file');
} else if (process.env.GROQ_API_KEY.startsWith('gsk_')) {
  console.log('✅ GROQ_API_KEY is configured');
} else {
  console.error('⚠️ GROQ_API_KEY may be invalid');
}

app.use(cors());
app.use(express.json());

// Parse PDF file and return text
async function parsePDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (err) {
    console.error('❌ PDF parse error:', err.message);
    return null;
  }
}

// File upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const ext = file.originalname.toLowerCase().split('.').pop();

    if (ext === 'txt') {
      const content = fs.readFileSync(file.path, 'utf-8');
      fs.unlinkSync(file.path); // Clean up
      return res.json({ content, type: 'text' });
    } 
    
    if (ext === 'pdf') {
      const content = await parsePDF(file.path);
      fs.unlinkSync(file.path); // Clean up
      
      if (!content) {
        return res.status(500).json({ error: 'Failed to parse PDF' });
      }
      
      return res.json({ content, type: 'pdf' });
    }

    // Unsupported file type
    fs.unlinkSync(file.path);
    return res.status(400).json({ error: 'Unsupported file type' });

  } catch (err) {
    console.error('❌ Upload error:', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

// Chat endpoint (non-streaming)
app.post('/api/chat', async (req, res) => {
  try {
    const { message, systemPrompt, fileContent } = req.body;

    console.log('📥 Incoming message:', message?.substring(0, 50));

    // Validate input
    if (!message || typeof message !== 'string') {
      console.error('❌ Invalid message');
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!process.env.GROQ_API_KEY) {
      console.error('❌ API key missing');
      return res.status(500).json({ error: 'API key missing' });
    }

    // Check if it's an image
    const isImage = fileContent?.startsWith('[IMAGE:');
    let imageBase64 = null;
    if (isImage) {
      const colonIndex = fileContent.indexOf(']\n');
      if (colonIndex > -1) {
        imageBase64 = fileContent.substring(colonIndex + 2);
      }
    }

    // Build user message with optional file content
    const MAX_FILE_CONTENT_LENGTH = 10000;
    let userContent = message;
    if (fileContent && !isImage) {
      let truncatedContent = fileContent;
      if (fileContent.length > MAX_FILE_CONTENT_LENGTH) {
        truncatedContent = fileContent.substring(0, MAX_FILE_CONTENT_LENGTH) + '\n\n[...Content truncated due to length...]';
        console.log('📎 File content truncated');
      }
      userContent = `You are given a file:\n${truncatedContent}\n\nUser question:\n${message}`;
      console.log('📎 File content attached');
    } else if (isImage) {
      userContent = `Describe and analyze this image.\n\nUser question: ${message}`;
      console.log('🖼️ Image attached');
    }

    // Use vision-capable model for images
    const model = isImage ? 'llama-3.2-11b-vision-preview' : 'llama-3.3-70b-versatile';
    
    // Build messages for Groq API
    let messages;
    if (isImage && imageBase64) {
      messages = [
        {
          role: 'system',
          content: systemPrompt || 'You are a helpful AI assistant that analyzes images.'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: userContent },
            {
              type: 'image_url',
              image_url: { url: imageBase64 }
            }
          ]
        }
      ];
    } else {
      messages = [
        {
          role: 'system',
          content: systemPrompt || 'You are a helpful AI assistant.'
        },
        {
          role: 'user',
          content: userContent
        }
      ];
    }

    console.log('📤 Calling Groq API with model:', model);

    // Call Groq API using OpenAI client
    const completion = await groq.chat.completions.create({
      model: model,
      messages: messages,
      max_tokens: isImage ? 2048 : 1024,
      temperature: 0.7
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      console.error('❌ No content in response');
      return res.status(500).json({ error: 'Invalid AI response' });
    }

    console.log('✅ Reply:', content.substring(0, 50));

    // Return JSON response like { content: "AI reply" }
    return res.json({ content });

  } catch (err) {
    console.error('❌ Server error - Full error:', err);
    console.error('❌ Stack trace:', err.stack);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// SSE Streaming endpoint
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { message, systemPrompt, fileContent, history } = req.body;

    console.log('📥 Incoming streaming message:', message?.substring(0, 50));

    // Validate input
    if (!message || typeof message !== 'string') {
      res.write(`data: ${JSON.stringify({ error: 'Message is required' })}\n\n`);
      res.end();
      return;
    }

    if (!process.env.GROQ_API_KEY) {
      res.write(`data: ${JSON.stringify({ error: 'API key missing' })}\n\n`);
      res.end();
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'none');

    // Check if it's an image
    const isImage = fileContent?.startsWith('[IMAGE:');
    let imageBase64 = null;
    if (isImage) {
      const colonIndex = fileContent.indexOf(']\n');
      if (colonIndex > -1) {
        imageBase64 = fileContent.substring(colonIndex + 2);
      }
    }

    // Build user message with optional file content
    const MAX_FILE_CONTENT_LENGTH = 10000;
    let userContent = message;
    if (fileContent && !isImage) {
      let truncatedContent = fileContent;
      if (fileContent.length > MAX_FILE_CONTENT_LENGTH) {
        truncatedContent = fileContent.substring(0, MAX_FILE_CONTENT_LENGTH) + '\n\n[...Content truncated due to length...]';
      }
      userContent = `You are given a file:\n${truncatedContent}\n\nUser question:\n${message}`;
    } else if (isImage) {
      userContent = `Describe and analyze this image.\n\nUser question: ${message}`;
    }

    // Use vision-capable model for images
    const model = isImage ? 'llama-3.2-11b-vision-preview' : 'llama-3.3-70b-versatile';
    
    // Build messages for Groq API with history
    const groqMessages = [
      {
        role: 'system',
        content: systemPrompt || 'You are a helpful AI assistant.'
      }
    ];

    // Add history (last 10 messages)
    if (history && history.length > 0) {
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        groqMessages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        });
      }
    }

    // Add current message
    if (isImage && imageBase64) {
      groqMessages.push({
        role: 'user',
        content: [
          { type: 'text', text: userContent },
          { type: 'image_url', image_url: { url: imageBase64 } }
        ]
      });
    } else {
      groqMessages.push({
        role: 'user',
        content: userContent
      });
    }

    console.log('📤 Calling Groq API (streaming) with model:', model);

    // Call Groq API with streaming using async iterator
    const completion = await groq.chat.completions.create({
      model: model,
      messages: groqMessages,
      max_tokens: isImage ? 2048 : 1024,
      temperature: 0.7,
      stream: true
    });

    // Stream response using for await...of
    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    console.log('✅ Streaming complete');
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

  } catch (err) {
    console.error('❌ Server error:', err);
    res.write(`data: ${JSON.stringify({ error: 'Server error: ' + err.message })}\n\n`);
    res.end();
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));