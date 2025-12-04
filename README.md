Face Recognition Attendance System – Backend

This backend provides student face enrollment and recognition using InsightFace embeddings and a FastAPI server.

Tech Stack:
-FastAPI
-InsightFace (embedding-based recognition)
-ONNX Runtime
-Uvicorn
-Python 3.10
-PostgreSQL + SQLAlchemy ORM
-Conda environment


🔧 Setup Instructions (For Any Machine)


1. Install Miniconda (recommended)
Download Miniconda from https://docs.conda.io/en/latest/miniconda.html


2. Clone the Repo
git clone https://github.com/WilliamHails/7th-sem-project.git

cd 7th-sem-project

3. Create and activate environment

run these in anaconda prompt:

    conda create -n fr_env python=3.10 -y

    conda activate fr_env

#####Important#####

Ja korba fr_env er bhitre, especially all those pip commands, naile ulda palda hoiya jae backend e jodi baire kora hoe.

4. Install dependencies
run in said anaconda prompt:

    pip install -r requirements.txt

###This installs the exact working versions used during development.


5. Setup PostgreSQL Database

a. Create the database
    Use pgAdmin or psql:

    CREATE DATABASE facial_attendance;


b. Update your PostgreSQL credentials inside:
    backend/app/database.py


    Modify these lines:

    DATABASE_URL = "postgresql://postgres:<YOUR_PASSWORD>@localhost:5432/facial_attendance"


c. Ensure your tables exist

    Your SQL tables must be imported into the facial_attendance database (students, attendance, sessions, predictions_log, model_info, etc.).

    Your teammates simply need to run your SQL file inside pgAdmin.



6. Directory Structure Required for the Backend

These folders will be created automatically, but ensure repo layout is:

7th-sem-project/
    backend/
        app/
            main.py
            models.py
            database.py
            embed_utils.py

    data/
    enrollments/      # canonical embeddings stored here
    raw/              # original enrollment images
    predictions/      # recognition attempt images


7. Run the backend
same in anaconda prompt:


    conda activate fr_env
    cd backend
    uvicorn app.main:app --reload --port 8000


Backend will start on:
http://127.0.0.1:8000


6. Testing (using postman{install postman if not installed} )

a. Test the health endpoint

    Method: GET
    URL:http://127.0.0.1:8000/health

    Expected Response:
    {"status": "ok"}

    If this works, the FastAPI server is running fine.

b. Test ENROLL endpoint

    This endpoint registers a new student and stores their embedding.
    Method: POST
    URL:http://127.0.0.1:8000/enroll

    In Postman:
    Go to Body → form-data.
    Add the following fields:
    KEY	            TYPE	        VALUE
    enrollment_no   Text	        22UCS001
    name	        Text	        Arijit Das (or any name)
    semester        text            7
    file	        File	        choose an image file (front face photo)


    What enrollment does:

    -Inserts/updates student in DB

    -Saves photo to data/raw/

    -Saves embedding later when canonical embedding is added

    -Inserts into student_images table


    Response example:

    {
    "status": "success",
    "message": "Student enrolled successfully"
    }

    Also, your backend folder data/enrollments/1.json will be created containing the embedding.


c. RECOGNIZE a student

    This checks whether the face in the image matches any enrolled student.

    Method: POST
    URL:http://127.0.0.1:8000/recognize

    In Postman:
    Go to Body → form-data.

    Add:
    KEY	            TYPE	            VALUE
    file	        File	            choose another picture of the SAME person
    session_id      (optional)number    1


    Recognition does:

    -Loads canonical embeddings from data/enrollments

    -Generates probe embedding

    -Finds best cosine similarity match

    -Logs the attempt in predictions_log

    -If matched + session_id provided → inserts row in attendance



    Expected response if matched:
    {
    "match": true,
    "student_id": "22UCS001",
    "score": 0.82,
    "enrollment_no": "22UCS001",
    "logged": true
    }

    The score is similarity — higher means better.


    Failure Response (no match):
    {
    "match": false,
    "best_score": 0.24,
    "logged": true
    }


7. Creating Classes & Sessions (Required for Attendance)

Your backend expects valid sessions.

Add a class:

    INSERT INTO classes (title, course_code)
    VALUES ('AI Lab', 'CS701')
    RETURNING id;


Use the returned class_id to create a session:

    INSERT INTO sessions (class_id, session_date)
    VALUES (1, CURRENT_DATE)
    RETURNING id;


Use this session_id in Postman when testing /recognize, using 

Method: POST

URL: http://127.0.0.1:8000/recognize?session_id={returned id}

Body → form-data:

file → File → again an image of 22UCS001



🧠 Important Notes for Teammates

    Always run backend from Anaconda Prompt, inside fr_env.

    Never reinstall InsightFace manually — use only requirements.txt.

    PostgreSQL must be running before starting backend.

    Embeddings will not work unless .npy canonical files exist in data/enrollments/.