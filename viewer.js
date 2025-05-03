// viewer.js
document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(location.search);
    const selectedText = params.get("text");
    document.getElementById("text").textContent = selectedText || "No text found.";
  });
  