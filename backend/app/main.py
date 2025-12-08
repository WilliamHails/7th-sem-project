# app/main.py
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, date
from pydantic import BaseModel
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from .database import get_db
from .models import (
    Student,
    StudentImage,
    Attendance,
    PredictionLog,
    Session as DBSess,
    Class,
    Faculty,
)
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



def delete_student_files(enrollment_no: str):
    """
    Deletes all filesystem assets belonging to a student:
    - canonical embedding (.npy)
    - raw images under data/raw/
    - optionally prediction images (NOT deleting for now)
    """

    # 1. Delete canonical .npy
    canonical = canonical_path(enrollment_no)
    if os.path.exists(canonical):
        try:
            os.remove(canonical)
        except Exception as e:
            print(f"Warning: Could not delete canonical file {canonical}: {e}")

    # 2. Delete raw images belonging to this student
    for fname in os.listdir(RAW_DIR):
        if fname.startswith(enrollment_no + "_"):
            fpath = os.path.join(RAW_DIR, fname)
            try:
                os.remove(fpath)
            except Exception as e:
                print(f"Warning: Could not delete raw image {fpath}: {e}")

    # (Optional) 3. Delete prediction images for this student.
    # Currently skipping because predictions_log does not store enrollment_no reliably.
    # If you want this later, we can implement it cleanly.








# ---------------------------
# Pydantic models for CRUD
# ---------------------------

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    semester: Optional[str] = None


class FacultyCreate(BaseModel):
    faculty_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None


class FacultyUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class ClassCreate(BaseModel):
    title: str
    course_code: Optional[str] = None
    faculty_id: Optional[str] = None  # must match an existing faculty if provided


class ClassUpdate(BaseModel):
    title: Optional[str] = None
    course_code: Optional[str] = None
    faculty_id: Optional[str] = None












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
    
    # 0. Read file bytes once (we'll use it both for saving and for embedding)
    content = await file.read()

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
        db.refresh(student)

    # 2. Save uploaded image to RAW_DIR (project-wide raw images folder)
    filename = f"{enrollment_no}_{file.filename}"
    file_path = os.path.join(RAW_DIR, filename)
    with open(file_path, "wb") as buffer:
        # shutil.copyfileobj(file.file, buffer)
        buffer.write(content)

    # 3. Insert into student_images table
    img = StudentImage(
        enrollment_no=enrollment_no,
        file_path=file_path
    )
    db.add(img)
    db.commit()
    db.refresh(img)

    # 4. Create / overwrite canonical embedding (.npy in data/enrollments)
    try:
        emb = get_face_embedding(content)  # normalized vector
        out_path = canonical_path(enrollment_no)  # e.g. 22UCS001__canonical.npy
        np.save(out_path, emb)
    except Exception as e:
        # If you prefer failing hard when no face is detected, uncomment this:
        # raise HTTPException(status_code=400, detail=f"Could not create canonical embedding: {e}")
        print(f"Warning: could not create canonical embedding for {enrollment_no}: {e}")

    return {"status": "success", "message": "Student enrolled successfully"}


@app.post("/recognize")
async def recognize(
    file: UploadFile = File(...),
    session_id_query: Optional[int] = None,          # taken from query param
    session_id_form: Optional[int] = Form(None),  # optional: which class session this belongs to
              
    #Given the code I wrote above, if you want to send session_id (not session_id_form) from the frontend, change the param name to:
    #session_id_form: Optional[int] = Form(None, alias="session_id")
                        
    db: Session = Depends(get_db)             # DB session
):
    """
    Recognizes the face in the uploaded image by comparing to all canonical
    embeddings and returning the best match if above threshold.

    Also:
    - Logs every attempt in predictions_log
    - If match above threshold and session_id provided, writes to attendance
    """

    # Decide final session_id: query param wins over form-data if both given
    session_id = session_id_query if session_id_query is not None else session_id_form

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


# ---------------------------
# New endpoints for frontend flows
# ---------------------------

@app.get("/faculty/{faculty_id}/classes")
def get_classes_for_faculty(faculty_id: str, db: Session = Depends(get_db)):
    """
    Returns classes for a given faculty (used to populate dropdown)
    """
    classes = db.query(Class).filter(Class.faculty_id == faculty_id).all()
    out = []
    for c in classes:
        out.append({
            "id": c.id,
            "title": c.title,
            "course_code": c.course_code
        })
    return out


@app.post("/sessions")
def create_session(class_id: int, start_time: str, end_time: str, db: Session = Depends(get_db)):
    """
    Create a new session for an existing class.
    start_time and end_time should be ISO datetime strings (e.g. 2025-12-08T10:00:00)
    """
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    try:
        start_dt = datetime.fromisoformat(start_time)
        end_dt = datetime.fromisoformat(end_time)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid start_time or end_time format; use ISO datetime")

    sess = DBSess(
        class_id=class_id,
        session_date=date.today(),
        start_time=start_dt,
        end_time=end_dt,
        is_active=True
    )
    db.add(sess)
    db.commit()
    db.refresh(sess)
    return {
        "id": sess.id,
        "class_id": sess.class_id,
        "session_date": sess.session_date.isoformat(),
        "start_time": sess.start_time.isoformat() if sess.start_time else None,
        "end_time": sess.end_time.isoformat() if sess.end_time else None,
        "is_active": sess.is_active
    }


@app.get("/sessions/active")
def get_active_sessions(db: Session = Depends(get_db)):
    """
    Returns sessions whose end_time is >= now (UTC)
    """
    now = datetime.utcnow()
    sessions = db.query(DBSess).filter(DBSess.end_time >= now).all()
    out = []
    for s in sessions:
        out.append({
            "id": s.id,
            "class_id": s.class_id,
            "class_title": s.class_ref.title if s.class_ref else None,
            "session_date": s.session_date.isoformat(),
            "start_time": s.start_time.isoformat() if s.start_time else None,
            "end_time": s.end_time.isoformat() if s.end_time else None,
            "is_active": s.is_active
        })
    return out


@app.get("/students/{enrollment_no}")
def get_student(enrollment_no: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.enrollment_no == enrollment_no).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return {
        "enrollment_no": student.enrollment_no,
        "name": student.name,
        "semester": student.semester,
        "created_at": student.created_at.isoformat() if student.created_at else None
    }


@app.get("/students/{enrollment_no}/attendance")
def get_student_attendance(enrollment_no: str, db: Session = Depends(get_db)):
    rows = (
        db.query(Attendance, DBSess, Class)
        .join(DBSess, Attendance.session_id == DBSess.id)
        .join(Class, DBSess.class_id == Class.id)
        .filter(Attendance.enrollment_no == enrollment_no)
        .all()
    )
    out = []
    for att, sess, cls in rows:
        out.append({
            "attendance_id": att.id,
            "class_id": cls.id,
            "class_title": cls.title,
            "session_id": sess.id,
            "date": att.date.isoformat(),
            "time": att.time.isoformat(),
            "confidence": att.confidence,
        })
    return out


@app.get("/faculty/{faculty_id}/classes_with_stats")
def get_classes_with_stats(faculty_id: str, db: Session = Depends(get_db)):
    """
    Returns classes for a faculty with session-wise present counts and a percentage.
    Percentage currently computed as (sum of present counts across sessions) / total_students.
    """
    classes = db.query(Class).filter(Class.faculty_id == faculty_id).all()
    total_students = db.query(Student).count()  # simplified denominator
    result = []
    for cls in classes:
        sessions = db.query(DBSess).filter(DBSess.class_id == cls.id).all()
        sessions_out = []
        class_present_count = 0
        for s in sessions:
            present_count = db.query(Attendance).filter(Attendance.session_id == s.id).count()
            sessions_out.append({
                "session_id": s.id,
                "start_time": s.start_time.isoformat() if s.start_time else None,
                "end_time": s.end_time.isoformat() if s.end_time else None,
                "present_count": present_count,
            })
            class_present_count += present_count
        percentage = (class_present_count / total_students * 100) if total_students > 0 else None
        result.append({
            "class_id": cls.id,
            "title": cls.title,
            "sessions": sessions_out,
            "present_total": class_present_count,
            "percentage": round(percentage, 2) if percentage is not None else None,
        })
    return result







@app.get("/sessions/{session_id}/faculty_contact")
def get_faculty_contact(session_id: int, db: Session = Depends(get_db)):
    sess = db.query(DBSess).filter(DBSess.id == session_id).first()
    if not sess or not sess.class_ref or not sess.class_ref.faculty_id:
        raise HTTPException(status_code=404, detail="Faculty not found for this session")

    faculty = db.query(Faculty).filter(Faculty.faculty_id == sess.class_ref.faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    return {
        "faculty_id": faculty.faculty_id,
        "name": faculty.name,
        "email": faculty.email,
        "phone": faculty.phone
    }








@app.delete("/students/{enrollment_no}")
def delete_student(enrollment_no: str, db: Session = Depends(get_db)):
    """
    Deletes:
    - student row
    - student_images rows
    - attendance rows belonging to this student
    - canonical .npy file
    - raw enrollment images

    Safe for Admin use.
    """

    # 1. Check if student exists
    student = db.query(Student).filter_by(enrollment_no=enrollment_no).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # 2. Delete attendance for this student
    db.query(Attendance).filter_by(enrollment_no=enrollment_no).delete()

    # 3. Delete student_images rows
    db.query(StudentImage).filter_by(enrollment_no=enrollment_no).delete()

    # 4. Delete student row
    db.delete(student)

    # 5. Commit DB side first
    db.commit()

    # 6. Delete files from filesystem
    delete_student_files(enrollment_no)

    return {"status": "success", "message": f"Student {enrollment_no} deleted successfully"}





@app.get("/students")
def list_students(db: Session = Depends(get_db)):
    """
    List all students with a flag indicating whether a canonical embedding exists.
    Suitable for Admin 'Edit Student data' table.
    """
    students = db.query(Student).all()
    out = []
    for s in students:
        out.append({
            "enrollment_no": s.enrollment_no,
            "name": s.name,
            "semester": s.semester,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "face_registered": os.path.exists(canonical_path(s.enrollment_no)),
        })
    return out





@app.put("/students/{enrollment_no}")
def update_student_basic(
    enrollment_no: str,
    payload: StudentUpdate,
    db: Session = Depends(get_db)
):
    """
    Update student name and/or semester.
    Does NOT modify enrollment_no or face images/embeddings.
    """
    student = db.query(Student).filter_by(enrollment_no=enrollment_no).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if payload.name is not None:
        student.name = payload.name
    if payload.semester is not None:
        student.semester = payload.semester

    db.commit()
    db.refresh(student)

    return {
        "enrollment_no": student.enrollment_no,
        "name": student.name,
        "semester": student.semester,
        "created_at": student.created_at.isoformat() if student.created_at else None,
    }





@app.get("/faculty")
def list_faculty(db: Session = Depends(get_db)):
    """
    List all faculty. Used in Admin 'Edit Faculty data'.
    """
    facs = db.query(Faculty).all()
    out = []
    for f in facs:
        out.append({
            "faculty_id": f.faculty_id,
            "name": f.name,
            "email": f.email,
            "phone": f.phone,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        })
    return out





@app.post("/faculty")
def create_faculty(payload: FacultyCreate, db: Session = Depends(get_db)):
    """
    Create a new faculty member.
    """
    existing = db.query(Faculty).filter_by(faculty_id=payload.faculty_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Faculty already exists")

    fac = Faculty(
        faculty_id=payload.faculty_id,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
    )
    db.add(fac)
    db.commit()
    db.refresh(fac)

    return {
        "faculty_id": fac.faculty_id,
        "name": fac.name,
        "email": fac.email,
        "phone": fac.phone,
        "created_at": fac.created_at.isoformat() if fac.created_at else None,
    }





@app.put("/faculty/{faculty_id}")
def update_faculty(
    faculty_id: str,
    payload: FacultyUpdate,
    db: Session = Depends(get_db)
):
    fac = db.query(Faculty).filter_by(faculty_id=faculty_id).first()
    if not fac:
        raise HTTPException(status_code=404, detail="Faculty not found")

    if payload.name is not None:
        fac.name = payload.name
    if payload.email is not None:
        fac.email = payload.email
    if payload.phone is not None:
        fac.phone = payload.phone

    db.commit()
    db.refresh(fac)

    return {
        "faculty_id": fac.faculty_id,
        "name": fac.name,
        "email": fac.email,
        "phone": fac.phone,
        "created_at": fac.created_at.isoformat() if fac.created_at else None,
    }







@app.delete("/faculty/{faculty_id}")
def delete_faculty(faculty_id: str, db: Session = Depends(get_db)):
    """
    Deletes:
    - faculty row
    - all classes for that faculty
    - all sessions for those classes
    - all attendance for those sessions
    """

    fac = db.query(Faculty).filter_by(faculty_id=faculty_id).first()
    if not fac:
        raise HTTPException(status_code=404, detail="Faculty not found")

    # Find classes for this faculty
    classes = db.query(Class).filter(Class.faculty_id == faculty_id).all()

    for cls in classes:
        # For each class, delete attendance for its sessions, then sessions
        sessions = db.query(DBSess).filter(DBSess.class_id == cls.id).all()
        for s in sessions:
            db.query(Attendance).filter(Attendance.session_id == s.id).delete()
        db.query(DBSess).filter(DBSess.class_id == cls.id).delete()

        # Delete the class itself
        db.delete(cls)

    # Finally delete the faculty
    db.delete(fac)
    db.commit()

    return {"status": "success", "message": f"Faculty {faculty_id} and related classes/sessions/attendance deleted"}





@app.get("/classes")
def list_classes(db: Session = Depends(get_db)):
    """
    List all classes with their faculty_id (if any).
    Used in Admin 'Edit Classes data'.
    """
    classes = db.query(Class).all()
    out = []
    for c in classes:
        out.append({
            "id": c.id,
            "title": c.title,
            "course_code": c.course_code,
            "faculty_id": c.faculty_id,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })
    return out







@app.post("/classes")
def create_class(payload: ClassCreate, db: Session = Depends(get_db)):
    """
    Create a new class. If faculty_id is provided, it must exist.
    """
    if payload.faculty_id:
        fac = db.query(Faculty).filter_by(faculty_id=payload.faculty_id).first()
        if not fac:
            raise HTTPException(status_code=400, detail="Faculty not found for given faculty_id")

    cls = Class(
        title=payload.title,
        course_code=payload.course_code,
        faculty_id=payload.faculty_id,
    )
    db.add(cls)
    db.commit()
    db.refresh(cls)

    return {
        "id": cls.id,
        "title": cls.title,
        "course_code": cls.course_code,
        "faculty_id": cls.faculty_id,
        "created_at": cls.created_at.isoformat() if cls.created_at else None,
    }





@app.put("/classes/{class_id}")
def update_class(
    class_id: int,
    payload: ClassUpdate,
    db: Session = Depends(get_db)
):
    cls = db.query(Class).filter_by(id=class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    if payload.title is not None:
        cls.title = payload.title
    if payload.course_code is not None:
        cls.course_code = payload.course_code
    if payload.faculty_id is not None:
        if payload.faculty_id == "":
            cls.faculty_id = None
        else:
            fac = db.query(Faculty).filter_by(faculty_id=payload.faculty_id).first()
            if not fac:
                raise HTTPException(status_code=400, detail="Faculty not found for given faculty_id")
            cls.faculty_id = payload.faculty_id

    db.commit()
    db.refresh(cls)

    return {
        "id": cls.id,
        "title": cls.title,
        "course_code": cls.course_code,
        "faculty_id": cls.faculty_id,
        "created_at": cls.created_at.isoformat() if cls.created_at else None,
    }



@app.delete("/classes/{class_id}")
def delete_class(class_id: int, db: Session = Depends(get_db)):
    """
    Deletes:
    - class row
    - all sessions for that class
    - all attendance for those sessions
    """
    cls = db.query(Class).filter_by(id=class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    # Delete attendance for sessions of this class
    sessions = db.query(DBSess).filter(DBSess.class_id == class_id).all()
    for s in sessions:
        db.query(Attendance).filter(Attendance.session_id == s.id).delete()

    # Delete sessions themselves
    db.query(DBSess).filter(DBSess.class_id == class_id).delete()

    # Delete the class row
    db.delete(cls)
    db.commit()

    return {"status": "success", "message": f"Class {class_id} and related sessions/attendance deleted"}








@app.get("/sessions/{session_id}/faculty_contact")
def get_faculty_contact(session_id: int, db: Session = Depends(get_db)):
    sess = db.query(DBSess).filter(DBSess.id == session_id).first()
    if not sess or not sess.class_ref or not sess.class_ref.faculty_id:
        raise HTTPException(status_code=404, detail="Faculty not found for this session")

    fac = db.query(Faculty).filter(Faculty.faculty_id == sess.class_ref.faculty_id).first()
    if not fac:
        raise HTTPException(status_code=404, detail="Faculty not found")

    return {
      "faculty_id": fac.faculty_id,
      "name": fac.name,
      "email": fac.email,
      "phone": fac.phone,
    }
