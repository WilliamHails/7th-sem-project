// src/pages/Home.jsx
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center gap-6 mt-10">
      <h1 className="text-3xl font-bold">Face Recognition Attendance System</h1>
      <p className="text-slate-700 text-center max-w-xl">
        Use face recognition to mark attendance for active class sessions. Students can view their
        attendance history, faculty can manage sessions and classes, and admin can manage data.
      </p>

      <div className="flex gap-4 mt-4">
        <button
          onClick={() => navigate("/give-attendance")}
          className="px-5 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Give Attendance
        </button>

        <button
          onClick={() => navigate("/login")}
          className="px-5 py-2 rounded bg-slate-800 text-white hover:bg-slate-900"
        >
          Login
        </button>
      </div>
    </div>
  );
}
