// src/pages/AdminDashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../api/client";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("students"); // "students" | "faculty" | "classes"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Admin Dashboard</h2>
        <Link to="/login" className="text-sm text-blue-700 underline">
          Back to Login
        </Link>
      </div>

      <div className="flex border rounded overflow-hidden text-sm">
        {["students", "faculty", "classes"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 ${
              activeTab === tab ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-900"
            }`}
          >
            {tab === "students" ? "Students" : tab === "faculty" ? "Faculty" : "Classes"}
          </button>
        ))}
      </div>

      {activeTab === "students" && <AdminStudents />}
      {activeTab === "faculty" && <AdminFaculty />}
      {activeTab === "classes" && <AdminClasses />}
    </div>
  );
}

/* ---------------- STUDENTS TAB ---------------- */

function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);

  const [form, setForm] = useState({
    enrollment_no: "",
    name: "",
    semester: "",
    file: null,
  });
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await api.get("/students");
      setStudents(res.data || []);
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.enrollment_no || !form.name || !form.semester || !form.file) {
      setStatus({
        type: "error",
        message: "Please fill all fields and choose a face image.",
      });
      return;
    }
    setCreating(true);
    setStatus(null);
    try {
      const fd = new FormData();
      fd.append("enrollment_no", form.enrollment_no.trim());
      fd.append("name", form.name.trim());
      fd.append("semester", form.semester.trim());
      fd.append("file", form.file);

      await api.post("/enroll", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setStatus({
        type: "success",
        message: `Student ${form.enrollment_no} enrolled successfully.`,
      });
      setForm({ enrollment_no: "", name: "", semester: "", file: null });
      await load();
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: getErrorMessage(err) });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (enrollment_no) => {
    if (!window.confirm(`Delete student ${enrollment_no}? This cannot be undone.`)) return;
    setStatus(null);
    try {
      await api.delete(`/students/${enrollment_no}`);
      setStatus({
        type: "success",
        message: `Student ${enrollment_no} deleted successfully.`,
      });
      await load();
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: getErrorMessage(err) });
    }
  };

  return (
    <div className="space-y-5">
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

      {/* Create student + face */}
      <section className="bg-white border rounded px-4 py-4 shadow-sm space-y-3">
        <h3 className="font-semibold text-sm">Add New Student (with Face Enrollment)</h3>
        <form onSubmit={handleCreate} className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <label className="block font-medium mb-1">Enrollment No</label>
            <input
              type="text"
              value={form.enrollment_no}
              onChange={(e) => setForm((f) => ({ ...f, enrollment_no: e.target.value }))}
              className="border rounded px-2 py-1 w-full"
              placeholder="22UCS001"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="border rounded px-2 py-1 w-full"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Semester</label>
            <input
              type="text"
              value={form.semester}
              onChange={(e) => setForm((f) => ({ ...f, semester: e.target.value }))}
              className="border rounded px-2 py-1 w-full"
              placeholder="7"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Face Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setForm((f) => ({ ...f, file: e.target.files ? e.target.files[0] : null }))
              }
              className="border rounded px-2 py-1 w-full"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={creating}
              className="mt-1 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {creating ? "Enrolling..." : "Enroll Student"}
            </button>
          </div>
        </form>
      </section>

      {/* List students */}
      <section className="bg-white border rounded px-4 py-4 shadow-sm space-y-3">
        <h3 className="font-semibold text-sm">Students</h3>
        {loading ? (
          <p className="text-xs text-slate-600">Loading students...</p>
        ) : students.length === 0 ? (
          <p className="text-xs text-slate-600">No students found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border px-2 py-1 text-left">Enrollment</th>
                  <th className="border px-2 py-1 text-left">Name</th>
                  <th className="border px-2 py-1 text-left">Semester</th>
                  <th className="border px-2 py-1 text-left">Face Registered</th>
                  <th className="border px-2 py-1 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.enrollment_no} className="odd:bg-white even:bg-slate-50">
                    <td className="border px-2 py-1">{s.enrollment_no}</td>
                    <td className="border px-2 py-1">{s.name}</td>
                    <td className="border px-2 py-1">{s.semester}</td>
                    <td className="border px-2 py-1">
                      {s.face_registered ? "Yes" : "No"}
                    </td>
                    <td className="border px-2 py-1">
                      <button
                        onClick={() => handleDelete(s.enrollment_no)}
                        className="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                      >
                        Delete
                      </button>
                      {/* For now we skip inline update; can be added later if needed */}
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

/* ---------------- FACULTY TAB ---------------- */

function AdminFaculty() {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);

  const [form, setForm] = useState({
    faculty_id: "",
    name: "",
    email: "",
    phone: "",
  });
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await api.get("/faculty");
      setFaculty(res.data || []);
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.faculty_id || !form.name) {
      setStatus({
        type: "error",
        message: "Faculty ID and Name are required.",
      });
      return;
    }
    setCreating(true);
    setStatus(null);
    try {
      await api.post("/faculty", {
        faculty_id: form.faculty_id.trim(),
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
      });
      setStatus({
        type: "success",
        message: `Faculty ${form.faculty_id} created.`,
      });
      setForm({ faculty_id: "", name: "", email: "", phone: "" });
      await load();
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: getErrorMessage(err) });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (faculty_id) => {
    if (
      !window.confirm(
        `Delete faculty ${faculty_id} and all their classes/sessions/attendance?`
      )
    )
      return;
    setStatus(null);
    try {
      await api.delete(`/faculty/${faculty_id}`);
      setStatus({
        type: "success",
        message: `Faculty ${faculty_id} deleted.`,
      });
      await load();
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: getErrorMessage(err) });
    }
  };

  return (
    <div className="space-y-5">
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

      <section className="bg-white border rounded px-4 py-4 shadow-sm space-y-3 text-sm">
        <h3 className="font-semibold">Add New Faculty</h3>
        <form onSubmit={handleCreate} className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-medium mb-1">Faculty ID</label>
            <input
              type="text"
              value={form.faculty_id}
              onChange={(e) => setForm((f) => ({ ...f, faculty_id: e.target.value }))}
              className="border rounded px-2 py-1 w-full"
              placeholder="FCS001"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="border rounded px-2 py-1 w-full"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="border rounded px-2 py-1 w-full"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Phone</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="border rounded px-2 py-1 w-full"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={creating}
              className="mt-1 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create Faculty"}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white border rounded px-4 py-4 shadow-sm space-y-3 text-sm">
        <h3 className="font-semibold">Faculty List</h3>
        {loading ? (
          <p className="text-xs text-slate-600">Loading faculty...</p>
        ) : faculty.length === 0 ? (
          <p className="text-xs text-slate-600">No faculty found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border px-2 py-1 text-left">Faculty ID</th>
                  <th className="border px-2 py-1 text-left">Name</th>
                  <th className="border px-2 py-1 text-left">Email</th>
                  <th className="border px-2 py-1 text-left">Phone</th>
                  <th className="border px-2 py-1 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {faculty.map((f) => (
                  <tr key={f.faculty_id} className="odd:bg-white even:bg-slate-50">
                    <td className="border px-2 py-1">{f.faculty_id}</td>
                    <td className="border px-2 py-1">{f.name}</td>
                    <td className="border px-2 py-1">{f.email}</td>
                    <td className="border px-2 py-1">{f.phone}</td>
                    <td className="border px-2 py-1">
                      <button
                        onClick={() => handleDelete(f.faculty_id)}
                        className="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                      >
                        Delete
                      </button>
                      {/* Update could be added later similarly */}
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

/* ---------------- CLASSES TAB ---------------- */

function AdminClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);

  const [form, setForm] = useState({
    title: "",
    course_code: "",
    faculty_id: "",
  });
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await api.get("/classes");
      setClasses(res.data || []);
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title) {
      setStatus({
        type: "error",
        message: "Class title is required.",
      });
      return;
    }
    setCreating(true);
    setStatus(null);
    try {
      await api.post("/classes", {
        title: form.title.trim(),
        course_code: form.course_code.trim() || null,
        faculty_id: form.faculty_id.trim() || null,
      });
      setStatus({
        type: "success",
        message: `Class '${form.title}' created.`,
      });
      setForm({ title: "", course_code: "", faculty_id: "" });
      await load();
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: getErrorMessage(err) });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (class_id) => {
    if (
      !window.confirm(
        `Delete class ${class_id} and all its sessions and attendance?`
      )
    )
      return;
    setStatus(null);
    try {
      await api.delete(`/classes/${class_id}`);
      setStatus({
        type: "success",
        message: `Class ${class_id} deleted.`,
      });
      await load();
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: getErrorMessage(err) });
    }
  };

  return (
    <div className="space-y-5">
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

      <section className="bg-white border rounded px-4 py-4 shadow-sm space-y-3 text-sm">
        <h3 className="font-semibold">Add New Class</h3>
        <form onSubmit={handleCreate} className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-medium mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="border rounded px-2 py-1 w-full"
              placeholder="Database Management"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Course Code (optional)</label>
            <input
              type="text"
              value={form.course_code}
              onChange={(e) => setForm((f) => ({ ...f, course_code: e.target.value }))}
              className="border rounded px-2 py-1 w-full"
              placeholder="CSE301"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">
              Faculty ID (optional, e.g. FCS001)
            </label>
            <input
              type="text"
              value={form.faculty_id}
              onChange={(e) => setForm((f) => ({ ...f, faculty_id: e.target.value }))}
              className="border rounded px-2 py-1 w-full"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={creating}
              className="mt-1 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create Class"}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white border rounded px-4 py-4 shadow-sm space-y-3 text-sm">
        <h3 className="font-semibold">Classes</h3>
        {loading ? (
          <p className="text-xs text-slate-600">Loading classes...</p>
        ) : classes.length === 0 ? (
          <p className="text-xs text-slate-600">No classes found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border px-2 py-1 text-left">ID</th>
                  <th className="border px-2 py-1 text-left">Title</th>
                  <th className="border px-2 py-1 text-left">Course Code</th>
                  <th className="border px-2 py-1 text-left">Faculty ID</th>
                  <th className="border px-2 py-1 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={c.id} className="odd:bg-white even:bg-slate-50">
                    <td className="border px-2 py-1">{c.id}</td>
                    <td className="border px-2 py-1">{c.title}</td>
                    <td className="border px-2 py-1">{c.course_code}</td>
                    <td className="border px-2 py-1">{c.faculty_id}</td>
                    <td className="border px-2 py-1">
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                      >
                        Delete
                      </button>
                      {/* Update could be added later if needed */}
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
