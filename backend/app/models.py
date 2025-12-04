# app/models.py
from sqlalchemy import Column, Integer, String, Date, Time, Text, Boolean, ForeignKey, Float, DateTime
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime


class Student(Base):
    __tablename__ = "students"

    enrollment_no = Column(String(50), primary_key=True)
    name = Column(String(255), nullable=False)
    semester = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    images = relationship("StudentImage", back_populates="student")
    attendance_records = relationship("Attendance", back_populates="student")


class StudentImage(Base):
    __tablename__ = "student_images"

    id = Column(Integer, primary_key=True, index=True)
    enrollment_no = Column(String(50), ForeignKey("students.enrollment_no"))
    file_path = Column(Text, nullable=False)
    captured_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="images")


class Class(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    course_code = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)

    sessions = relationship("Session", back_populates="class_ref")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"))
    session_date = Column(Date, nullable=False)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    class_ref = relationship("Class", back_populates="sessions")
    attendance_records = relationship("Attendance", back_populates="session")


class ModelInfo(Base):
    __tablename__ = "model_info"

    id = Column(Integer, primary_key=True, index=True)
    model_type = Column(String(50), nullable=False)
    file_path = Column(Text, nullable=False)
    trained_at = Column(DateTime, default=datetime.utcnow)

    attendance_records = relationship("Attendance", back_populates="model")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    enrollment_no = Column(String(50), ForeignKey("students.enrollment_no"))
    name_at_time = Column(String(255))
    semester_at_time = Column(String(50))
    date = Column(Date, nullable=False)
    time = Column(Time, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    confidence = Column(Float)
    image_path = Column(Text)
    model_id = Column(Integer, ForeignKey("model_info.id"))
    session_id = Column(Integer, ForeignKey("sessions.id"))

    student = relationship("Student", back_populates="attendance_records")
    model = relationship("ModelInfo", back_populates="attendance_records")
    session = relationship("Session", back_populates="attendance_records")


class PredictionLog(Base):
    __tablename__ = "predictions_log"

    id = Column(Integer, primary_key=True, index=True)
    attempted_at = Column(DateTime, default=datetime.utcnow)
    image_path = Column(Text)
    predicted_enrollment = Column(String(50))
    predicted_name = Column(String(255))
    confidence = Column(Float)
    status = Column(String(50))
    note = Column(Text)
