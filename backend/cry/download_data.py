"""
download_data.py  —  Download & prepare the Kaggle baby cry dataset
=====================================================================
This script downloads the dataset and organises it into the folder
structure expected by train.py:

    data/
        hungry/      *.wav
        belly_pain/  *.wav
        burping/     *.wav
        discomfort/  *.wav
        tired/       *.wav

Prerequisites
-------------
1. Install the Kaggle CLI:
       pip install kaggle

2. Create your API token at https://www.kaggle.com/settings → API
   and save it to  ~/.kaggle/kaggle.json  (Linux/Mac)
   or  C:/Users/<User>/.kaggle/kaggle.json  (Windows)

3. Run:
       python download_data.py
"""

import os
import shutil
import zipfile
from pathlib import Path

# ── Dataset options ────────────────────────────────────────────────────────────
# Option A — UCSB Infant Cry Audio Dataset (recommended, 5 classes, ~450 samples)
KAGGLE_DATASET  = "anshtanwar/infant-cry-audio-classification"
DOWNLOAD_DIR    = "./kaggle_raw"
OUTPUT_DATA_DIR = "./data"

# Label folder names as they appear inside the Kaggle zip → our canonical names
LABEL_MAP = {
    # Kaggle folder name  : our label name
    "hungry"    : "hungry",
    "belly_pain": "belly_pain",
    "burping"   : "burping",
    "discomfort": "discomfort",
    "tired"     : "tired",
    # Some versions of the dataset use these names instead:
    "hu"        : "hungry",
    "bp"        : "belly_pain",
    "bu"        : "burping",
    "dc"        : "discomfort",
    "ti"        : "tired",
}


def download():
    """Download dataset from Kaggle."""
    try:
        import kaggle  # noqa
    except ImportError:
        print("❌  kaggle package not found. Run:  pip install kaggle")
        return False

    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    print(f"⬇️  Downloading {KAGGLE_DATASET} ...")
    os.system(f"kaggle datasets download -d {KAGGLE_DATASET} -p {DOWNLOAD_DIR} --unzip")
    print("✅  Download complete.")
    return True


def organise():
    """Walk the raw download and copy files into the expected folder layout."""
    raw = Path(DOWNLOAD_DIR)
    out = Path(OUTPUT_DATA_DIR)

    # Create output folders
    for label in set(LABEL_MAP.values()):
        (out / label).mkdir(parents=True, exist_ok=True)

    moved = 0
    for audio_file in raw.rglob("*.wav"):
        # Determine label from parent folder name (case-insensitive)
        folder = audio_file.parent.name.lower()
        label = LABEL_MAP.get(folder)
        if label is None:
            # Try matching any part of the path
            for part in audio_file.parts:
                label = LABEL_MAP.get(part.lower())
                if label:
                    break
        if label is None:
            print(f"  ⚠️  Could not map {audio_file} — skipping")
            continue

        dest = out / label / audio_file.name
        shutil.copy2(str(audio_file), str(dest))
        moved += 1

    print(f"\n📁 Organised {moved} files into {OUTPUT_DATA_DIR}/")
    # Print summary
    for label_dir in sorted(out.iterdir()):
        count = len(list(label_dir.glob("*.wav")))
        print(f"   {label_dir.name:<15} {count} files")


if __name__ == "__main__":
    if download():
        organise()
        print("\n✅  Dataset ready. Now run:\n")
        print("    python train.py train --data_dir ./data\n")
