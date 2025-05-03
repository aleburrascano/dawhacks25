// Gemini API Integration for YouTube Video Finder
// This file handles sending transcript data and selected text to Gemini API
// to find the most relevant timestamp in a video

// You'll need to get your own API key from Google AI Studio
// Visit: https://makersuite.google.com/
const GEMINI_API_KEY = "AIzaSyCVB-539SxRudfefLjCRGZieVvgaKAk5m4"; // Your original API key
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

// Function to send transcript and selected text to Gemini
async function findRelevantTimestamp(transcript, selectedText) {
  try {
    console.log("Calling Gemini API with transcript and text:", transcript.length, selectedText);
    
    // Prepare the transcript data in a clean format for Gemini
    const transcriptFormatted = transcript.map(segment => 
      `[${formatTime(segment.start)}] ${segment.text}`
    ).join('\n');
    
    // Limit transcript length to avoid exceeding API limits
    const truncatedTranscript = transcriptFormatted.length > 10000 
      ? transcriptFormatted.substring(0, 10000) + "..."
      : transcriptFormatted;
    
    // Create the prompt for Gemini
    const prompt = `
I have a YouTube video transcript and some selected text. 
Please analyze at which timestamp in the transcript the selected text is most relevant or discussed.

SELECTED TEXT:
${selectedText}

TRANSCRIPT:
${truncatedTranscript}

Please respond with ONLY the single most relevant timestamp in the format "MM:SS" and nothing else. 
If there are multiple relevant timestamps, choose the one that's most directly related to the selected text.
If no timestamps are relevant, respond with "00:00".
    `;

    console.log("Sending request to Gemini API...");

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
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log("Gemini API response:", data);
    
    // Extract the timestamp from Gemini's response
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const responseText = data.candidates[0].content.parts[0].text.trim();
      console.log("Gemini response text:", responseText);
      
      // Extract timestamp using regex (looking for MM:SS format)
      const timeMatch = responseText.match(/(\d+:\d+)/);
      if (timeMatch) {
        console.log("Extracted timestamp:", timeMatch[0]);
        return timeMatch[0];
      }
    }
    
    console.warn("No timestamp found in Gemini response, falling back");
    return fallbackRelevantTimestamp(transcript, selectedText);
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return fallbackRelevantTimestamp(transcript, selectedText);
  }
}

// Function to get a descriptive title for the timestamp from Gemini
async function getTimestampDescription(transcript, timestamp, selectedText) {
  try {
    // Find the transcript segment closest to the timestamp
    const timeInSeconds = timeToSeconds(timestamp);
    let closestSegment = null;
    let minDiff = Infinity;
    
    for (const segment of transcript) {
      const diff = Math.abs(segment.start - timeInSeconds);
      if (diff < minDiff) {
        minDiff = diff;
        closestSegment = segment;
      }
    }
    
    if (!closestSegment) {
      return `AI-identified moment for "${selectedText}"`;
    }
    
    // Get context (before and after the segment)
    const segmentIndex = transcript.indexOf(closestSegment);
    const contextStart = Math.max(0, segmentIndex - 2);
    const contextEnd = Math.min(transcript.length - 1, segmentIndex + 2);
    
    const context = transcript
      .slice(contextStart, contextEnd + 1)
      .map(seg => seg.text)
      .join(" ");
    
    // Create the prompt for Gemini
    const prompt = `
I have a segment from a YouTube video transcript at timestamp ${timestamp}. Please create a short (5-8 words) descriptive title that summarizes what's being discussed at this point.

SELECTED QUERY:
${selectedText}

TRANSCRIPT SEGMENT:
${context}

Please respond with ONLY a short descriptive title (5-8 words) and nothing else.
If you can't determine a good title, respond with "Key point about ${selectedText}".
    `;

    console.log("Sending description request to Gemini API...");

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
      return `AI-identified moment for "${selectedText}"`;
    }

    const data = await response.json();
    
    // Extract the description from Gemini's response
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const responseText = data.candidates[0].content.parts[0].text.trim();
      if (responseText && responseText.length > 0) {
        return responseText;
      }
    }
    
    return `AI-identified moment for "${selectedText}"`;
  } catch (error) {
    console.error("Error getting timestamp description:", error);
    return `AI-identified moment for "${selectedText}"`;
  }
}

// Fallback method for finding relevant timestamp if API fails
function fallbackRelevantTimestamp(transcript, selectedText) {
  console.log("Using fallback method to find timestamp");
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