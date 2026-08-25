import type { SavedFinalAssessment } from "@/src/lib/assessments/types";
import type { TranscriptEntry } from "@/src/lib/transcripts/types";

function safeText(value: string | undefined) {
  return value?.trim() || "Not recorded";
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function speakerLabel(entry: TranscriptEntry) {
  return entry.speaker_type === "engineer" ? "Trainee" : "AI Customer";
}

export function transcriptFilename(assessment: SavedFinalAssessment) {
  const parts = [
    assessment.scenarioTitle,
    assessment.learnerName ?? assessment.learnerEmail ?? assessment.learnerId ?? "learner",
    assessment.createdAt.slice(0, 10),
  ];

  const baseName = parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return `${baseName || "transcript"}.txt`;
}

export function formatAssessmentTranscriptText(assessment: SavedFinalAssessment) {
  const header = [
    `Course: ${assessment.scenarioTitle}`,
    `Learner: ${safeText(assessment.learnerName)}`,
    `Email: ${safeText(assessment.learnerEmail)}`,
    `Role: ${safeText(assessment.learnerRole)}`,
    `Completed: ${formatTimestamp(assessment.createdAt)}`,
    `Score: ${assessment.overallScore}%`,
    `Outcome: ${assessment.outcome === "passed" ? "Passed" : "Needs Review"}`,
    `Assessment ID: ${assessment.id}`,
    `Transcript Session ID: ${assessment.transcriptSessionId}`,
  ];

  const lines = assessment.transcript.length
    ? assessment.transcript.map(
        (entry) => `[${formatTimestamp(entry.timestamp)}] ${speakerLabel(entry)}: ${entry.text}`,
      )
    : ["No transcript lines recorded."];

  return [...header, "", "Transcript", "----------", ...lines, ""].join("\n");
}
