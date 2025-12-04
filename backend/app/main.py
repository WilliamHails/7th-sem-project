from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from .database import get_db
from .models import Student, StudentImage, Attendance, PredictionLog, Session as DBSess
from .embed_utils import get_face_embedding
import numpy as np
import shutil
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
PREDICTIONS_DIR = os.path.join(REPO_ROOT, "data", "predictions")
os.makedirs(ENROLL_DIR, exist_ok=True)
os.makedirs(RAW_DIR, exist_ok=True)
os.makedirs(PREDICTIONS_DIR, exist_ok=True)

def canonical_path(enrollment_no: str) -> str:
    return os.path.join(ENROLL_DIR, f"{enrollment_no}__canonical.npy")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/enroll")
async def enroll(
    enrollment_no: str = Form(...),
    name: str = Form(...),
    semester: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    # 1. Upsert student
    student = db.query(Student).filter_by(enrollment_no=enrollment_no).first()
    if not student:
        student = Student(
            enrollment_no=enrollment_no,
            name=name,
            semester=semester
        )
        db.add(student)
        db.commit()

    # 2. Save uploaded image to RAW_DIR (project-wide raw images folder)
    filename = f"{enrollment_no}_{file.filename}"
    file_path = os.path.join(RAW_DIR, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 3. Insert into student_images table
    img = StudentImage(
        enrollment_no=enrollment_no,
        file_path=file_path
    )
    db.add(img)
    db.commit()

    return {"status": "success", "message": "Student enrolled successfully"}


@app.post("/recognize")
async def recognize(
    file: UploadFile = File(...),
    session_id: int | None = None,            # optional: which class session this belongs to
    db: Session = Depends(get_db)             # DB session
):
    """
    Recognizes the face in the uploaded image by comparing to all canonical
    embeddings and returning the best match if above threshold.

    Also:
    - Logs every attempt in predictions_log
    - If match above threshold and session_id provided, writes to attendance
    """
    # 0. Check that we have enrolled embeddings
    if not os.listdir(ENROLL_DIR):
        raise HTTPException(status_code=400, detail="No enrolled students yet")

    # 1. Read file bytes and save probe image to disk (for logging/audit)
    content = await file.read()
    now = datetime.now()
    ts_str = now.strftime("%Y%m%d_%H%M%S")
    probe_filename = f"{ts_str}_{file.filename}"
    probe_path = os.path.join(PREDICTIONS_DIR, probe_filename)
    with open(probe_path, "wb") as f:
        f.write(content)

    # 2. Get embedding from the uploaded image
    try:
        probe = get_face_embedding(content)  # normalized
    except ValueError as e:
        # Optionally: log a failed prediction attempt here as well
        raise HTTPException(status_code=400, detail=str(e))

    # 3. Load all canonical embeddings
    student_ids: list[str] = []
    vecs = []
    for fname in os.listdir(ENROLL_DIR):
        if fname.endswith("__canonical.npy"):
            sid = fname.split("__")[0]
            v = np.load(os.path.join(ENROLL_DIR, fname))
            student_ids.append(sid)
            vecs.append(v)

    if not vecs:
        raise HTTPException(status_code=400, detail="No canonical embeddings found")

    vecs = np.vstack(vecs)              # shape (N, D)
    scores = vecs.dot(probe)            # cosine similarities (since vectors are normalized)
    best_idx = int(scores.argmax())
    best_score = float(scores[best_idx])
    best_student = student_ids[best_idx]   # this is your "student_id" from file naming

    THRESH = 0.65  # tune this later

    # 4. Look up student in DB (enrollment_no is stored as string)
    enrollment_no = best_student
    student = db.query(Student).filter_by(enrollment_no=enrollment_no).first()

    # 5. Decide match / no match status
    is_match = best_score >= THRESH and student is not None
    status = "MATCH" if is_match else "NO_MATCH"

    # 6. Log into predictions_log
    log_entry = PredictionLog(
        attempted_at=now,
        image_path=probe_path,
        predicted_enrollment=enrollment_no if best_score >= THRESH else None,
        predicted_name=student.name if (student and best_score >= THRESH) else None,
        confidence=best_score,
        status=status,
        note=None
    )
    db.add(log_entry)

    # 7. If match and session_id provided, mark attendance
    if is_match and session_id is not None:
        # Optional: verify that the session exists
        session_obj = db.query(DBSess).filter_by(id=session_id).first()

        if session_obj is not None:
            # Check if attendance already exists for this student in this session
            existing_att = (
                db.query(Attendance)
                .filter_by(enrollment_no=enrollment_no, session_id=session_id)
                .first()
            )

            if existing_att is None:
                attendance_row = Attendance(
                    enrollment_no=enrollment_no,
                    name_at_time=student.name,
                    semester_at_time=student.semester,
                    date=now.date(),
                    time=now.time().replace(microsecond=0),
                    timestamp=now,
                    confidence=best_score,
                    image_path=probe_path,
                    model_id=None,         # you can set this if you insert a row in model_info
                    session_id=session_id,
                )
                db.add(attendance_row)
        # else: session_id was invalid → we still log prediction, but skip attendance

    # 8. Commit DB changes (prediction log, and maybe attendance)
    db.commit()

    # 9. Return response compatible with your previous version
    if is_match:
        return {
            "match": True,
            "student_id": best_student,      # same as before
            "score": best_score,
            "enrollment_no": enrollment_no,
            "logged": True
        }
    else:
        return {
            "match": False,
            "student_id": None,
            "best_score": best_score,
            "logged": True
        }