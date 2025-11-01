import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { summarizeTranscript } from "../summarize";
import {
  createMeetingJob,
  getTranscript,
  saveSummary,
  updateMeetingStatus,
} from "../storage";
import { launchBotContainer } from "./launchBot";

const prisma = new PrismaClient();

const app = express();
// turn on CORS for frontend at localhost:5173
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["POST", "GET", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }),
);

// parse JSON requests
app.use(express.json());

// simple logging for requests
app.use((req, _, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

function validateMeetLink(url: string) {
  const prefix = /^https:\/\/meet\.google\.com/;
  return prefix.test(url);
}

// endpoint to start bot with given url
app.post("/submit-link", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).send(`Missing the URL`);
  if (!validateMeetLink(url)) return res.status(400).send(`Invalid link`);

  try {
    const job = await createMeetingJob(url);
    await launchBotContainer(url, job.id);

    res.send(`Bot started for meeting`);
  } catch (err) {
    console.error(err);
    res.status(500).send(`Failed to launch bot`);
  }
});

// endpoint to fetch summary for meeting
app.get("/meeting-summary/:id", async (req, res) => {
  const meetingId = req.params.id;
  const transcript = await getTranscript(meetingId);

  if (!transcript) return res.status(404).send("Transcript not ready");

  const summary = await summarizeTranscript(transcript);
  await saveSummary(summary);
  res.json({ summary });
});

// endpoint when bot signals it's done
app.post("/bot-done", async (req, res) => {
  const { jobId, meetingId } = req.body;
  if (!jobId || !meetingId) return res.status(400).send("Missing fields");

  try {
    console.log(
      `Bot reported completion for job ${jobId}, meeting ${meetingId}`,
    );

    // job saved its transcript
    await updateMeetingStatus(jobId, "transcript_saved", meetingId);

    const transcript = await getTranscript(meetingId);
    if (!transcript) {
      console.warn(`Transcript not found for meeting ${meetingId}`);
      return res.status(202).send("Transcript not found yet");
    }

    // create summary and update status
    const summary = await summarizeTranscript(transcript);
    console.log(`Summary created for job ${jobId}`);

    await saveSummary(summary);
    await updateMeetingStatus(jobId, "summarized");

    // log summary and transcript for debugging
    console.log(`Transcript is: `);
    console.dir(await getTranscript(meetingId));
    console.log(`Summary is: `);
    console.dir(summary);
    res.send("Summary completed and saved");
  } catch (err) {
    console.error(`Error processing job ${jobId}:`, err);
    res.status(500).send("Failed to finalize job");
  }
});

// NEW: Get all meetings with summaries (only show meetings that have summaries)
app.get("/meetings", async (req, res) => {
  try {
    // Get latest summary for each unique meetingId
    const summaries = await prisma.meetingSummary.findMany({
      orderBy: { generatedAt: "desc" },
      take: 100, // Get more to ensure we have enough after deduping
    });

    // Deduplicate by meetingId - keep only the latest summary per meeting
    const uniqueSummariesMap = new Map();
    summaries.forEach((summary) => {
      if (!uniqueSummariesMap.has(summary.meetingId)) {
        uniqueSummariesMap.set(summary.meetingId, summary);
      }
    });

    const uniqueSummaries = Array.from(uniqueSummariesMap.values()).slice(0, 50);

    // Then get the transcripts and segments for those meetings
    const meetingsWithSummaries = await Promise.all(
      uniqueSummaries.map(async (summary) => {
        const transcript = await prisma.meetingTranscript.findUnique({
          where: { meetingId: summary.meetingId },
          include: {
            segments: {
              select: { speaker: true, text: true, start: true, end: true },
              orderBy: { start: "asc" },
            },
          },
        });

        if (!transcript) return null;

        return {
          ...transcript,
          summary: [summary], // Keep as array for frontend compatibility
        };
      })
    );

    // Filter out any null transcripts
    const validMeetings = meetingsWithSummaries.filter((m) => m !== null);

    res.json(validMeetings);
  } catch (err) {
    console.error("Error fetching meetings:", err);
    res.status(500).send("Failed to fetch meetings");
  }
});

// NEW: Get live transcript for a specific meeting
app.get("/live-transcript/:meetingId", async (req, res) => {
  const { meetingId } = req.params;
  try {
    const transcript = await getTranscript(meetingId);
    res.json(transcript);
  } catch (err) {
    console.error(`Error fetching transcript for ${meetingId}:`, err);
    res.status(404).send("Transcript not found");
  }
});

// NEW: Get all active/ongoing meetings (truly active ones only)
app.get("/active-meetings", async (req, res) => {
  try {
    // Find meetings that have segments updated in the last 30 seconds (actively recording)
    const recentTranscripts = await prisma.meetingTranscript.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 2 * 60 * 1000), // Created in last 2 minutes
        },
      },
      select: {
        meetingId: true,
        createdAt: true,
      },
    });

    // For each transcript, check if it has recent segments (within last 30 seconds)
    const activeMeetings = [];
    
    for (const transcript of recentTranscripts) {
      const recentSegments = await prisma.segment.findMany({
        where: {
          meetingId: transcript.meetingId,
        },
        orderBy: {
          end: 'desc',
        },
        take: 1,
      });

      // Check if there are segments (meaning bot is actively recording)
      if (recentSegments.length > 0) {
        // Find the job for this meeting
        const job = await prisma.meetingJob.findFirst({
          where: {
            meetingId: transcript.meetingId,
          },
        });

        activeMeetings.push({
          id: job?.id || transcript.meetingId,
          meetingUrl: job?.meetingUrl || `Meeting ${transcript.meetingId}`,
          status: "recording",
          meetingId: transcript.meetingId,
          createdAt: transcript.createdAt,
          updatedAt: transcript.createdAt,
        });
      }
    }

    res.json(activeMeetings);
  } catch (err) {
    console.error("Error fetching active meetings:", err);
    res.status(500).send("Failed to fetch active meetings");
  }
});

// NEW: Update job with meetingId when bot starts recording
app.post("/bot-started", async (req, res) => {
  const { jobId, meetingId } = req.body;
  if (!jobId || !meetingId) return res.status(400).send("Missing fields");
  
  try {
    await updateMeetingStatus(jobId, "recording", meetingId);
    console.log(`Bot started recording: job ${jobId}, meeting ${meetingId}`);
    res.send("Job updated");
  } catch (err) {
    console.error(`Error updating job ${jobId}:`, err);
    res.status(500).send("Failed to update job");
  }
});

// start server on port 3001
app.listen(3001, "0.0.0.0", () => {
  console.log("Backend listening on port 3001");
});
