// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [activeTab, setActiveTab] = useState("student"); // "student" | "faculty" | "admin"
  const [studentEnrollment, setStudentEnrollment] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [facultyPassword, setFacultyPassword] = useState("");
  const [adminId, setAdminId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const handleStudentLogin = () => {
    if (!studentEnrollment.trim()) {
      setError("Please enter enrollment number.");
      return;
    }
    setError(null);
    navigate(`/student/${studentEnrollment.trim()}`);
  };

  const handleFacultyLogin = () => {
    if (!facultyId.trim() || !facultyPassword.trim()) {
      setError("Please enter faculty ID and password.");
      return;
    }
    // Dummy auth: password must equal facultyId
    if (facultyPassword !== facultyId) {
      setError("Invalid credentials (for demo, password = faculty ID).");
      return;
    }
    setError(null);
    navigate(`/faculty/${facultyId.trim()}`);
  };

  const handleAdminLogin = () => {
    if (!adminId.trim() || !adminPassword.trim()) {
      setError("Please enter admin ID and password.");
      return;
    }
    // Dummy auth: admin123 / admin123
    if (!(adminId === "admin123" && adminPassword === "admin123")) {
      setError("Invalid admin credentials (use admin123 / admin123).");
      return;
    }
    setError(null);
    navigate("/admin");
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h2 className="text-2xl font-semibold text-center">Login</h2>

      <div className="flex border rounded overflow-hidden">
        {["student", "faculty", "admin"].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setError(null);
            }}
            className={`flex-1 px-3 py-2 text-sm ${
              activeTab === tab ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-800"
            }`}
          >
            {tab === "student" ? "Student" : tab === "faculty" ? "Faculty" : "Admin"}
          </button>
        ))}
      </div>

      {error && (
        <div className="border border-red-500 text-red-700 bg-red-50 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {activeTab === "student" && (
        <div className="space-y-3 border rounded px-4 py-4 bg-white">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Enrollment number
          </label>
          <input
            type="text"
            value={studentEnrollment}
            onChange={(e) => setStudentEnrollment(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="22UCS001"
          />
          <button
            onClick={handleStudentLogin}
            className="mt-2 w-full rounded bg-blue-600 text-white py-2 text-sm hover:bg-blue-700"
          >
            Login as Student
          </button>
        </div>
      )}

      {activeTab === "faculty" && (
        <div className="space-y-3 border rounded px-4 py-4 bg-white">
          <label className="block text-sm font-medium text-slate-700 mb-1">Faculty ID</label>
          <input
            type="text"
            value={facultyId}
            onChange={(e) => setFacultyId(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="FCS001"
          />

          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input
            type="password"
            value={facultyPassword}
            onChange={(e) => setFacultyPassword(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Same as Faculty ID (for demo)"
          />

          <button
            onClick={handleFacultyLogin}
            className="mt-2 w-full rounded bg-blue-600 text-white py-2 text-sm hover:bg-blue-700"
          >
            Login as Faculty
          </button>
        </div>
      )}

      {activeTab === "admin" && (
        <div className="space-y-3 border rounded px-4 py-4 bg-white">
          <label className="block text-sm font-medium text-slate-700 mb-1">Admin ID</label>
          <input
            type="text"
            value={adminId}
            onChange={(e) => setAdminId(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="admin123"
          />

          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="admin123"
          />

          <button
            onClick={handleAdminLogin}
            className="mt-2 w-full rounded bg-blue-600 text-white py-2 text-sm hover:bg-blue-700"
          >
            Login as Admin
          </button>
        </div>
      )}
    </div>
  );
}
