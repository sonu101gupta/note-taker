// API Base URL
const API_URL = "http://localhost:3001";

// DOM Elements
const form = document.getElementById("meeting-form") as HTMLFormElement;
const input = document.getElementById("url") as HTMLInputElement;
const statusElem = document.getElementById("status") as HTMLDivElement;
const meetingsList = document.getElementById("meetings-list") as HTMLDivElement;
const liveTranscript = document.getElementById("live-transcript") as HTMLDivElement;
const activeMeetingSelect = document.getElementById("active-meeting-select") as HTMLSelectElement;
const refreshMeetingsBtn = document.getElementById("refresh-meetings") as HTMLButtonElement;
const refreshLiveBtn = document.getElementById("refresh-live") as HTMLButtonElement;

// Types
interface Meeting {
  meetingId: string;
  createdAt: string;
  segments: Segment[];
  summary?: Summary[];
}

interface Segment {
  speaker: string;
  text: string;
  start: number;
  end: number;
}

interface Summary {
  summaryText: string;
  generatedAt: string;
  model: string;
}

interface ActiveJob {
  id: string;
  meetingUrl: string;
  meetingId: string | null;
  status: string;
  createdAt: string;
}

// State
let currentActiveMeetingId: string | null = null;
let liveTranscriptInterval: number | null = null;

// Utility Functions
function showStatus(message: string, type: "success" | "error" | "info") {
  statusElem.textContent = message;
  statusElem.className = `status-message show ${type}`;
  setTimeout(() => {
    statusElem.className = "status-message";
  }, 5000);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(start: number, end: number): string {
  const duration = end - start;
  if (duration < 60) return `${duration}s`;
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  return `${minutes}m ${seconds}s`;
}

// Submit New Meeting
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = input.value.trim();

  if (!url) {
    showStatus("Please enter a meeting URL", "error");
    return;
  }

  showStatus("Starting bot...", "info");
  
  try {
    const res = await fetch(`${API_URL}/submit-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const text = await res.text();
    
    if (res.ok) {
      showStatus(text + " - Refreshing active meetings...", "success");
      input.value = "";
      setTimeout(() => {
        loadActiveMeetings();
      }, 2000);
    } else {
      showStatus(`Error: ${text}`, "error");
    }
  } catch (err) {
    showStatus("Failed to start bot. Make sure the backend is running.", "error");
    console.error(err);
  }
});

// Load Past Meetings
async function loadMeetings() {
  try {
    const res = await fetch(`${API_URL}/meetings`);
    if (!res.ok) throw new Error("Failed to fetch meetings");

    const meetings: Meeting[] = await res.json();

    if (meetings.length === 0) {
      meetingsList.innerHTML = '<p class="placeholder">No meetings recorded yet. Start your first meeting!</p>';
      return;
    }

    meetingsList.innerHTML = meetings
      .map((meeting) => {
        const summary = meeting.summary && meeting.summary.length > 0 ? meeting.summary[0] : null;
        const segmentCount = meeting.segments?.length || 0;

        return `
          <div class="meeting-card">
            <div class="meeting-header">
              <div>
                <div class="meeting-id">ID: ${meeting.meetingId}</div>
                <div class="meeting-segments-count">📝 ${segmentCount} transcript segments</div>
              </div>
              <div class="meeting-date">📅 ${formatDate(meeting.createdAt)}</div>
            </div>
            
            ${
              summary
                ? `
              <div class="meeting-summary">
                <h4>✨ AI Summary</h4>
                <div class="meeting-summary-text">${summary.summaryText}</div>
                <div style="margin-top: 8px; font-size: 11px; color: #5f6368;">
                  Generated: ${formatDate(summary.generatedAt)} | Model: ${summary.model}
                </div>
              </div>
            `
                : `
              <div class="meeting-no-summary">
                ⏳ Summary pending or transcript too short
              </div>
            `
            }
          </div>
        `;
      })
      .join("");
  } catch (err) {
    meetingsList.innerHTML = '<p class="placeholder">Error loading meetings. Please try again.</p>';
    console.error("Error loading meetings:", err);
  }
}

// Load Active Meetings
async function loadActiveMeetings() {
  try {
    const res = await fetch(`${API_URL}/active-meetings`);
    if (!res.ok) throw new Error("Failed to fetch active meetings");

    const activeJobs: ActiveJob[] = await res.json();

    // Clear and repopulate select
    activeMeetingSelect.innerHTML = '<option value="">Select an active meeting...</option>';

    if (activeJobs.length === 0) {
      activeMeetingSelect.innerHTML += '<option value="" disabled>No active meetings</option>';
      return;
    }

    activeJobs.forEach((job) => {
      const option = document.createElement("option");
      
      if (job.meetingId) {
        // Meeting has started recording
        option.value = job.meetingId;
        option.textContent = `🔴 LIVE - ${job.meetingUrl.substring(0, 40)}... (${formatDate(job.createdAt)})`;
      } else {
        // Bot is trying to join or waiting
        option.value = `pending-${job.id}`;
        option.textContent = `⏳ Joining... - ${job.meetingUrl.substring(0, 40)}... (${formatDate(job.createdAt)})`;
        option.disabled = true; // Can't view transcript yet
      }
      
      activeMeetingSelect.appendChild(option);
    });
  } catch (err) {
    console.error("Error loading active meetings:", err);
  }
}

// Load Live Transcript
async function loadLiveTranscript(meetingId: string) {
  try {
    const res = await fetch(`${API_URL}/live-transcript/${meetingId}`);
    if (!res.ok) throw new Error("Transcript not found");

    const transcript: { segments: Segment[] } = await res.json();

    if (!transcript.segments || transcript.segments.length === 0) {
      liveTranscript.innerHTML = '<p class="placeholder">No transcript available yet. Waiting for speech...</p>';
      return;
    }

    liveTranscript.innerHTML = `
      <div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
        <span class="live-badge">Live Recording</span>
        <span style="font-size: 12px; color: #5f6368;">${transcript.segments.length} segments</span>
      </div>
      ${transcript.segments
        .map(
          (seg) => `
        <div class="transcript-item">
          <div class="transcript-speaker">${seg.speaker}</div>
          <div class="transcript-text">${seg.text}</div>
          <div class="transcript-time">${formatDuration(seg.start, seg.end)}</div>
        </div>
      `
        )
        .join("")}
    `;

    // Auto-scroll to bottom
    liveTranscript.scrollTop = liveTranscript.scrollHeight;
  } catch (err) {
    liveTranscript.innerHTML = '<p class="placeholder">Error loading transcript. Please try again.</p>';
    console.error("Error loading live transcript:", err);
  }
}

// Start/Stop Live Transcript Polling
function startLiveTranscriptPolling(meetingId: string) {
  stopLiveTranscriptPolling();
  currentActiveMeetingId = meetingId;
  
  // Load immediately
  loadLiveTranscript(meetingId);
  
  // Then poll every 3 seconds
  liveTranscriptInterval = window.setInterval(() => {
    loadLiveTranscript(meetingId);
  }, 3000);
}

function stopLiveTranscriptPolling() {
  if (liveTranscriptInterval) {
    clearInterval(liveTranscriptInterval);
    liveTranscriptInterval = null;
  }
  currentActiveMeetingId = null;
}

// Event Listeners
activeMeetingSelect.addEventListener("change", (e) => {
  const meetingId = (e.target as HTMLSelectElement).value;
  
  if (meetingId) {
    startLiveTranscriptPolling(meetingId);
  } else {
    stopLiveTranscriptPolling();
    liveTranscript.innerHTML = '<p class="placeholder">No active meeting selected. Select a meeting from the dropdown above.</p>';
  }
});

refreshMeetingsBtn.addEventListener("click", () => {
  loadMeetings();
  showStatus("Meetings refreshed!", "success");
});

refreshLiveBtn.addEventListener("click", () => {
  if (currentActiveMeetingId) {
    loadLiveTranscript(currentActiveMeetingId);
    showStatus("Live transcript refreshed!", "success");
  } else {
    showStatus("No active meeting selected", "info");
  }
});

// Initialize
async function init() {
  console.log("Initializing Meeting Bot Dashboard...");
  await loadMeetings();
  await loadActiveMeetings();
  
  // Refresh active meetings every 30 seconds
  setInterval(loadActiveMeetings, 30000);
  
  // Refresh past meetings every 60 seconds
  setInterval(loadMeetings, 60000);
}

// Start the app
init();
