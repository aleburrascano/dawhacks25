document.getElementById('openMindMap').addEventListener('click', () => {
  console.log("hello????")
  chrome.tabs.create({ url: chrome.runtime.getURL('mindmap.html') });
});

document.addEventListener("DOMContentLoaded", () => {
  setupTimestampHandlers();

  // Get the search query from URL
  const params = new URLSearchParams(location.search);
  const query = params.get("query");

  if (!query) {
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

function setupTimestampHandlers() {
  document.addEventListener("click", (e) => {
    const timestampEl = e.target.closest(".timestamp");
    if (!timestampEl) return;

    e.preventDefault();
    const videoId = timestampEl.dataset.videoId;
    const timestamp = parseFloat(timestampEl.dataset.timestamp);
    openVideoAtTimestamp(videoId, timestamp);
  });
}

async function performSearch(query) {
  document.getElementById("searchQuery").textContent = query;
  loadVideos(query);
}

async function loadVideos(query) {
  try {
    document.getElementById("loading").style.display = "block";

    const searchResults = await searchYouTubeVideos(query);

    if (!searchResults || !searchResults.length) {
      showNoResults();
      return;
    }

    const videoIds = searchResults.map((item) => item.id.videoId);
    const videoDetails = await getVideoDetails(videoIds);

    document.getElementById("loading").style.display = "none";

    const resultsContainer = document.getElementById("results");
    resultsContainer.innerHTML = "";
    resultsContainer.style.display = "grid";

    await processVideoBatch(videoDetails.slice(0, 3), query, resultsContainer);

    if (videoDetails.length > 3) {
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
  for (const video of videos) {
    const transcript = await fetchTranscript(video.id);
    
    // First get regular timestamps
    const timestamps = findMatchingTimestamps(transcript, query);
    
    // Then get Gemini's opinion on the most relevant timestamp
    let geminiTimestamp = null;
    try {
      // Only call Gemini API if we have a transcript and the query isn't too short
      if (transcript && transcript.length > 0 && query.length > 3) {
        const timeString = await findRelevantTimestamp(transcript, query);
        if (timeString && timeString !== "00:00") {
          const seconds = timeToSeconds(timeString);
          
          // Create a special highlighted timestamp from Gemini
          geminiTimestamp = {
            time: seconds,
            timeString: timeString,
            text: `🔍 AI-identified most relevant point for "${query}"`,
            relevance: 5, // Maximum relevance
            isGemini: true
          };
        }
      }
    } catch (error) {
      console.error("Error getting Gemini timestamp:", error);
    }
    
    // Add the Gemini timestamp if we got one
    const allTimestamps = geminiTimestamp 
      ? [geminiTimestamp, ...timestamps] 
      : timestamps;
    
    displayVideoCard(video, query, allTimestamps, container);
  }
}

function displayVideoCard(video, query, timestamps, container) {
  const duration = video.contentDetails?.duration
    ? parseDuration(video.contentDetails.duration)
    : "3:45";

  const videoElement = document.createElement("div");
  videoElement.className = "video-card";

  const thumbnailUrl =
    video.snippet?.thumbnails?.high?.url ||
    `https://via.placeholder.com/480x360.png?text=Video`;

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
                  <a href="#" class="timestamp ${
                    ts.isGemini ? "gemini" : ts.relevance >= 3 ? "actual" : "generated"
                  }" 
                      data-video-id="${video.id}" 
                      data-timestamp="${ts.time}">
                    ${ts.timeString} - ${ts.text}
                  </a>
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

function openVideoAtTimestamp(videoId, timestamp) {
  const seconds = Math.floor(timestamp);
  chrome.tabs.create({
    url: `https://www.youtube.com/watch?v=${videoId}&t=${seconds}s`,
    active: true,
  });
}

window.openVideoAtTimestamp = openVideoAtTimestamp;