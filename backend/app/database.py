# app/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = "postgresql://postgres:arijit@localhost:5432/facial_attendance"

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True  # avoids broken connections
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# Dependency used in routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
