"""
FastAPI microservice — Baby Cry Classifier
==========================================
Wraps the fine-tuned Wav2Vec2 model for local inference.

Run:
    uvicorn app:app --host 0.0.0.0 --port 8000 --reload

Endpoints:
    GET  /health   → liveness check
    POST /predict  → { audioBase64, mimeType? } → { label, confidence, advice, all_probs }

Requirements:
    pip install fastapi uvicorn[standard] python-multipart
    ffmpeg must be on your PATH to decode WebM/Opus audio from the browser.
    Install: https://ffmpeg.org/download.html  (Windows: winget install Gyan.FFmpeg)
"""

import os
import io
import json
import base64
import logging
import tempfile
from pathlib import Path

import numpy as np
import torch
import torchaudio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import Wav2Vec2FeatureExtractor, Wav2Vec2ForSequenceClassification

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(levelname)s:     %(message)s")
logger = logging.getLogger(__name__)

# ─── Constants ────────────────────────────────────────────────────────────────
MODEL_DIR     = Path(__file__).parent / "model"
SAMPLING_RATE = 16000
MAX_SAMPLES   = SAMPLING_RATE * 7  # 7 seconds (matches training config)

# ─── Load model once at startup ───────────────────────────────────────────────
logger.info(f"Loading model from {MODEL_DIR} …")

feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(str(MODEL_DIR))
model = Wav2Vec2ForSequenceClassification.from_pretrained(str(MODEL_DIR))
model.eval()

with open(MODEL_DIR / "label_info.json") as f:
    label_info = json.load(f)

ID2LABEL     = label_info["id2label"]           # {"0": "hungry", …}
DESCRIPTIONS = label_info.get("descriptions", {})
LABELS       = [ID2LABEL[str(i)] for i in range(len(ID2LABEL))]

logger.info(f"Model ready. Classes: {LABELS}")

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="Baby Cry Classifier API", version="1.0.0")

# Allow requests from the Node.js backend (localhost only — not public-facing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# ─── Request schema ───────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    audioBase64: str
    mimeType: str | None = "audio/webm"


# ─── Audio loading ────────────────────────────────────────────────────────────
def load_audio(audio_bytes: bytes, mime_type: str | None) -> np.ndarray:
    """
    Decode raw audio bytes → float32 numpy array at 16 kHz mono.

    Strategy:
      1. Write bytes to a temp file with the correct extension.
      2. Load with torchaudio.load() — handles WAV natively, WebM/Opus via ffmpeg.
      3. If torchaudio fails (ffmpeg not installed), try soundfile (WAV only).
      4. Raise a descriptive 422 if both fail.
    """
    mime = (mime_type or "audio/webm").lower()

    if "webm" in mime or "opus" in mime:
        suffix = ".webm"
    elif "ogg" in mime:
        suffix = ".ogg"
    elif "mp4" in mime or "m4a" in mime:
        suffix = ".mp4"
    else:
        suffix = ".wav"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        waveform, sample_rate = torchaudio.load(tmp_path)
    except Exception as primary_err:
        # Fallback: soundfile (WAV only)
        try:
            import soundfile as sf
            data, sample_rate = sf.read(io.BytesIO(audio_bytes), dtype="float32")
            if data.ndim == 1:
                waveform = torch.from_numpy(data).unsqueeze(0)
            else:
                waveform = torch.from_numpy(data.T)
        except Exception:
            os.unlink(tmp_path)
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Cannot decode audio format '{mime_type}'. "
                    "For WebM/Opus (browser recordings), ffmpeg must be installed and on your PATH. "
                    "Install: https://ffmpeg.org/download.html  "
                    "(Windows: winget install Gyan.FFmpeg, then restart terminal)"
                ),
            ) from primary_err
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    # Resample to 16 kHz
    if sample_rate != SAMPLING_RATE:
        resampler = torchaudio.transforms.Resample(sample_rate, SAMPLING_RATE)
        waveform  = resampler(waveform)

    # Convert to mono
    if waveform.shape[0] > 1:
        waveform = waveform.mean(dim=0, keepdim=True)

    wav = waveform.squeeze().numpy()

    # Pad or truncate to MAX_SAMPLES
    if len(wav) > MAX_SAMPLES:
        wav = wav[:MAX_SAMPLES]
    else:
        wav = np.pad(wav, (0, MAX_SAMPLES - len(wav)))

    return wav


# ─── Endpoints ────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "model":  "wav2vec2-baby-cry",
        "classes": LABELS,
    }


@app.post("/predict")
def predict(req: PredictRequest):
    # Decode base64
    try:
        audio_bytes = base64.b64decode(req.audioBase64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 audio data")

    if len(audio_bytes) < 100:
        raise HTTPException(status_code=400, detail="Audio payload too small — record at least 2 seconds")

    # Load and preprocess audio
    wav = load_audio(audio_bytes, req.mimeType)

    # Feature extraction
    inputs = feature_extractor(
        wav,
        sampling_rate=SAMPLING_RATE,
        return_tensors="pt",
        padding=True,
    )

    # Inference
    with torch.no_grad():
        logits = model(**inputs).logits

    probs   = torch.softmax(logits, dim=-1).squeeze().numpy()
    pred_id = int(np.argmax(probs))
    label   = ID2LABEL[str(pred_id)]
    advice  = DESCRIPTIONS.get(label, f"Baby is {label}.")

    all_probs = {lbl: round(float(p), 4) for lbl, p in zip(LABELS, probs)}

    logger.info(f"Prediction: {label} ({probs[pred_id] * 100:.1f}%)")

    return {
        "label":      label,
        "confidence": round(float(probs[pred_id]), 4),
        "advice":     advice,
        "all_probs":  all_probs,
    }
