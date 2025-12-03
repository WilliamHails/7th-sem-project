import insightface
import cv2
import numpy as np

app = insightface.app.FaceAnalysis()
# simplest: just prepare on CPU with default settings
app.prepare(ctx_id=-1)  # removed nms argument

def bytes_to_rgb_image(file_bytes: bytes):
    """Convert raw bytes -> RGB image (H, W, 3)."""
    arr = np.frombuffer(file_bytes, np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if bgr is None:
        raise ValueError("Could not decode image")
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    return rgb

def get_face_embedding(file_bytes: bytes) -> np.ndarray:
    """
    Returns a normalized embedding for the largest face in the image.
    Raises ValueError if no face is found.
    """
    img = bytes_to_rgb_image(file_bytes)
    faces = app.get(img)
    if not faces:
        raise ValueError("No face detected")

    # pick largest face if multiple
    def area(face):
        x1, y1, x2, y2 = face.bbox
        return (x2 - x1) * (y2 - y1)

    face = max(faces, key=area)
    emb = face.embedding.astype("float32")
    # L2 normalize
    norm = emb / np.linalg.norm(emb)
    return norm
