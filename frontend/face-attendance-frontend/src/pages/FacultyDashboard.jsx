// src/pages/FacultyDashboard.jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, getErrorMessage } from "../api/client";

export default function FacultyDashboard() {
  const { facultyId } = useParams();
  const [classesForDropdown, setClassesForDropdown] = useState([]);
  const [classesWithStats, setClassesWithStats] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setStatus(null);
      try {
        const [cRes, statsRes] = await Promise.all([
          api.get(`/faculty/${facultyId}/classes`),
          api.get(`/faculty/${facultyId}/classes_with_stats`),
        ]);
        setClassesForDropdown(cRes.data || []);
        setClassesWithStats(statsRes.data || []);
      } catch (err) {
        console.error(err);
        setStatus({ type: "error", message: getErrorMessage(err) });
      } finally {
        setLoading(false);
      }
    }
    if (facultyId) load();
  }, [facultyId]);

  const handleCreateSession = async () => {
    if (!selectedClassId || !startTime || !endTime) {
      setStatus({
        type: "error",
        message: "Please select class and provide start/end time.",
      });
      return;
    }
    setCreating(true);
    setStatus(null);
    try {
      // backend expects ISO strings, datetime-local gives "YYYY-MM-DDTHH:mm"
    //   const startIso = new Date(startTime).toISOString();
    //   const endIso = new Date(endTime).toISOString();

        const startIso = startTime;
        const endIso = endTime;

      const res = await api.post("/sessions", null, {
        params: {
          class_id: selectedClassId,
          start_time: startIso,
          end_time: endIso,
        },
      });

      setStatus({
        type: "success",
        message: `Session created (ID: ${res.data.id})`,
      });

      // reload stats to include the newly created session
      const statsRes = await api.get(`/faculty/${facultyId}/classes_with_stats`);
      setClassesWithStats(statsRes.data || []);
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: getErrorMessage(err) });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-600">Loading faculty dashboard...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Faculty Dashboard</h2>
        <Link to="/login" className="text-sm text-blue-700 underline">
          Back to Login
        </Link>
      </div>

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

      {/* Create new class session */}
      <section className="bg-white border rounded px-4 py-4 shadow-sm space-y-3">
        <h3 className="font-semibold">Create New Class Session</h3>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Class
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="border rounded px-3 py-2 text-sm max-w-md w-full"
          >
            <option value="">-- Select class --</option>
            {classesForDropdown.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.course_code || "no code"})
              </option>
            ))}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Attendance Start Time
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="border rounded px-3 py-2 text-sm w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Attendance End Time
            </label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="border rounded px-3 py-2 text-sm w-full"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreateSession}
          disabled={creating}
          className="mt-2 px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
        >
          {creating ? "Creating..." : "Create Session"}
        </button>
      </section>

      {/* List classes with stats */}
      <section className="bg-white border rounded px-4 py-4 shadow-sm space-y-3">
        <h3 className="font-semibold">Classes & Attendance Stats</h3>

        {classesWithStats.length === 0 ? (
          <p className="text-sm text-slate-600">
            No classes found for this faculty.
          </p>
        ) : (
          classesWithStats.map((cls) => (
            <div key={cls.class_id} className="border rounded px-3 py-3 mb-3">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <p className="font-medium text-sm">
                    {cls.title} (ID: {cls.class_id})
                  </p>
                  <p className="text-xs text-slate-600">
                    Total present count (all sessions): {cls.present_total}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-600">Overall % present</p>
                  <p className="font-semibold">
                    {cls.percentage != null ? `${cls.percentage}%` : "N/A"}
                  </p>
                </div>
              </div>

              {cls.sessions.length === 0 ? (
                <p className="text-xs text-slate-600">
                  No sessions created for this class.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs border">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="border px-2 py-1 text-left">Session ID</th>
                        <th className="border px-2 py-1 text-left">Start</th>
                        <th className="border px-2 py-1 text-left">End</th>
                        <th className="border px-2 py-1 text-left">Present</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cls.sessions.map((s) => (
                        <tr key={s.session_id} className="odd:bg-white even:bg-slate-50">
                          <td className="border px-2 py-1">{s.session_id}</td>
                          <td className="border px-2 py-1">
                            {s.start_time || "-"}
                          </td>
                          <td className="border px-2 py-1">
                            {s.end_time || "-"}
                          </td>
                          <td className="border px-2 py-1">
                            {s.present_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
