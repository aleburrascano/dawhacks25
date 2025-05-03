// YouTube API key - You'll need to get your own from Google Cloud Console
// Visit: https://console.cloud.google.com/apis/credentials
const API_KEY = "AIzaSyDOT-kCYzGPcxFI1Qw4_5fxVqea2UD4v-E";

// Function to search for YouTube videos
async function searchYouTubeVideos(query) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=9&q=${encodeURIComponent(
        query
      )}&type=video&key=${API_KEY}&relevanceLanguage=en`
    );

    if (!response.ok) {
      // If API fails, return mock data
      console.error("YouTube API request failed, using mock data");
      return generateMockVideos(query);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Error searching YouTube:", error);
    // Return mock data on error
    return generateMockVideos(query);
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
      // If API fails, enhance mock data
      console.error(
        "YouTube API video details request failed, using mock data"
      );
      return enhanceMockVideoDetails(videoIds);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Error fetching video details:", error);
    return enhanceMockVideoDetails(videoIds);
  }
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

// Generate mock video data if API fails
function generateMockVideos(query) {
  const videos = [];
  const words = query.split(" ");

  for (let i = 0; i < 5; i++) {
    const word = words[Math.floor(Math.random() * words.length)];
    videos.push({
      id: { videoId: `mock${i}` },
      snippet: {
        title: `${
          word.charAt(0).toUpperCase() + word.slice(1)
        } Video Tutorial ${i + 1}`,
        description: `Learn about ${query} in this helpful tutorial.`,
        thumbnails: {
          high: {
            url: `https://via.placeholder.com/480x360.png?text=Video+${i + 1}`,
          },
        },
        channelTitle: `${word}Channel`,
      },
    });
  }

  return videos;
}

// Enhance mock videos with additional details
function enhanceMockVideoDetails(videoIds) {
  return videoIds.map((id, index) => {
    return {
      id: id,
      snippet: {
        title: `Video Tutorial ${index + 1}`,
        description: "Mock video description",
        thumbnails: {
          high: {
            url: `https://via.placeholder.com/480x360.png?text=Video+${
              index + 1
            }`,
          },
        },
        channelTitle: `Channel ${index + 1}`,
      },
      contentDetails: {
        duration: "PT8M15S",
      },
      statistics: {
        viewCount: `${Math.floor(Math.random() * 1000000)}`,
      },
    };
  });
}
