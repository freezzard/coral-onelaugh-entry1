// One Line, One Laugh — entry program.
//
// The program writes exactly one funny line to /output/entry.txt:
// a single line of plain UTF-8 text, no trailing newline, 1 to 200
// characters, built from fixed parts joined in a fixed order. The
// build is fully deterministic: no network, no clock, no random
// source, no environment input, no file input. Running it twice
// produces byte-identical output.
//
// The line itself is assembled from three fixed segments. Segment
// one sets the scene, segment two states the complaint, segment
// three delivers the turn: the only thing taken from the fridge is
// regret. The turn is the joke, so the program keeps the line short
// and spends no words on setup the punchline does not need.
//
// After writing, the program reads the file back, hashes it with
// SHA-256, and runs the competition gate locally: length 1 to 200
// characters, exactly one line, not only white space, clean UTF-8
// round trip. A gate failure stops the run with a clear message.
//
// Style rules kept through the whole file:
//   - the forbidden branch keyword never appears, comments included
//   - no bare loop skip statement
//   - no bare empty return value
//   - every error-guard line shares its line with its first statement
//   - every error handler carries a named binding
//   - the forbidden position identifier never appears

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// Fixed line parts
// ---------------------------------------------------------------------------

// Scene: who files, and what the filing is.
const SCENE_PARTS: readonly string[] = [
  "My smart fridge filed for divorce",
];

// Complaint: the habit the fridge objects to, in the fridge's voice.
const COMPLAINT_PARTS: readonly string[] = [
  "it says I open it at 2 a.m.,",
  "stare inside for ten minutes,",
];

// Turn: the punchline. Nothing is taken from the fridge except regret.
const TURN_PARTS: readonly string[] = [
  "and leave with nothing but regret.",
];

// The separator between scene and complaint, and between complaint
// and turn. An em dash opens the fridge's quoted complaint.
const SCENE_SEPARATOR = " \u2014 ";
const PART_SEPARATOR = " ";

// Gate limits, copied from the competition rules: the sealed scorer
// accepts UTF-8 text of 1 to 200 characters, not only white space.
const MIN_CHARS = 1;
const MAX_CHARS = 200;

// Output location required by the competition.
const OUTPUT_PATH = "/output/entry.txt";

// ---------------------------------------------------------------------------
// Line assembly
// ---------------------------------------------------------------------------

// Joins one group of fixed parts with a single space between parts.
// A part that is empty after trimming is skipped, so a stray blank
// part can never leave a doubled space in the line. The skip uses a
// guard clause that keeps only non-empty parts.
function joinParts(parts: readonly string[]): string {
  const kept: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length > 0) {
      kept.push(trimmed);
    }
  }
  return kept.join(PART_SEPARATOR);
}

// Builds the full line: scene, em dash, complaint, turn.
function buildLine(): string {
  const scene = joinParts(SCENE_PARTS);
  const complaint = joinParts(COMPLAINT_PARTS);
  const turn = joinParts(TURN_PARTS);
  const head = scene + SCENE_SEPARATOR + complaint;
  return head + PART_SEPARATOR + turn;
}

// ---------------------------------------------------------------------------
// Gate checks
// ---------------------------------------------------------------------------

// Counts characters as Unicode code points, matching the scorer's
// reading of the text as characters rather than raw bytes.
function countChars(text: string): number {
  return Array.from(text).length;
}

// Checks that the text holds exactly one line: no line feed, no
// carriage return, no vertical tab, no form feed anywhere in it.
function hasSingleLine(text: string): boolean {
  const breaks = ["\n", "\r", "\u000B", "\u000C"];
  for (const mark of breaks) {
    if (text.includes(mark)) {
      return false;
    }
  }
  return true;
}

// Checks that the text is not only white space: at least one
// character that is not a space, tab, or other blank.
function hasVisibleText(text: string): boolean {
  return text.trim().length > 0;
}

// Checks that the text survives a UTF-8 round trip unchanged:
// encoding it to bytes and decoding it back gives the same string.
function roundTripsUtf8(text: string): boolean {
  const encoded = new TextEncoder().encode(text);
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(encoded);
  return decoded === text;
}

// Runs every gate rule and collects each failure as a short message.
// An empty list means the line passes the gate.
function gateProblems(text: string): string[] {
  const problems: string[] = [];
  const chars = countChars(text);
  if (chars < MIN_CHARS) {
    problems.push(`too short: ${chars} characters, minimum ${MIN_CHARS}`);
  }
  if (chars > MAX_CHARS) {
    problems.push(`too long: ${chars} characters, maximum ${MAX_CHARS}`);
  }
  if (!hasSingleLine(text)) {
    problems.push("more than one line");
  }
  if (!hasVisibleText(text)) {
    problems.push("only white space");
  }
  if (!roundTripsUtf8(text)) {
    problems.push("UTF-8 round trip failed");
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

// Returns the SHA-256 hex digest of a string's UTF-8 bytes.
function sha256Hex(text: string): string {
  const digest = createHash("sha256").update(text, "utf8").digest("hex");
  return digest;
}

// Writes the line to the output path with no trailing newline, then
// reads it back and returns the bytes that were read, as text.
function writeAndReadBack(line: string): string {
  mkdirSync("/output", { recursive: true });
  writeFileSync(OUTPUT_PATH, line, "utf8");
  const back = readFileSync(OUTPUT_PATH, "utf8");
  return back;
}

// Reports one gate failure list to standard error and stops the run.
function failGate(problems: readonly string[]): never {
  const joined = problems.join("; ");
  throw new Error(`gate failed: ${joined}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const line = buildLine();

  const problems = gateProblems(line);
  if (problems.length > 0) {
    failGate(problems);
  }

  const back = writeAndReadBack(line);
  if (back !== line) {
    throw new Error("read-back mismatch: file content differs from line");
  }

  const chars = countChars(line);
  const bytes = Buffer.byteLength(line, "utf8");
  const digest = sha256Hex(line);
  console.log(`status ok`);
  console.log(`chars ${chars}`);
  console.log(`bytes ${bytes}`);
  console.log(`sha256 ${digest}`);
  console.log(`line ${line}`);
}

try { main(); } catch (caughtFailure) {
  console.error(`error: ${caughtFailure instanceof Error ? caughtFailure.message : String(caughtFailure)}`);
  process.exit(1);
}
