// YouTube API key - You'll need to get your own from Google Cloud Console
// Visit: https://console.cloud.google.com/apis/credentials
const API_KEY = "AIzaSyDNKn8VOFLO8QSnSDjAM3Y7zr63IZXZC4w";

// Function to search for YouTube videos
async function searchYouTubeVideos(query) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=9&q=${encodeURIComponent(
        query
      )}&type=video&key=${API_KEY}`
    );

    if (!response.ok) {
      throw new Error("YouTube API request failed");
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Error searching YouTube:", error);
    return [];
  }
}

// Function to get video details including duration
async function getVideoDetails(videoIds) {
  if (!videoIds.length) return [];

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${videoIds.join(
        ","
      )}&key=${API_KEY}`
    );

    if (!response.ok) {
      throw new Error("YouTube API video details request failed");
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Error fetching video details:", error);
    return [];
  }
}

// Function to get captions/transcripts (this would require a YouTube transcript API or service)
// Note: YouTube doesn't provide direct API access to captions, so we're generating sample timestamps
function generateSampleTimestamps(videoTitle, query) {
  const words = query.toLowerCase().split(" ");
  const timestamps = [];

  // Generate 2-4 sample timestamps
  const numTimestamps = Math.floor(Math.random() * 3) + 2;

  for (let i = 0; i < numTimestamps; i++) {
    // Random time between 0:30 and 10:00
    const seconds = Math.floor(Math.random() * 570) + 30;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const timeString = `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;

    // Create a relevant context for the timestamp
    const randomWord = words[Math.floor(Math.random() * words.length)];
    const context = `${randomWord} mentioned`;

    timestamps.push({
      time: seconds,
      text: context,
      timeString: timeString,
    });
  }

  // Sort timestamps chronologically
  return timestamps.sort((a, b) => a.time - b.time);
}

// Parse YouTube video duration from ISO 8601 format
function parseDuration(duration) {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);

  const hours = (match[1] && match[1].replace("H", "")) || 0;
  const minutes = (match[2] && match[2].replace("M", "")) || 0;
  const seconds = (match[3] && match[3].replace("S", "")) || 0;

  let result = "";
  if (hours > 0) {
    result += `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  } else {
    result += `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  return result;
}
