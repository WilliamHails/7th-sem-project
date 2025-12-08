// src/App.jsx
import { Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home.jsx";
import GiveAttendance from "./pages/GiveAttendance.jsx";
import Login from "./pages/Login.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import FacultyDashboard from "./pages/FacultyDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-800 text-white px-6 py-3 flex items-center justify-between">
        <Link to="/" className="font-semibold text-lg">
          Face Recognition Attendance
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link to="/" className="hover:underline">
            Home
          </Link>
          <Link to="/give-attendance" className="hover:underline">
            Give Attendance
          </Link>
          <Link to="/login" className="hover:underline">
            Login
          </Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/give-attendance" element={<GiveAttendance />} />
          <Route path="/login" element={<Login />} />
          <Route path="/student/:enrollmentNo" element={<StudentDashboard />} />
          <Route path="/faculty/:facultyId" element={<FacultyDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </main>
    </div>
  );
}
