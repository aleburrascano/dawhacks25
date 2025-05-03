// Gemini API Integration for YouTube Video Finder
// This file handles sending transcript data and selected text to Gemini API
// to find the most relevant timestamp in a video

// You'll need to get your own API key from Google AI Studio
// Visit: https://makersuite.google.com/
const GEMINI_API_KEY = "AIzaSyCVB-539SxRudfefLjCRGZieVvgaKAk5m4";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

// Function to send transcript and selected text to Gemini
async function findRelevantTimestamp(transcript, selectedText) {
  try {
    // Prepare the transcript data in a clean format for Gemini
    const transcriptFormatted = transcript.map(segment => 
      `[${formatTime(segment.start)}] ${segment.text}`
    ).join('\n');
    
    // Create the prompt for Gemini
    const prompt = `
I have a YouTube video transcript and some selected text. 
Please analyze at which timestamp in the transcript the selected text is most relevant or discussed.

SELECTED TEXT:
${selectedText}

TRANSCRIPT:
${transcriptFormatted}

Please respond with ONLY the single most relevant timestamp in the format "MM:SS" and nothing else. 
If there are multiple relevant timestamps, choose the one that's most directly related to the selected text.
If no timestamps are relevant, respond with "00:00".
    `;

    // Make request to Gemini API
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      console.error("Gemini API error:", await response.text());
      return fallbackRelevantTimestamp(transcript, selectedText);
    }

    const data = await response.json();
    
    // Extract the timestamp from Gemini's response
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const responseText = data.candidates[0].content.parts[0].text.trim();
      console.log("Gemini response:", responseText);
      
      // Extract timestamp using regex (looking for MM:SS format)
      const timeMatch = responseText.match(/(\d+:\d+)/);
      if (timeMatch) {
        return timeMatch[0];
      }
    }
    
    return fallbackRelevantTimestamp(transcript, selectedText);
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return fallbackRelevantTimestamp(transcript, selectedText);
  }
}

// Fallback method for finding relevant timestamp if API fails
function fallbackRelevantTimestamp(transcript, selectedText) {
  // Simple keyword matching fallback
  const keywords = selectedText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  if (keywords.length === 0) {
    return transcript.length > 0 ? formatTime(transcript[0].start) : "00:00";
  }
  
  let bestMatch = { segment: null, score: 0 };
  
  transcript.forEach(segment => {
    const text = segment.text.toLowerCase();
    let score = 0;
    
    // Check for exact phrase match (highest priority)
    if (text.includes(selectedText.toLowerCase())) {
      score += 10;
    }
    
    // Check for keyword matches
    keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        score += 1;
      }
    });
    
    if (score > bestMatch.score) {
      bestMatch = { segment, score };
    }
  });
  
  return bestMatch.segment ? formatTime(bestMatch.segment.start) : "00:00";
}

// Helper function to format seconds to MM:SS
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Convert MM:SS format to seconds
function timeToSeconds(timeString) {
  const [minutes, seconds] = timeString.split(':').map(Number);
  return minutes * 60 + seconds;
}