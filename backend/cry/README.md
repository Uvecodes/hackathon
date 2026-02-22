# 🍼 Baby Cry Classifier

Fine-tunes Meta's **wav2vec2-base** (via Hugging Face 🤗 Transformers) to detect
**why a baby is crying** from a short audio clip.

## Classes

| Label | Meaning | Advice |
|-------|---------|--------|
| `hungry` | Baby wants to be fed | 🍼 Try feeding them |
| `belly_pain` | Stomach or colic pain | 😣 Gentle tummy massage, check for gas |
| `burping` | Needs to burp | 💨 Hold upright and pat their back |
| `discomfort` | Diaper, temperature, or position | 😤 Check diaper, clothes, environment |
| `tired` | Overtired or overstimulated | 😴 Rock, dim lights, swaddle |

---

## Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Download the dataset

Set up your Kaggle API key first ([instructions here](https://www.kaggle.com/docs/api)), then:

```bash
python download_data.py
```

This downloads the [Infant Cry Audio Classification](https://www.kaggle.com/datasets/anshtanwar/infant-cry-audio-classification) dataset and organises it into:

```
data/
  hungry/      *.wav
  belly_pain/  *.wav
  burping/     *.wav
  discomfort/  *.wav
  tired/       *.wav
```

> **Using a different dataset?**  Just organise your own `.wav` files into the
> same folder structure and skip `download_data.py`.

### 3. Train

```bash
python train.py train --data_dir ./data --epochs 10 --output_dir ./model
```

| Argument | Default | Description |
|---|---|---|
| `--data_dir` | `./data` | Folder with class sub-directories |
| `--output_dir` | `./model` | Where to save the fine-tuned model |
| `--epochs` | `10` | Number of training epochs |
| `--batch_size` | `8` | Per-device batch size |

### 4. Predict

```bash
python train.py predict --audio path/to/cry.wav --model_dir ./model
```

**Example output:**
```
=============================================
🍼  BABY CRY ANALYSIS RESULT
=============================================
  Detected reason : HUNGRY
  Advice          : 🍼 Baby is hungry – try feeding them.
  Confidence      : 91.4%

  All probabilities:
    hungry       ████████████████████  91.4%
    belly_pain   ██                    3.1%
    burping      █                     2.8%
    discomfort                         1.7%
    tired                              1.0%
=============================================
```

---

## How It Works

```
Audio (.wav)
    │
    ▼
Wav2Vec2FeatureExtractor    ← normalise to 16 kHz mono, max 7s
    │
    ▼
wav2vec2-base encoder       ← frozen convolutional feature extractor
    │                          + fine-tuned transformer layers
    ▼
Linear classifier head      ← 5 output classes
    │
    ▼
Softmax → predicted label + confidence
```

**Why wav2vec2?**
- Pre-trained on 960 h of LibriSpeech speech audio — excellent audio representations
- Sequence classification head added on top for multi-class output
- Feature encoder frozen during fine-tuning (prevents overfitting on small datasets)

---

## Expected Performance

On the UCSB infant cry dataset (~450 samples, 80/20 split):

| Metric | ~Value |
|---|---|
| Accuracy | 85–93% |
| Training time (CPU) | ~30 min |
| Training time (GPU) | ~5 min |

Results vary by dataset size and quality. More data = better results.

---

## Tips for Better Results

- **More data** — augment with pitch shift, noise, time stretch (e.g. with `audiomentations`)
- **Longer training** — try 15–20 epochs if your dataset is large
- **Unfreeze encoder** — remove `model.freeze_feature_encoder()` with plenty of data
- **Try other models** — `facebook/wav2vec2-large` or `openai/whisper-small` for more capacity
