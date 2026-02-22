"""
Baby Cry Classifier - Fine-tuning wav2vec2 on Kaggle Baby Cry Dataset
======================================================================
Dataset: https://www.kaggle.com/datasets/ucsb-hv1nc6/baby-cry-kaggle-archive
         or https://www.kaggle.com/datasets/anshtanwar/infant-cry-audio-classification

Classes: hungry | belly_pain | burping | discomfort | tired

Usage:
    python train.py --data_dir ./data --epochs 10 --output_dir ./model
    python train.py --predict path/to/cry.wav --model_dir ./model
"""

import os
import json
import argparse
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix

import torch
import torchaudio
from torch.utils.data import Dataset, DataLoader

from transformers import (
    Wav2Vec2ForSequenceClassification,
    Wav2Vec2FeatureExtractor,
    TrainingArguments,
    Trainer,
)
import evaluate

# ─────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────
LABELS = ["hungry", "belly_pain", "burping", "discomfort", "tired"]
LABEL2ID = {label: i for i, label in enumerate(LABELS)}
ID2LABEL = {i: label for i, label in enumerate(LABELS)}

LABEL_DESCRIPTIONS = {
    "hungry":      "🍼 Baby is hungry – try feeding them.",
    "belly_pain":  "😣 Baby has belly/stomach pain – try gentle tummy massage or check for gas.",
    "burping":     "💨 Baby needs to burp – hold upright and gently pat their back.",
    "discomfort":  "😤 Baby is uncomfortable – check diaper, temperature, or position.",
    "tired":       "😴 Baby is tired – try rocking, dimming lights, or swaddling.",
}

MODEL_NAME = "facebook/wav2vec2-base"
SAMPLING_RATE = 16000
MAX_DURATION = 7  # seconds


# ─────────────────────────────────────────────
# Dataset
# ─────────────────────────────────────────────
class BabyCryDataset(Dataset):
    """
    Expects a directory structure like:
        data/
            hungry/    *.wav
            belly_pain/  *.wav
            burping/   *.wav
            discomfort/ *.wav
            tired/     *.wav
    """

    def __init__(self, file_paths, labels, feature_extractor, max_length=MAX_DURATION * SAMPLING_RATE):
        self.file_paths = file_paths
        self.labels = labels
        self.feature_extractor = feature_extractor
        self.max_length = max_length

    def __len__(self):
        return len(self.file_paths)

    def __getitem__(self, idx):
        path = self.file_paths[idx]
        label = self.labels[idx]

        waveform, sample_rate = torchaudio.load(path)

        # Resample if needed
        if sample_rate != SAMPLING_RATE:
            resampler = torchaudio.transforms.Resample(sample_rate, SAMPLING_RATE)
            waveform = resampler(waveform)

        # Convert stereo to mono
        if waveform.shape[0] > 1:
            waveform = waveform.mean(dim=0, keepdim=True)

        waveform = waveform.squeeze().numpy()

        # Pad or truncate
        if len(waveform) > self.max_length:
            waveform = waveform[:self.max_length]
        else:
            waveform = np.pad(waveform, (0, self.max_length - len(waveform)))

        inputs = self.feature_extractor(
            waveform,
            sampling_rate=SAMPLING_RATE,
            return_tensors="pt",
            padding=True,
            max_length=self.max_length,
            truncation=True,
        )

        return {
            "input_values": inputs.input_values.squeeze(),
            "labels": torch.tensor(label, dtype=torch.long),
        }


# ─────────────────────────────────────────────
# Data Loading
# ─────────────────────────────────────────────
def load_dataset_from_directory(data_dir: str):
    """Scan directory and build file path + label lists."""
    data_dir = Path(data_dir)
    file_paths, labels = [], []

    for label_name in LABELS:
        label_dir = data_dir / label_name
        if not label_dir.exists():
            print(f"  ⚠️  Warning: folder not found → {label_dir}")
            continue
        audio_files = list(label_dir.glob("*.wav")) + list(label_dir.glob("*.mp3"))
        print(f"  📁 {label_name}: {len(audio_files)} files")
        for f in audio_files:
            file_paths.append(str(f))
            labels.append(LABEL2ID[label_name])

    if not file_paths:
        raise ValueError(
            f"No audio files found in {data_dir}. "
            "Make sure your dataset folder structure matches: data/<class_name>/*.wav"
        )

    return file_paths, labels


# ─────────────────────────────────────────────
# Metrics
# ─────────────────────────────────────────────
accuracy_metric = evaluate.load("accuracy")

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = np.argmax(logits, axis=-1)
    return accuracy_metric.compute(predictions=predictions, references=labels)


# ─────────────────────────────────────────────
# Training
# ─────────────────────────────────────────────
def train(args):
    print("\n🔊 Baby Cry Classifier — Training")
    print("=" * 45)

    # Load data
    print("\n📂 Loading dataset...")
    file_paths, labels = load_dataset_from_directory(args.data_dir)
    print(f"  Total samples: {len(file_paths)}")

    # Train/val split
    train_paths, val_paths, train_labels, val_labels = train_test_split(
        file_paths, labels, test_size=0.2, stratify=labels, random_state=42
    )
    print(f"  Train: {len(train_paths)} | Val: {len(val_paths)}")

    # Feature extractor
    print(f"\n🤗 Loading feature extractor from {MODEL_NAME}...")
    feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(MODEL_NAME)

    # Datasets
    train_dataset = BabyCryDataset(train_paths, train_labels, feature_extractor)
    val_dataset   = BabyCryDataset(val_paths,   val_labels,   feature_extractor)

    # Model
    print(f"🧠 Loading model from {MODEL_NAME}...")
    model = Wav2Vec2ForSequenceClassification.from_pretrained(
        MODEL_NAME,
        num_labels=len(LABELS),
        label2id=LABEL2ID,
        id2label=ID2LABEL,
        ignore_mismatched_sizes=True,
    )

    # Freeze feature encoder (recommended for small datasets)
    model.freeze_feature_encoder()

    # Training arguments
    training_args = TrainingArguments(
        output_dir=args.output_dir,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="accuracy",
        logging_dir=os.path.join(args.output_dir, "logs"),
        logging_steps=10,
        learning_rate=3e-5,
        warmup_ratio=0.1,
        gradient_accumulation_steps=2,
        fp16=torch.cuda.is_available(),
        dataloader_num_workers=2,
        report_to="none",
        save_total_limit=2,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        compute_metrics=compute_metrics,
    )

    print("\n🚀 Starting training...\n")
    trainer.train()

    # Save model + feature extractor
    print(f"\n💾 Saving model to {args.output_dir}...")
    trainer.save_model(args.output_dir)
    feature_extractor.save_pretrained(args.output_dir)

    # Save label map
    with open(os.path.join(args.output_dir, "label_info.json"), "w") as f:
        json.dump({"label2id": LABEL2ID, "id2label": ID2LABEL,
                   "descriptions": LABEL_DESCRIPTIONS}, f, indent=2)

    # Final evaluation
    print("\n📊 Final Evaluation:")
    preds_output = trainer.predict(val_dataset)
    preds = np.argmax(preds_output.predictions, axis=-1)
    print(classification_report(val_labels, preds, target_names=LABELS))

    print("\n✅ Training complete!")
    return trainer


# ─────────────────────────────────────────────
# Inference
# ─────────────────────────────────────────────
def predict(audio_path: str, model_dir: str):
    """Predict why a baby is crying from an audio file."""
    print(f"\n🔍 Analyzing: {audio_path}")

    # Load model
    feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(model_dir)
    model = Wav2Vec2ForSequenceClassification.from_pretrained(model_dir)
    model.eval()

    # Load and preprocess audio
    waveform, sample_rate = torchaudio.load(audio_path)
    if sample_rate != SAMPLING_RATE:
        resampler = torchaudio.transforms.Resample(sample_rate, SAMPLING_RATE)
        waveform = resampler(waveform)
    if waveform.shape[0] > 1:
        waveform = waveform.mean(dim=0, keepdim=True)
    waveform = waveform.squeeze().numpy()

    max_length = MAX_DURATION * SAMPLING_RATE
    if len(waveform) > max_length:
        waveform = waveform[:max_length]
    else:
        waveform = np.pad(waveform, (0, max_length - len(waveform)))

    inputs = feature_extractor(
        waveform,
        sampling_rate=SAMPLING_RATE,
        return_tensors="pt",
        padding=True,
    )

    with torch.no_grad():
        logits = model(**inputs).logits

    probs = torch.softmax(logits, dim=-1).squeeze().numpy()
    pred_id = int(np.argmax(probs))
    pred_label = ID2LABEL[pred_id]

    # Load descriptions
    label_info_path = os.path.join(model_dir, "label_info.json")
    if os.path.exists(label_info_path):
        with open(label_info_path) as f:
            label_info = json.load(f)
        descriptions = label_info.get("descriptions", LABEL_DESCRIPTIONS)
    else:
        descriptions = LABEL_DESCRIPTIONS

    print("\n" + "=" * 45)
    print("🍼  BABY CRY ANALYSIS RESULT")
    print("=" * 45)
    print(f"  Detected reason : {pred_label.upper()}")
    print(f"  Advice          : {descriptions[pred_label]}")
    print(f"  Confidence      : {probs[pred_id]*100:.1f}%")
    print("\n  All probabilities:")
    for i, (label, prob) in enumerate(zip(LABELS, probs)):
        bar = "█" * int(prob * 20)
        print(f"    {label:<12} {bar:<20} {prob*100:.1f}%")
    print("=" * 45)

    return {"label": pred_label, "confidence": float(probs[pred_id]),
            "advice": descriptions[pred_label], "all_probs": dict(zip(LABELS, probs.tolist()))}


# ─────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Baby Cry Classifier")
    subparsers = parser.add_subparsers(dest="mode")

    # Train subcommand
    train_parser = subparsers.add_parser("train", help="Train the model")
    train_parser.add_argument("--data_dir",   type=str, default="./data",  help="Path to dataset directory")
    train_parser.add_argument("--output_dir", type=str, default="./model", help="Where to save model")
    train_parser.add_argument("--epochs",     type=int, default=10)
    train_parser.add_argument("--batch_size", type=int, default=8)

    # Predict subcommand
    pred_parser = subparsers.add_parser("predict", help="Predict cry reason")
    pred_parser.add_argument("--audio",     type=str, required=True, help="Path to .wav file")
    pred_parser.add_argument("--model_dir", type=str, default="./model", help="Path to saved model")

    args = parser.parse_args()

    if args.mode == "train":
        train(args)
    elif args.mode == "predict":
        predict(args.audio, args.model_dir)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
