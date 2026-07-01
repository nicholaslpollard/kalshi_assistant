#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"

EVENT_FILE="$ROOT/lib/openai/eventAiReview.ts"
POSITION_FILE="$ROOT/lib/openai/positionAiReview.ts"

if [[ ! -f "$EVENT_FILE" ]]; then
  echo "Missing $EVENT_FILE. Run this from the repo root."
  exit 1
fi

if [[ ! -f "$POSITION_FILE" ]]; then
  echo "Missing $POSITION_FILE. Run this from the repo root."
  exit 1
fi

python - <<'PY'
from pathlib import Path

files = [
    (Path("lib/openai/eventAiReview.ts"), "@/types/eventScanner", "EventAiReviewResult"),
    (Path("lib/openai/positionAiReview.ts"), "@/types/positionReview", "PositionAiReviewResult"),
]

for path, module, primary in files:
    text = path.read_text()

    if path.name == "eventAiReview.ts":
        old_import = 'import type { EventAiReviewResult } from "@/types/eventScanner";'
        new_import = '''import type {
  AiBucketProbability,
  AiFairValueRead,
  AiModelConsensusRow,
  AiObservationTrigger,
  AiSettlementClockRead,
  EventAiReviewResult,
} from "@/types/eventScanner";'''
        if old_import in text:
            text = text.replace(old_import, new_import)
    else:
        old_import = '''import type {
  PositionAiReviewResult,
  PositionReviewResult,
} from "@/types/positionReview";'''
        new_import = '''import type {
  AiBucketProbability,
  AiFairValueRead,
  AiModelConsensusRow,
  AiObservationTrigger,
  AiSettlementClockRead,
  PositionAiReviewResult,
  PositionReviewResult,
} from "@/types/positionReview";'''
        if old_import in text:
            text = text.replace(old_import, new_import)

    replacements = {
        "function readWeight(value: unknown) {": 'function readWeight(value: unknown): AiModelConsensusRow["weight"] {',
        "function readUrgency(value: unknown) {": 'function readUrgency(value: unknown): AiObservationTrigger["urgency"] {',
        "function validateModelConsensus(value: unknown) {": "function validateModelConsensus(value: unknown): AiModelConsensusRow[] {",
        "function validateBucketProbabilities(value: unknown) {": "function validateBucketProbabilities(value: unknown): AiBucketProbability[] {",
        "function validateFairValue(value: unknown) {": "function validateFairValue(value: unknown): AiFairValueRead {",
        "function validateObservationTriggers(value: unknown) {": "function validateObservationTriggers(value: unknown): AiObservationTrigger[] {",
        "function validateSettlementClock(value: unknown) {": "function validateSettlementClock(value: unknown): AiSettlementClockRead {",
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    path.write_text(text)
    print(f"Patched {path}")
PY

echo "Done. Now run: npm run build"
