document.addEventListener("DOMContentLoaded", async () => {
  // Get the search query from URL
  const params = new URLSearchParams(location.search);
  const query = params.get("query");

  if (!query) {
    showNoResults();
    return;
  }

  // Display the search query
  document.getElementById("searchQuery").textContent = query;

  // Search for videos
  const searchResults = await searchYouTubeVideos(query);

  if (!searchResults.length) {
    showNoResults();
    return;
  }

  // Get video IDs
  const videoIds = searchResults.map((item) => item.id.videoId);

  // Get additional video details
  const videoDetails = await getVideoDetails(videoIds);

  // Hide loading indicator
  document.getElementById("loading").style.display = "none";

  // Process and display results
  if (videoDetails.length > 0) {
    displayVideoResults(videoDetails, query);
  } else {
    showNoResults();
  }
});

function displayVideoResults(videos, query) {
  const resultsContainer = document.getElementById("results");
  resultsContainer.innerHTML = "";
  resultsContainer.style.display = "grid";

  videos.forEach((video) => {
    // Generate sample timestamps
    const timestamps = generateSampleTimestamps(video.snippet.title, query);

    // Parse duration
    const duration =
      video.contentDetails && video.contentDetails.duration
        ? parseDuration(video.contentDetails.duration)
        : "Unknown";

    // Create HTML for video card
    const videoElement = document.createElement("div");
    videoElement.className = "video-card";
    videoElement.innerHTML = `
        <div class="video-thumbnail">
          <img src="${video.snippet.thumbnails.high.url}" alt="${
      video.snippet.title
    }">
        </div>
        <div class="video-info">
          <h3 class="video-title">${video.snippet.title}</h3>
          <div class="video-channel">${video.snippet.channelTitle}</div>
          <div class="video-details">
            <span>${formatViewCount(
              video.statistics?.viewCount || "0"
            )} views</span>
            <span> • </span>
            <span>${duration}</span>
          </div>
          <div class="video-timestamps">
            <p>Relevant moments:</p>
            <div class="timestamps-container">
              ${timestamps
                .map(
                  (ts) => `
                <span class="timestamp" data-time="${ts.time}" 
                    onclick="openVideoAtTimestamp('${video.id}', ${ts.time})">
                  ${ts.timeString} - ${ts.text}
                </span>
              `
                )
                .join("")}
            </div>
          </div>
          <a href="https://www.youtube.com/watch?v=${video.id}" 
             class="watch-button" target="_blank">
            Watch on YouTube
          </a>
        </div>
      `;

    resultsContainer.appendChild(videoElement);
  });
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
  const url = `https://www.youtube.com/watch?v=${videoId}&t=${timestamp}s`;
  window.open(url, "_blank");
}

// Make the function available globally
window.openVideoAtTimestamp = openVideoAtTimestamp;
