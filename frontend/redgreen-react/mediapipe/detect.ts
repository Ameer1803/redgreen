// Copyright 2023 The MediaPipe Authors.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//      http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import {
  GestureRecognizer,
  FilesetResolver,
  DrawingUtils
} from "@mediapipe/tasks-vision";

let gestureRecognizer: GestureRecognizer | null = null;
let running = false;

export async function initGestureDetector(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  onGesture: (result: { gesture: string; score: number }) => void
) {
  if (!gestureRecognizer) {
    const vision = await FilesetResolver.forVisionTasks(
      // Use the correct path for your setup
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
        delegate: "GPU"
      },
      runningMode: "VIDEO"
    });
  }
  running = true;

  async function detect() {
    if (!gestureRecognizer || !running) return;
    const nowInMs = Date.now();
    const results = gestureRecognizer.recognizeForVideo(video, nowInMs);

    // Draw landmarks
    const ctx = canvas.getContext("2d");
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    ctx.save();
    ctx.clearRect(0, 0, videoWidth, videoHeight);
    const drawingUtils = new DrawingUtils(ctx);

    if (results.landmarks) {
      for (const landmarks of results.landmarks) {
        drawingUtils.drawConnectors(
          landmarks,
          GestureRecognizer.HAND_CONNECTIONS,
          { color: "#00FF00", lineWidth: 5 }
        );
        drawingUtils.drawLandmarks(landmarks, {
          color: "#FF0000",
          lineWidth: 2
        });
      }
    }
    ctx.restore();

    if (results.gestures && results.gestures.length > 0) {
      const gesture = results.gestures[0][0].categoryName;
      const score = results.gestures[0][0].score;
      onGesture({ gesture, score });
    }
    requestAnimationFrame(detect);
  }
  detect();
}

export function stopGestureDetector() {
  running = false;
}
