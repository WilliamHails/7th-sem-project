// src/pages/GiveAttendance.jsx
import { useEffect, useState } from "react";
import { api, getErrorMessage } from "../api/client";
import CameraCapture from "../components/CameraCapture.jsx";

export default function GiveAttendance() {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [status, setStatus] = useState(null); // { type: "success" | "error", message: string }
  const [loading, setLoading] = useState(false);
  const [facultyContact, setFacultyContact] = useState(null);
  const [contactLoading, setContactLoading] = useState(false);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await api.get("/sessions/active");
        setSessions(res.data || []);
      } catch (err) {
        console.error(err);
        setStatus({ type: "error", message: "Failed to load active sessions" });
      }
    }
    fetchSessions();
  }, []);

  const handleCapture = async (blob) => {
    if (!selectedSessionId) {
      setStatus({ type: "error", message: "Please select a session first." });
      return;
    }
    setStatus(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "capture.jpg");

        // IMPORTANT: send session_id as form field that backend expects
        formData.append("session_id_form", selectedSessionId);  

      // we used query param for session_id in backend
      const res = await api.post(`/recognize?session_id=${selectedSessionId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.match) {
        setStatus({
          type: "success",
          message: `Attendance recorded for ${res.data.enrollment_no} (score: ${res.data.score.toFixed(
            3
          )}).`,
        });
      } else {
        setStatus({
          type: "error",
          message: `No confident match found (best score: ${res.data.best_score?.toFixed(
            3
          ) ?? "N/A"}).`,
        });
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleFetchFacultyContact = async () => {
    if (!selectedSessionId) {
      setStatus({ type: "error", message: "Select a session first to contact faculty." });
      return;
    }
    setContactLoading(true);
    setFacultyContact(null);
    try {
      // This assumes you add the /sessions/{session_id}/faculty_contact endpoint in backend
      const res = await api.get(`/sessions/${selectedSessionId}/faculty_contact`);
      setFacultyContact(res.data);
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: "Could not fetch faculty contact for this session." });
    } finally {
      setContactLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Give Attendance</h2>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          Select active class session
        </label>
        <select
          value={selectedSessionId}
          onChange={(e) => setSelectedSessionId(e.target.value)}
          className="w-full max-w-md border rounded px-3 py-2"
        >
          <option value="">-- Select session --</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.class_title || `Class ${s.class_id}`} – {s.session_date} ({s.start_time} →{" "}
              {s.end_time})
            </option>
          ))}
        </select>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-medium mb-2">Camera</h3>
          <CameraCapture onCapture={handleCapture} />
          {loading && <p className="mt-2 text-sm text-slate-600">Processing, please wait...</p>}
        </div>

        <div className="space-y-4">
          <h3 className="font-medium mb-2">Status</h3>
          {status && (
            <div
              className={`border px-3 py-2 rounded text-sm ${
                status.type === "success"
                  ? "border-green-500 text-green-700 bg-green-50"
                  : "border-red-500 text-red-700 bg-red-50"
              }`}
            >
              {status.message}
            </div>
          )}

          <div className="mt-4">
            <button
              type="button"
              onClick={handleFetchFacultyContact}
              className="px-4 py-2 rounded bg-slate-800 text-white hover:bg-slate-900 text-sm"
            >
              Contact Faculty
            </button>

            {contactLoading && (
              <p className="mt-2 text-xs text-slate-600">Fetching faculty contact...</p>
            )}

            {facultyContact && (
              <div className="mt-3 border rounded px-3 py-2 text-sm bg-white">
                <p className="font-semibold">{facultyContact.name}</p>
                <p>Faculty ID: {facultyContact.faculty_id}</p>
                <p>Email: {facultyContact.email || "N/A"}</p>
                <p>Phone: {facultyContact.phone || "N/A"}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
