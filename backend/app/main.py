from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .embed_utils import get_face_embedding
import numpy as np
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Resolve paths like: <repo>/backend/app -> go up to repo root
APP_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(APP_DIR)
REPO_ROOT = os.path.dirname(BACKEND_DIR)

ENROLL_DIR = os.path.join(REPO_ROOT, "data", "enrollments")
RAW_DIR = os.path.join(REPO_ROOT, "data", "raw")
os.makedirs(ENROLL_DIR, exist_ok=True)
os.makedirs(RAW_DIR, exist_ok=True)

def canonical_path(student_id: int) -> str:
    return os.path.join(ENROLL_DIR, f"{student_id}__canonical.npy")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/enroll")
async def enroll(
    student_id: int = Form(...),
    name: str = Form(...),
    file: UploadFile = File(...),
):
    """
    Enrolls/updates a student: computes embedding from uploaded image and
    updates the student's canonical embedding (running mean).
    """
    content = await file.read()

    # save raw image (for audit)
    student_raw_dir = os.path.join(RAW_DIR, str(student_id))
    os.makedirs(student_raw_dir, exist_ok=True)
    raw_path = os.path.join(student_raw_dir, file.filename)
    with open(raw_path, "wb") as f:
        f.write(content)

    try:
        emb = get_face_embedding(content)  # normalized vector
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    canon_file = canonical_path(student_id)
    if os.path.exists(canon_file):
        prev = np.load(canon_file)
        new_vec = prev + emb
        new_vec = new_vec / np.linalg.norm(new_vec)
        np.save(canon_file, new_vec)
    else:
        np.save(canon_file, emb)

    return {
        "status": "enrolled",
        "student_id": student_id,
        "name": name,
        "image_saved": raw_path,
    }

@app.post("/recognize")
async def recognize(file: UploadFile = File(...)):
    """
    Recognizes the face in the uploaded image by comparing to all canonical
    embeddings and returning the best match if above threshold.
    """
    if not os.listdir(ENROLL_DIR):
        raise HTTPException(status_code=400, detail="No enrolled students yet")

    content = await file.read()
    try:
        probe = get_face_embedding(content)  # normalized
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # load all canonical embeddings
    student_ids = []
    vecs = []
    for fname in os.listdir(ENROLL_DIR):
        if fname.endswith("__canonical.npy"):
            sid = int(fname.split("__")[0])
            v = np.load(os.path.join(ENROLL_DIR, fname))
            student_ids.append(sid)
            vecs.append(v)

    if not vecs:
        raise HTTPException(status_code=400, detail="No canonical embeddings found")

    vecs = np.vstack(vecs)   # shape (N, D)
    scores = vecs.dot(probe)  # cosine similarities (since vectors are normalized)
    best_idx = int(scores.argmax())
    best_score = float(scores[best_idx])
    best_student = int(student_ids[best_idx])

    THRESH = 0.65  # tune this later
    if best_score >= THRESH:
        # Later: record attendance in DB here
        return {"match": True, "student_id": best_student, "score": best_score}
    else:
        return {"match": False, "student_id": None, "best_score": best_score}
