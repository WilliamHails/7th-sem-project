import os
import sys
import numpy as np

from embed_utils import get_face_embedding

# Adjust paths relative to this file
APP_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(APP_DIR)
REPO_ROOT = os.path.dirname(BACKEND_DIR)

RAW_DIR = os.path.join(REPO_ROOT, "data", "raw")
ENROLL_DIR = os.path.join(REPO_ROOT, "data", "enrollments")
os.makedirs(ENROLL_DIR, exist_ok=True)

def make_canonical(enrollment_no: str):
    # Find the first image in RAW_DIR that starts with this enrollment_no
    candidates = [
        f for f in os.listdir(RAW_DIR)
        if f.startswith(enrollment_no + "_")
    ]
    if not candidates:
        print(f"No raw images found for {enrollment_no} in {RAW_DIR}")
        return

    img_file = candidates[0]
    img_path = os.path.join(RAW_DIR, img_file)
    print(f"Using image: {img_path}")

    # Read bytes
    with open(img_path, "rb") as f:
        content = f.read()

    # Get embedding
    emb = get_face_embedding(content)  # should be normalized already
    print(f"Embedding shape: {emb.shape}")

    # Save as <enrollment_no>__canonical.npy
    out_path = os.path.join(ENROLL_DIR, f"{enrollment_no}__canonical.npy")
    np.save(out_path, emb)
    print(f"Saved canonical embedding to: {out_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python make_canonical.py <ENROLLMENT_NO>")
        sys.exit(1)
    enrollment_no = sys.argv[1]
    make_canonical(enrollment_no)
