document.addEventListener("DOMContentLoaded", () => {
  // Get the search query from URL
  const params = new URLSearchParams(location.search);
  const query = params.get("query");

  if (!query) {
    // Check if there's a saved query in storage
    try {
      chrome.storage.local.get(["lastSearchQuery"], (result) => {
        if (result.lastSearchQuery) {
          performSearch(result.lastSearchQuery);
        } else {
          showNoResults();
        }
      });
    } catch (error) {
      console.error("Error accessing chrome storage:", error);
      showNoResults();
    }
    return;
  }

  performSearch(query);
});

async function performSearch(query) {
  // Display the search query
  document.getElementById("searchQuery").textContent = query;

  // Load videos in parallel with timestamps to speed up display
  loadVideos(query);
}

async function loadVideos(query) {
  try {
    // Show loading indicator
    document.getElementById("loading").style.display = "block";

    // Search for videos (with built-in fallbacks)
    const searchResults = await searchYouTubeVideos(query);

    if (!searchResults || !searchResults.length) {
      showNoResults();
      return;
    }

    // Get video IDs
    const videoIds = searchResults.map((item) => item.id.videoId);

    // Get additional video details
    const videoDetails = await getVideoDetails(videoIds);

    // Hide loading indicator
    document.getElementById("loading").style.display = "none";

    // Display results container
    const resultsContainer = document.getElementById("results");
    resultsContainer.innerHTML = "";
    resultsContainer.style.display = "grid";

    // Process videos in two batches for better UX
    // First batch: First 3 videos
    await processVideoBatch(videoDetails.slice(0, 3), query, resultsContainer);

    // Second batch: Remaining videos
    if (videoDetails.length > 3) {
      // Use a slight delay to prevent UI blocking
      setTimeout(async () => {
        await processVideoBatch(videoDetails.slice(3), query, resultsContainer);
      }, 100);
    }
  } catch (error) {
    console.error("Error loading videos:", error);
    showNoResults();
  }
}

async function processVideoBatch(videos, query, container) {
  // Process each video
  for (const video of videos) {
    // Fetch transcript and find relevant timestamps
    const transcript = await fetchTranscript(video.id);
    const timestamps = findMatchingTimestamps(transcript, query);

    // Display the video card
    displayVideoCard(video, query, timestamps, container);
  }
}

function displayVideoCard(video, query, timestamps, container) {
  // Parse duration
  const duration =
    video.contentDetails && video.contentDetails.duration
      ? parseDuration(video.contentDetails.duration)
      : "3:45"; // Fallback duration

  // Create HTML for video card
  const videoElement = document.createElement("div");
  videoElement.className = "video-card";

  // Get thumbnail URL or use placeholder
  const thumbnailUrl =
    video.snippet?.thumbnails?.high?.url ||
    `https://via.placeholder.com/480x360.png?text=Video`;

  // Sort timestamps by relevance (highest first)
  const sortedTimestamps = [...timestamps].sort(
    (a, b) => b.relevance - a.relevance
  );

  videoElement.innerHTML = `
        <div class="video-thumbnail">
          <img src="${thumbnailUrl}" alt="${video.snippet.title || "Video"}">
        </div>
        <div class="video-info">
          <h3 class="video-title">${video.snippet.title || "Video Title"}</h3>
          <div class="video-channel">${
            video.snippet.channelTitle || "Channel"
          }</div>
          <div class="video-details">
            <span>${formatViewCount(
              video.statistics?.viewCount || "1000"
            )} views</span>
            <span> • </span>
            <span>${duration}</span>
          </div>
          <div class="video-timestamps">
            <p>Relevant moments:</p>
            <div class="timestamps-container">
              ${
                sortedTimestamps.length > 0
                  ? sortedTimestamps
                      .map(
                        (ts) => `
                    <span class="timestamp ${
                      ts.relevance >= 2 ? "actual" : "generated"
                    }" 
                        data-time="${ts.time}" 
                        onclick="openVideoAtTimestamp('${video.id}', ${
                          ts.time
                        })">
                      ${ts.timeString} - ${ts.text}
                    </span>
                  `
                      )
                      .join("")
                  : `<span class="no-timestamps">No specific timestamps found</span>`
              }
            </div>
          </div>
          <a href="https://www.youtube.com/watch?v=${video.id}" 
             class="watch-button" target="_blank">
            Watch on YouTube
          </a>
        </div>
      `;

  container.appendChild(videoElement);
}

function formatViewCount(viewCount) {
  const count = parseInt(viewCount, 10);

  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }

  return count.toString();
}

function showNoResults() {
  document.getElementById("loading").style.display = "none";
  document.getElementById("noResults").style.display = "block";
}

// Function to open video at specific timestamp
function openVideoAtTimestamp(videoId, timestamp) {
  const url = `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(
    timestamp
  )}s`;
  window.open(url, "_blank");
}

// Make the function available globally
window.openVideoAtTimestamp = openVideoAtTimestamp;
