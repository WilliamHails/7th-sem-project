// src/pages/StudentDashboard.jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, getErrorMessage } from "../api/client";

export default function StudentDashboard() {
  const { enrollmentNo } = useParams();
  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const [sRes, aRes] = await Promise.all([
          api.get(`/students/${enrollmentNo}`),
          api.get(`/students/${enrollmentNo}/attendance`),
        ]);
        setStudent(sRes.data);
        setAttendance(aRes.data || []);
      } catch (e) {
        console.error(e);
        setErr(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    }
    if (enrollmentNo) load();
  }, [enrollmentNo]);

  if (loading) {
    return <p className="text-sm text-slate-600">Loading student dashboard...</p>;
  }

  if (err) {
    return (
      <div className="space-y-3">
        <p className="text-red-700 text-sm border border-red-500 bg-red-50 px-3 py-2 rounded">
          {err}
        </p>
        <Link to="/login" className="text-sm text-blue-700 underline">
          Go back to login
        </Link>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-700">Student not found.</p>
        <Link to="/login" className="text-sm text-blue-700 underline">
          Go back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Student Dashboard</h2>
        <Link to="/login" className="text-sm text-blue-700 underline">
          Back to Login
        </Link>
      </div>

      {/* Student details */}
      <section className="bg-white border rounded px-4 py-4 shadow-sm">
        <h3 className="font-semibold mb-2">Student Details</h3>
        <div className="grid sm:grid-cols-2 gap-y-1 text-sm">
          <div>
            <span className="font-medium">Enrollment No:</span> {student.enrollment_no}
          </div>
          <div>
            <span className="font-medium">Name:</span> {student.name}
          </div>
          <div>
            <span className="font-medium">Semester:</span> {student.semester}
          </div>
        </div>
      </section>

      {/* Attendance details */}
      <section className="bg-white border rounded px-4 py-4 shadow-sm">
        <h3 className="font-semibold mb-3">Attendance Details</h3>

        {attendance.length === 0 ? (
          <p className="text-sm text-slate-600">
            No attendance records found for this student.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border px-2 py-1 text-left">Class</th>
                  <th className="border px-2 py-1 text-left">Session ID</th>
                  <th className="border px-2 py-1 text-left">Date</th>
                  <th className="border px-2 py-1 text-left">Time</th>
                  <th className="border px-2 py-1 text-left">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((row) => (
                  <tr key={row.attendance_id} className="odd:bg-white even:bg-slate-50">
                    <td className="border px-2 py-1">{row.class_title}</td>
                    <td className="border px-2 py-1">{row.session_id}</td>
                    <td className="border px-2 py-1">{row.date}</td>
                    <td className="border px-2 py-1">{row.time}</td>
                    <td className="border px-2 py-1">
                      {row.confidence != null ? row.confidence.toFixed(3) : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
