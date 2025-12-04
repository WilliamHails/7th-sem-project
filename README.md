Face Recognition Attendance System – Backend

This backend provides student face enrollment and recognition using InsightFace embeddings and a FastAPI server.

Tech Stack:
-FastAPI
-InsightFace (embedding-based recognition)
-ONNX Runtime
-Uvicorn
-Python 3.10
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


5. Run the backend
same in anaconda prompt:

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
    student_id	    Text	        1
    name	        Text	        Arijit (or any name)
    file	        File	        choose an image file (front face photo)

    Screenshot-like structure:
    form-data:
        student_id : 1
        name       : Arijit
        file       : <choose file>


    Expected Response:
    {
    "status": "enrolled",
    "student_id": 1,
    "name": "Arijit",
    "image_saved": "D:/.../data/raw/1/image_123.jpg"
    }

    Also, your backend folder data/enrollments/1.json will be created containing the embedding.


c. Test RECOGNIZE endpoint

    This checks whether the face in the image matches any enrolled student.

    Method: POST
    URL:http://127.0.0.1:8000/recognize

    In Postman:
    Go to Body → form-data.

    Add:
    KEY	        TYPE	    VALUE
    file	    File	    choose another picture of the SAME person

    Expected response if matched:
    {
    "match": true,
    "student_id": 1,
    "name": "Arijit",
    "score": 0.78
    }

    The score is similarity — higher means better.

    Expected response if NOT matched:
    {
    "match": false,
    "student_id": null,
    "score": 0.12
    }