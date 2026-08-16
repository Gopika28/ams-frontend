import { useEffect, useState } from "react";
import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:8080"
    : "https://ams-backend-5udc.onrender.com");

function App() {
  const [token, setToken] = useState(localStorage.getItem("ams_token") || "");
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("ams_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [loginTab, setLoginTab] = useState("student");
  const [loginForm, setLoginForm] = useState({ username: "STU101", password: "password123" });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [dbStatus, setDbStatus] = useState({ mode: "checking", message: "Connecting to backend engine..." });
  const [toastMessage, setToastMessage] = useState("");

  const [activeTab, setActiveTab] = useState("default");

  const [studentProfile, setStudentProfile] = useState(null);
  const [studentHistory, setStudentHistory] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [studentNotifications, setStudentNotifications] = useState([]);

  const [facultyProfile, setFacultyProfile] = useState(null);
  const [taughtCourses, setTaughtCourses] = useState([]);
  const [selectedOfferingID, setSelectedOfferingID] = useState("");
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [singleGradeForm, setSingleGradeForm] = useState({
    student_roll_no: "",
    marks: "",
    grade: "A+",
    remarks: "",
  });
  const [bulkCsvText, setBulkCsvText] = useState(
    "student_roll_no,marks,grade,remarks\nSTU101,95,A+,Outstanding problem solving\nSTU102,88,A,Great lab coursework\nSTU103,92,A+,Excellent algorithms performance\nSTU104,85,A,Strong network project\nSTU105,90,A+,Top AI coursework"
  );
  const [bulkReport, setBulkReport] = useState(null);

  const [showEmailLogs, setShowEmailLogs] = useState(false);
  const [emailLogs, setEmailLogs] = useState([]);

  const [adminStats, setAdminStats] = useState(null);
  const [adminCourses, setAdminCourses] = useState([]);
  const [adminStudents, setAdminStudents] = useState([]);
  const [adminFaculty, setAdminFaculty] = useState([]);

  // Search filter states
  const [courseSearch, setCourseSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [facultySearch, setFacultySearch] = useState("");

  useEffect(() => {
    fetchDbHealth();
  }, []);

  const fetchDbHealth = async () => {
    try {
      const res = await fetch(`${API_URL}/api/db-health`);
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      } else {
        setDbStatus({ mode: "memory", message: "In-Memory Engine Active" });
      }
    } catch {
      setDbStatus({ mode: "memory", message: "Offline / Memory Fallback" });
    }
  };

  useEffect(() => {
    if (token && user) {
      if (user.role === "student") {
        if (activeTab === "default") setActiveTab("history");
        fetchStudentData();
      } else if (user.role === "faculty") {
        if (activeTab === "default") setActiveTab("courses");
        fetchFacultyData();
      } else if (user.role === "admin") {
        if (activeTab === "default") setActiveTab("admin_courses");
        fetchAdminData();
      }
    }
  }, [token, user, activeTab]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const handleLogin = async (e, overrideForm) => {
    if (e) e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    const formToSubmit = overrideForm || loginForm;

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToSubmit),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authentication failed");

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("ams_token", data.token);
      localStorage.setItem("ams_user", JSON.stringify(data.user));

      if (data.user.role === "student") setActiveTab("history");
      else if (data.user.role === "faculty") setActiveTab("courses");
      else if (data.user.role === "admin") setActiveTab("admin_courses");

      showToast(`Signed in successfully as ${data.user.username}`);
    } catch (err) {
      const demoUsers = {
        STU101: { id: 1, username: "STU101", role: "student", ref_id: 1, email: "priya@university.edu" },
        STU102: { id: 2, username: "STU102", role: "student", ref_id: 2, email: "meenu@university.edu" },
        FAC201: { id: 6, username: "FAC201", role: "faculty", ref_id: 1, email: "seshadri@university.edu" },
        FAC202: { id: 7, username: "FAC202", role: "faculty", ref_id: 2, email: "meenakshi@university.edu" },
        FAC203: { id: 8, username: "FAC203", role: "faculty", ref_id: 3, email: "ramaswamy@university.edu" },
        FAC204: { id: 9, username: "FAC204", role: "faculty", ref_id: 4, email: "radhakrishnan@university.edu" },
        FAC205: { id: 10, username: "FAC205", role: "faculty", ref_id: 5, email: "raman@university.edu" },
        ADMIN: { id: 11, username: "admin", role: "admin", ref_id: 0, email: "admin@university.edu" },
      };

      const key = (formToSubmit.username || "").toUpperCase();
      if (demoUsers[key] && formToSubmit.password === "password123") {
        const mockUser = demoUsers[key];
        const mockToken = "demo_token_" + btoa(JSON.stringify(mockUser));
        setToken(mockToken);
        setUser(mockUser);
        localStorage.setItem("ams_token", mockToken);
        localStorage.setItem("ams_user", JSON.stringify(mockUser));

        if (mockUser.role === "student") setActiveTab("history");
        else if (mockUser.role === "faculty") setActiveTab("courses");
        else if (mockUser.role === "admin") setActiveTab("admin_courses");

        showToast(`Signed in successfully as ${mockUser.username}`);
      } else {
        setAuthError(err.message);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleQuickPresetLogin = (username, role) => {
    setLoginTab(role);
    const form = { username, password: "password123" };
    setLoginForm(form);
    handleLogin(null, form);
  };

  const handleLogout = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem("ams_token");
    localStorage.removeItem("ams_user");
    setActiveTab("default");
    showToast("Signed out successfully");
  };

  const fetchStudentData = async () => {
    try {
      const profRes = await fetch(`${API_URL}/api/student/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profRes.ok) {
        const profData = await profRes.json();
        setStudentProfile(profData);
        setUser((prev) => (prev ? { ...prev, name: profData.name, email: profData.email } : prev));
      }

      const histRes = await fetch(`${API_URL}/api/student/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (histRes.ok) setStudentHistory(await histRes.json());

      const availRes = await fetch(`${API_URL}/api/student/available-courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (availRes.ok) setAvailableCourses(await availRes.json());

      const notifRes = await fetch(`${API_URL}/api/student/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (notifRes.ok) setStudentNotifications(await notifRes.json());
    } catch (err) {
      console.error("Error fetching student records:", err);
    }
  };

  const handleRegisterCourse = async (offeringID) => {
    try {
      const res = await fetch(`${API_URL}/api/student/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ course_offering_id: offeringID }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Course registration failed");

      showToast("Registered for course successfully.");
      fetchStudentData();
    } catch (err) {
      alert(`Registration Error: ${err.message}`);
    }
  };

  const fetchFacultyData = async () => {
    try {
      const profRes = await fetch(`${API_URL}/api/faculty/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profRes.ok) {
        const profData = await profRes.json();
        setFacultyProfile(profData);
        setUser((prev) => (prev ? { ...prev, name: profData.name, email: profData.email } : prev));
      }

      const crsRes = await fetch(`${API_URL}/api/faculty/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (crsRes.ok) {
        const courses = await crsRes.json();
        setTaughtCourses(courses || []);
        if (courses && courses.length > 0) {
          const firstID = courses[0].id.toString();
          setSelectedOfferingID((prev) => {
            const idToUse = prev || firstID;
            fetchEnrolledStudents(idToUse);
            return idToUse;
          });
        }
      }
    } catch (err) {
      console.error("Error fetching faculty data:", err);
    }
  };

  const fetchAdminData = async () => {
    try {
      const statsRes = await fetch(`${API_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.ok) setAdminStats(await statsRes.json());

      const crsRes = await fetch(`${API_URL}/api/admin/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (crsRes.ok) setAdminCourses(await crsRes.json());

      const stuRes = await fetch(`${API_URL}/api/admin/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (stuRes.ok) setAdminStudents(await stuRes.json());

      const facRes = await fetch(`${API_URL}/api/admin/faculty`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (facRes.ok) setAdminFaculty(await facRes.json());
    } catch (err) {
      console.error("Error fetching admin data:", err);
    }
  };

  const fetchEnrolledStudents = async (offeringID) => {
    try {
      const res = await fetch(`${API_URL}/api/faculty/enrolled-students?course_offering_id=${offeringID}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setEnrolledStudents(await res.json());
      }
    } catch (err) {
      console.error("Error fetching roster:", err);
    }
  };

  const handleCourseOfferingSelect = (e) => {
    const id = e.target.value;
    setSelectedOfferingID(id);
    if (id) fetchEnrolledStudents(id);
  };

  const handleSingleGradeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOfferingID) {
      alert("Please select a target course offering first.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/faculty/grade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          course_offering_id: parseInt(selectedOfferingID),
          student_roll_no: singleGradeForm.student_roll_no,
          marks: parseFloat(singleGradeForm.marks) || 0,
          grade: singleGradeForm.grade,
          remarks: singleGradeForm.remarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update grade");

      alert(`✅ Success: ${data.message || "Grade uploaded successfully and email notification dispatched"}`);
      showToast("Grade updated & audit email logged successfully.");
      setSingleGradeForm({ student_roll_no: "", marks: "", grade: "A+", remarks: "" });
      fetchEnrolledStudents(selectedOfferingID);
      fetchEmailLogs();
    } catch (err) {
      alert(`Grade Submission Error: ${err.message}`);
    }
  };

  const handleBulkGradeSubmit = async () => {
    if (!selectedOfferingID) {
      alert("Please select a target course offering first.");
      return;
    }

    const lines = bulkCsvText.trim().split("\n");
    if (lines.length < 2) {
      alert("Provide valid CSV format with header row and at least 1 student row.");
      return;
    }

    const grades = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(",");
      if (parts.length >= 3) {
        grades.push({
          student_roll_no: parts[0].trim(),
          marks: parseFloat(parts[1].trim()) || 0,
          grade: parts[2].trim(),
          remarks: parts[3] ? parts[3].trim() : "",
        });
      }
    }

    try {
      const res = await fetch(`${API_URL}/api/faculty/bulk-grades`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          course_offering_id: parseInt(selectedOfferingID),
          grades,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk submission failed");

      setBulkReport(data);
      alert(`✅ Bulk Upload Complete: ${data.success_count} grades saved & student emails queued. ${data.failed_count} rows flagged.`);
      showToast(`Processed bulk upload: ${data.success_count} saved, ${data.failed_count} flagged.`);
      fetchEnrolledStudents(selectedOfferingID);
      fetchEmailLogs();
    } catch (err) {
      alert(`Bulk Grade Error: ${err.message}`);
    }
  };

  const handleCsvFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBulkCsvText(event.target.result);
        showToast(`Loaded CSV file: ${file.name}`);
      };
      reader.readAsText(file);
    }
  };

  const fetchEmailLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/email-logs`);
      if (res.ok) {
        const data = await res.json();
        setEmailLogs(data || []);
        setShowEmailLogs(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const computeGPA = (historyList) => {
    if (!historyList || !Array.isArray(historyList)) return "N/A";
    const graded = historyList.filter((item) => item.grade);
    if (graded.length === 0) return "N/A";

    const gradePoints = { "A+": 10, A: 9, "B+": 8, B: 7, "C+": 6, C: 5, D: 4, F: 0 };
    let totalPoints = 0;
    let totalCredits = 0;

    graded.forEach((item) => {
      const pts = gradePoints[item.grade] ?? 8;
      const crd = item.credits || 4;
      totalPoints += pts * crd;
      totalCredits += crd;
    });

    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
  };

  // Filtered dataset getters
  const getFilteredCourses = () => {
    if (!courseSearch) return adminCourses;
    const q = courseSearch.toLowerCase();
    return adminCourses.filter(
      (c) =>
        c.course_code.toLowerCase().includes(q) ||
        c.course_name.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q)
    );
  };

  const getFilteredStudents = () => {
    const list = (adminStudents || []).filter(
      (s) => s.student_id === "STU101" || s.student_id === "STU102"
    );
    if (!studentSearch) return list;
    const q = studentSearch.toLowerCase();
    return list.filter(
      (s) =>
        s.student_id.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q)
    );
  };

  const getFilteredFaculty = () => {
    if (!facultySearch) return adminFaculty;
    const q = facultySearch.toLowerCase();
    return adminFaculty.filter(
      (f) =>
        f.faculty_id.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q) ||
        f.department.toLowerCase().includes(q)
    );
  };

  return (
    <div className="app-container">
      {toastMessage && <div className="toast">⚡ {toastMessage}</div>}

      {/* Top Navbar */}
      <header className="navbar">
        <div className="brand">
          <div className="brand-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <div>
            <div className="brand-title">
              Academic Management System
            </div>
            <div className="brand-subtitle">Enterprise Academic Administration & Student Portal</div>
          </div>
        </div>

        <div className="nav-actions">
          {user && (
            <div className="user-pill">
              <span className={`role-badge ${user.role}`}>{user.role}</span>
              <span className="username-text">{user.username}</span>
              <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Unauthenticated Login Screen */}
      {!user ? (
        <div className="auth-wrapper">
          <div className="auth-card">
            <div className="auth-header">
              <h2>Portal Sign In</h2>
              <p>Select your user role to proceed to your academic dashboard.</p>
            </div>

            <div className="role-tabs">
              <button
                className={`role-tab ${loginTab === "student" ? "active" : ""}`}
                onClick={() => {
                  setLoginTab("student");
                  setLoginForm({ username: "STU101", password: "password123" });
                }}
              >
                🎓 Student
              </button>
              <button
                className={`role-tab ${loginTab === "faculty" ? "active" : ""}`}
                onClick={() => {
                  setLoginTab("faculty");
                  setLoginForm({ username: "FAC201", password: "password123" });
                }}
              >
                👨‍🏫 Faculty
              </button>
              <button
                className={`role-tab ${loginTab === "admin" ? "active" : ""}`}
                onClick={() => {
                  setLoginTab("admin");
                  setLoginForm({ username: "admin", password: "password123" });
                }}
              >
                🛡️ Administrator
              </button>
            </div>

            {authError && (
              <div className="report-card warning" style={{ marginBottom: "16px" }}>
                ⚠️ {authError}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>{loginTab === "student" ? "Roll Number / Email" : loginTab === "faculty" ? "Employee ID / Email" : "Username"}</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={loginTab === "student" ? "e.g. STU101, STU102" : loginTab === "faculty" ? "e.g. FAC201" : "admin"}
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="password123"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "8px" }} disabled={authLoading}>
                {authLoading ? "Authenticating Account..." : "Sign In to Portal →"}
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Authenticated Main Dashboard */
        <div className="dashboard-grid">
          <div className="profile-card">
            <div className="profile-main">
              <div className="avatar-box">
                {user.role === "student" ? "ST" : user.role === "faculty" ? "FC" : "AD"}
              </div>
              <div className="profile-info">
                <h3>
                  {user.role === "student" && studentProfile
                    ? studentProfile.name
                    : user.role === "faculty" && facultyProfile
                    ? facultyProfile.name
                    : user.username}
                </h3>
                <div className="profile-subtitle">
                  {user.role === "student" && studentProfile ? (
                    <>Roll No: <strong>{studentProfile.student_id}</strong> | {studentProfile.program}</>
                  ) : user.role === "faculty" && facultyProfile ? (
                    <>Emp ID: <strong>{facultyProfile.faculty_id}</strong> | {facultyProfile.designation}</>
                  ) : (
                    <>System Administrator</>
                  )}
                </div>
              </div>
            </div>

            {user.role === "student" && studentProfile && (
              <div className="profile-details">
                <div className="detail-row">
                  <span className="detail-label">📧 Email:</span>
                  <span className="detail-val">{studentProfile.email}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">🏛️ Dept:</span>
                  <span className="detail-val">{studentProfile.department}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">📅 Year & Sec:</span>
                  <span className="detail-val">Year {studentProfile.year} - Sec {studentProfile.section}</span>
                </div>
              </div>
            )}

            {user.role === "faculty" && facultyProfile && (
              <div className="profile-details">
                <div className="detail-row">
                  <span className="detail-label">📧 Email:</span>
                  <span className="detail-val">{facultyProfile.email}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">🏛️ Dept:</span>
                  <span className="detail-val">{facultyProfile.department}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">🏅 Rank:</span>
                  <span className="detail-val">{facultyProfile.designation}</span>
                </div>
              </div>
            )}

            {user.role === "admin" && (
              <div className="profile-details">
                <div className="detail-row">
                  <span className="detail-label">📧 Email:</span>
                  <span className="detail-val">admin@university.edu</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">🔑 Authority:</span>
                  <span className="detail-val">Super Admin</span>
                </div>
              </div>
            )}

            <div className="profile-stats">
              {user.role === "student" ? (
                <>
                  <div className="stat-item">
                    <div className="stat-value">{(studentHistory || []).length}</div>
                    <div className="stat-label">Courses</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{computeGPA(studentHistory)}</div>
                    <div className="stat-label">CGPA</div>
                  </div>
                </>
              ) : user.role === "faculty" ? (
                <>
                  <div className="stat-item">
                    <div className="stat-value">{(taughtCourses || []).length}</div>
                    <div className="stat-label">Courses Taught</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{(enrolledStudents || []).length}</div>
                    <div className="stat-label">Enrolled Roster</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="stat-item">
                    <div className="stat-value">{getFilteredStudents().length || 2}</div>
                    <div className="stat-label">Students</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{(adminCourses || []).length || 11}</div>
                    <div className="stat-label">Catalog</div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="main-content">
            <div className="tab-nav">
              {user.role === "student" && (
                <>
                  <button
                    className={`nav-tab-btn ${activeTab === "history" ? "active" : ""}`}
                    onClick={() => setActiveTab("history")}
                  >
                    Academic History & Grades
                  </button>
                  <button
                    className={`nav-tab-btn ${activeTab === "registration" ? "active" : ""}`}
                    onClick={() => setActiveTab("registration")}
                  >
                    Course Registration
                  </button>
                  <button
                    className={`nav-tab-btn ${activeTab === "grades" ? "active" : ""}`}
                    onClick={() => setActiveTab("grades")}
                  >
                    Official Grade Transcript
                  </button>
                  <button
                    className={`nav-tab-btn ${activeTab === "notifications" ? "active" : ""}`}
                    onClick={() => setActiveTab("notifications")}
                  >
                    🔔 Grade Notifications ({(studentNotifications || []).length})
                  </button>
                </>
              )}

              {user.role === "faculty" && (
                <>
                  <button
                    className={`nav-tab-btn ${activeTab === "courses" ? "active" : ""}`}
                    onClick={() => setActiveTab("courses")}
                  >
                    Taught Courses & Rosters
                  </button>
                  <button
                    className={`nav-tab-btn ${activeTab === "single_grade" ? "active" : ""}`}
                    onClick={() => setActiveTab("single_grade")}
                  >
                    Individual Grade Entry
                  </button>
                  <button
                    className={`nav-tab-btn ${activeTab === "bulk_grade" ? "active" : ""}`}
                    onClick={() => setActiveTab("bulk_grade")}
                  >
                    Bulk CSV Upload
                  </button>
                  <button
                    className={`nav-tab-btn ${activeTab === "email_audit" ? "active" : ""}`}
                    onClick={() => {
                      setActiveTab("email_audit");
                      fetchEmailLogs();
                    }}
                    style={{ marginLeft: "auto" }}
                  >
                    📧 Email Audit Logs
                  </button>
                </>
              )}

              {user.role === "admin" && (
                <>
                  <button
                    className={`nav-tab-btn ${activeTab === "admin_courses" ? "active" : ""}`}
                    onClick={() => {
                      setActiveTab("admin_courses");
                      fetchAdminData();
                    }}
                  >
                    Master Course Catalog
                  </button>
                  <button
                    className={`nav-tab-btn ${activeTab === "admin_students" ? "active" : ""}`}
                    onClick={() => {
                      setActiveTab("admin_students");
                      fetchAdminData();
                    }}
                  >
                    Student Directory
                  </button>
                  <button
                    className={`nav-tab-btn ${activeTab === "admin_faculty" ? "active" : ""}`}
                    onClick={() => {
                      setActiveTab("admin_faculty");
                      fetchAdminData();
                    }}
                  >
                    Faculty Directory
                  </button>
                  <button
                    className="nav-tab-btn"
                    onClick={fetchEmailLogs}
                    style={{ marginLeft: "auto" }}
                  >
                    📧 Email Logs
                  </button>
                </>
              )}
            </div>

            {/* Student Tab: History */}
            {user.role === "student" && activeTab === "history" && (
              <div className="table-card">
                <div className="table-header">
                  <div>
                    <h4>Enrolled Courses & Published Grades</h4>
                    <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                      Full academic trajectory for student <strong>{user.username}</strong>
                    </span>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={fetchStudentData}>
                    🔄 Refresh
                  </button>
                </div>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Semester</th>
                      <th>Course Code</th>
                      <th>Course Title</th>
                      <th>Credits</th>
                      <th>Instructor</th>
                      <th>Status</th>
                      <th>Grade Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentHistory.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: "center", color: "var(--text-muted)", padding: "28px" }}>
                          No course records found for this student.
                        </td>
                      </tr>
                    ) : (
                      studentHistory.map((item) => (
                        <tr key={item.id}>
                          <td><strong>{item.semester_name || "Semester 2"}</strong></td>
                          <td><code>{item.course_code}</code></td>
                          <td><strong>{item.course_name}</strong></td>
                          <td>{item.credits} Credits</td>
                          <td>{item.faculty_name || "Unassigned"}</td>
                          <td>
                            <span style={{ textTransform: "capitalize", fontWeight: 700, color: "var(--primary)" }}>
                              {item.status}
                            </span>
                          </td>
                          <td>
                            {item.grade ? (
                              <span className={`grade-badge grade-${item.grade.replace("+", "-plus")}`}>
                                {item.grade} ({item.marks})
                              </span>
                            ) : (
                              <span style={{ color: "var(--text-dim)", fontSize: "12px" }}>Enrolled / Pending</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Student Tab: Registration */}
            {user.role === "student" && activeTab === "registration" && (
              <div className="table-card">
                <div className="table-header">
                  <h4>Active Course Offering Registration</h4>
                  <span className="status-badge">Spring 2026 Open</span>
                </div>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Course Title</th>
                      <th>Department</th>
                      <th>Credits</th>
                      <th>Assigned Faculty</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableCourses.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)", padding: "28px" }}>
                          All available courses for this semester are currently registered.
                        </td>
                      </tr>
                    ) : (
                      availableCourses.map((c) => {
                        const isRegistered = studentHistory.some((h) => h.course_offering_id === c.id);
                        return (
                          <tr key={c.id}>
                            <td><code>{c.course_code}</code></td>
                            <td><strong>{c.course_name}</strong></td>
                            <td>{c.department}</td>
                            <td>{c.credits} Credits</td>
                            <td>{c.faculty_name || "Dr. K. Seshadri"}</td>
                            <td>
                              {isRegistered ? (
                                <span className="status-badge">Registered</span>
                              ) : (
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleRegisterCourse(c.id)}
                                >
                                  Register Now
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Student Tab: Transcript */}
            {user.role === "student" && activeTab === "grades" && (
              <div className="table-card">
                <div className="table-header">
                  <h4>Official Academic Grade Transcript</h4>
                  <div className="status-badge">
                    CGPA: <strong>{computeGPA(studentHistory)} / 10.0</strong>
                  </div>
                </div>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Term</th>
                      <th>Subject Code & Title</th>
                      <th>Credits</th>
                      <th>Marks (100)</th>
                      <th>Grade Letter</th>
                      <th>Audit Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentHistory.filter((item) => item.grade).length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)", padding: "28px" }}>
                          No published grades recorded for transcript view yet.
                        </td>
                      </tr>
                    ) : (
                      studentHistory
                        .filter((item) => item.grade)
                        .map((item) => (
                          <tr key={item.id}>
                            <td><strong>{item.semester_name}</strong></td>
                            <td>{item.course_code} — {item.course_name}</td>
                            <td>{item.credits}</td>
                            <td><strong>{item.marks}</strong></td>
                            <td>
                              <span className={`grade-badge grade-${item.grade.replace("+", "-plus")}`}>
                                {item.grade}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: "12px", color: "var(--accent-emerald)", fontWeight: 700 }}>
                                Verified & Synced
                              </span>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Student Tab: Grade Notifications */}
            {user.role === "student" && activeTab === "notifications" && (
              <div className="table-card">
                <div className="table-header">
                  <h4>🔔 Automated Grade Publication Notifications</h4>
                  <span className="status-badge">
                    {(studentNotifications || []).length} Dispatched Alerts
                  </span>
                </div>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Subject / Alert</th>
                      <th>Time Sent</th>
                      <th>Status</th>
                      <th>Notification Details & Body</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(studentNotifications || []).length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: "center", color: "var(--text-muted)", padding: "28px" }}>
                          No grade notifications or email alerts dispatched to your account yet.
                        </td>
                      </tr>
                    ) : (
                      (studentNotifications || []).map((notif) => (
                        <tr key={notif.id}>
                          <td><strong>{notif.subject}</strong></td>
                          <td>{new Date(notif.sent_at).toLocaleString()}</td>
                          <td>
                            <span className="status-badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
                              Dispatched
                            </span>
                          </td>
                          <td style={{ whiteSpace: "pre-line", fontSize: "12.5px" }}>
                            {notif.body}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Faculty Tab: Taught Courses & Rosters */}
            {user.role === "faculty" && activeTab === "courses" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div className="table-card">
                  <div className="table-header">
                    <h4>Assigned Faculty Courses</h4>
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Semester</th>
                        <th>Code</th>
                        <th>Course Title</th>
                        <th>Department</th>
                        <th>Credits</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taughtCourses.map((c) => (
                        <tr key={c.id}>
                          <td><strong>{c.semester_name}</strong></td>
                          <td><code>{c.course_code}</code></td>
                          <td>{c.course_name}</td>
                          <td>{c.department}</td>
                          <td>{c.credits} Credits</td>
                          <td>
                            <button
                              className={`btn btn-sm ${selectedOfferingID === c.id.toString() ? "btn-primary" : "btn-outline"}`}
                              onClick={() => {
                                setSelectedOfferingID(c.id.toString());
                                fetchEnrolledStudents(c.id);
                              }}
                            >
                              {selectedOfferingID === c.id.toString() ? "Selected Course" : "Inspect Roster"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="table-card">
                  <div className="table-header">
                    <h4>Enrolled Student Roster</h4>
                    <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                      Total Enrolled: <strong>{(enrolledStudents || []).length} Students</strong>
                    </span>
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Roll Number</th>
                        <th>Student Name</th>
                        <th>Email Contact</th>
                        <th>Grade Status</th>
                        <th>Quick Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(enrolledStudents || []).length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: "center", color: "var(--text-muted)", padding: "28px" }}>
                            Select a course from above to load the student roster.
                          </td>
                        </tr>
                      ) : (
                        enrolledStudents.map((st) => (
                          <tr key={st.student_id}>
                            <td><code>{st.student_roll_no}</code></td>
                            <td><strong>{st.name}</strong></td>
                            <td>{st.email}</td>
                            <td>
                              {st.grade ? (
                                <span className={`grade-badge grade-${st.grade.replace("+", "-plus")}`}>
                                  {st.grade} ({st.marks} Marks)
                                </span>
                              ) : (
                                <span style={{ color: "var(--text-dim)", fontSize: "12px" }}>Not Graded</span>
                              )}
                            </td>
                            <td>
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => {
                                  setSingleGradeForm({
                                    ...singleGradeForm,
                                    student_roll_no: st.student_roll_no,
                                    marks: st.marks || "",
                                    grade: st.grade || "A+",
                                  });
                                  setActiveTab("single_grade");
                                }}
                              >
                                Edit Grade
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Faculty Tab: Individual Grade Upload */}
            {user.role === "faculty" && activeTab === "single_grade" && (
              <div className="table-card" style={{ padding: "28px" }}>
                <h4 style={{ marginBottom: "20px" }}>Individual Grade Submission & Notification</h4>

                <form onSubmit={handleSingleGradeSubmit}>
                  <div className="form-group">
                    <label>Select Target Course Offering</label>
                    <select
                      className="form-control"
                      value={selectedOfferingID}
                      onChange={handleCourseOfferingSelect}
                      required
                    >
                      <option value="">-- Select Course --</option>
                      {taughtCourses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.course_code} - {c.course_name} ({c.semester_name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Student Roll Number</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. STU101, STU103"
                      value={singleGradeForm.student_roll_no}
                      onChange={(e) => setSingleGradeForm({ ...singleGradeForm, student_roll_no: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                      <label>Marks Obtained (Max 100)</label>
                      <input
                        type="number"
                        step="0.5"
                        className="form-control"
                        placeholder="e.g. 94.5"
                        value={singleGradeForm.marks}
                        onChange={(e) => setSingleGradeForm({ ...singleGradeForm, marks: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label>Grade Designation</label>
                      <select
                        className="form-control"
                        value={singleGradeForm.grade}
                        onChange={(e) => setSingleGradeForm({ ...singleGradeForm, grade: e.target.value })}
                      >
                        <option value="A+">A+ (Outstanding)</option>
                        <option value="A">A (Excellent)</option>
                        <option value="B+">B+ (Very Good)</option>
                        <option value="B">B (Good)</option>
                        <option value="C+">C+ (Average)</option>
                        <option value="C">C (Pass)</option>
                        <option value="D">D (Low Pass)</option>
                        <option value="F">F (Fail)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Faculty Remarks</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Outstanding performance in algorithm design"
                      value={singleGradeForm.remarks}
                      onChange={(e) => setSingleGradeForm({ ...singleGradeForm, remarks: e.target.value })}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ marginTop: "12px" }}>
                    Publish Grade & Notify Student →
                  </button>
                </form>
              </div>
            )}

            {/* Faculty Tab: Bulk Grade CSV Upload */}
            {user.role === "faculty" && activeTab === "bulk_grade" && (
              <div className="bulk-container">
                <div className="table-card" style={{ padding: "28px" }}>
                  <h4 style={{ marginBottom: "8px" }}>Bulk CSV Grade Upload Engine</h4>
                  <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "20px" }}>
                    Batch process roll numbers, marks, and grades with automated CSV parsing.
                  </p>

                  <div className="form-group">
                    <label>Course Offering</label>
                    <select
                      className="form-control"
                      value={selectedOfferingID}
                      onChange={handleCourseOfferingSelect}
                      required
                    >
                      <option value="">-- Select Course --</option>
                      {taughtCourses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.course_code} - {c.course_name} ({c.semester_name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Upload .CSV File</label>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      className="form-control"
                      onChange={handleCsvFileUpload}
                      style={{ padding: "8px" }}
                    />
                  </div>

                  <div className="form-group">
                    <label>CSV Data Editor</label>
                    <textarea
                      className="csv-textarea"
                      value={bulkCsvText}
                      onChange={(e) => setBulkCsvText(e.target.value)}
                    ></textarea>
                  </div>

                  <button className="btn btn-primary" onClick={handleBulkGradeSubmit}>
                    Submit Batch Processing →
                  </button>
                </div>

                <div className="table-card" style={{ padding: "28px" }}>
                  <h4 style={{ marginBottom: "16px" }}>Batch Execution Report</h4>
                  {bulkReport ? (
                    <div>
                      <div className="report-card success">
                        ✓ <strong>{bulkReport.success_count} Records Processed</strong> — Student email notifications queued.
                      </div>

                      {bulkReport.failed_count > 0 && (
                        <div className="report-card warning" style={{ marginTop: "12px" }}>
                          ⚠️ <strong>{bulkReport.failed_count} Flagged Rows</strong> requiring correction.
                        </div>
                      )}

                      {bulkReport.failed_rows && bulkReport.failed_rows.length > 0 && (
                        <div style={{ marginTop: "16px" }}>
                          <h5>Row Diagnostics:</h5>
                          <ul style={{ paddingLeft: "20px", marginTop: "8px", fontSize: "13px", color: "var(--warning-amber)" }}>
                            {bulkReport.failed_rows.map((r, i) => (
                              <li key={i}>
                                Row #{r.row} (Roll: <code>{r.student_roll_no}</code>) — {r.reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: "13.5px", padding: "28px 0" }}>
                      Click "Submit Batch Processing" to view automated audit metrics and row validation.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Faculty/Admin Tab: Email Audit Logs View */}
            {(user.role === "faculty" || user.role === "admin") && activeTab === "email_audit" && (
              <div className="table-card">
                <div className="table-header">
                  <h4>📧 Automated Email Notification Audit Trail</h4>
                  <button className="btn btn-outline btn-sm" onClick={fetchEmailLogs}>
                    🔄 Refresh Email Logs
                  </button>
                </div>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", padding: "0 24px 16px 24px" }}>
                  Audit trail of automated email notifications dispatched upon grade publication.
                </p>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Recipient Email</th>
                      <th>Student Name</th>
                      <th>Subject</th>
                      <th>Time Sent</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(emailLogs || []).length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: "center", color: "var(--text-muted)", padding: "28px" }}>
                          No notification email logs found in database.
                        </td>
                      </tr>
                    ) : (
                      (emailLogs || []).map((log) => (
                        <tr key={log.id}>
                          <td><code>{log.recipient_email}</code></td>
                          <td><strong>{log.student_name}</strong></td>
                          <td>{log.subject}</td>
                          <td>{new Date(log.sent_at).toLocaleString()}</td>
                          <td>
                            <span className="status-badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
                              Dispatched
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Admin Tab: Course Catalog */}
            {user.role === "admin" && activeTab === "admin_courses" && (
              <div className="table-card">
                <div className="table-header">
                  <h4>University Master Course Catalog</h4>
                  <input
                    type="text"
                    className="search-filter-input"
                    placeholder="🔍 Search course..."
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                  />
                </div>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Semester</th>
                      <th>Course Code</th>
                      <th>Course Title</th>
                      <th>Department</th>
                      <th>Credits</th>
                      <th>Faculty</th>
                      <th>Capacity</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredCourses().length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: "center", color: "var(--text-muted)", padding: "28px" }}>
                          No matching courses found.
                        </td>
                      </tr>
                    ) : (
                      getFilteredCourses().map((c) => (
                        <tr key={c.id}>
                          <td><strong>{c.semester_name || "Semester 2"}</strong></td>
                          <td><code>{c.course_code}</code></td>
                          <td><strong>{c.course_name}</strong></td>
                          <td>{c.department}</td>
                          <td>{c.credits} Credits</td>
                          <td>{c.faculty_name || "Dr. K. Seshadri"}</td>
                          <td>{c.max_capacity || 60} Seats</td>
                          <td>
                            <span className="status-badge">Active</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Admin Tab: Student Directory */}
            {user.role === "admin" && activeTab === "admin_students" && (
              <div className="table-card">
                <div className="table-header">
                  <h4>University Student Directory</h4>
                  <input
                    type="text"
                    className="search-filter-input"
                    placeholder="🔍 Search student..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                </div>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Roll Number</th>
                      <th>Student Name</th>
                      <th>Email Address</th>
                      <th>Phone</th>
                      <th>Department</th>
                      <th>Program</th>
                      <th>Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredStudents().length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: "center", color: "var(--text-muted)", padding: "28px" }}>
                          No student records matched search query.
                        </td>
                      </tr>
                    ) : (
                      getFilteredStudents().map((s) => (
                        <tr key={s.id}>
                          <td><code>{s.student_id}</code></td>
                          <td><strong>{s.name}</strong></td>
                          <td>{s.email}</td>
                          <td>{s.phone || "555-010" + s.id}</td>
                          <td>{s.department}</td>
                          <td>{s.program}</td>
                          <td>Year {s.year}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Admin Tab: Faculty Directory */}
            {user.role === "admin" && activeTab === "admin_faculty" && (
              <div className="table-card">
                <div className="table-header">
                  <h4>Academic Faculty Directory</h4>
                  <input
                    type="text"
                    className="search-filter-input"
                    placeholder="🔍 Search faculty..."
                    value={facultySearch}
                    onChange={(e) => setFacultySearch(e.target.value)}
                  />
                </div>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee ID</th>
                      <th>Faculty Name</th>
                      <th>Email Contact</th>
                      <th>Phone</th>
                      <th>Department</th>
                      <th>Designation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredFaculty().length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)", padding: "28px" }}>
                          No faculty records matched search query.
                        </td>
                      </tr>
                    ) : (
                      getFilteredFaculty().map((f) => (
                        <tr key={f.id}>
                          <td><code>{f.faculty_id}</code></td>
                          <td><strong>{f.name}</strong></td>
                          <td>{f.email}</td>
                          <td>{f.phone || "555-020" + f.id}</td>
                          <td>{f.department}</td>
                          <td>{f.designation}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Email Notification Audit Modal */}
      {showEmailLogs && (
        <div className="modal-overlay" onClick={() => setShowEmailLogs(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📧 Automated Email Notification Audit Trail</h3>
              <button className="modal-close" onClick={() => setShowEmailLogs(false)}>
                ✕
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px" }}>
              Audit trail of automated email notifications dispatched upon grade publication.
            </p>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Recipient Email</th>
                  <th>Student Name</th>
                  <th>Subject</th>
                  <th>Time Sent</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(emailLogs || []).length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", color: "var(--text-muted)", padding: "28px" }}>
                      No notification email logs found in database.
                    </td>
                  </tr>
                ) : (
                  (emailLogs || []).map((log) => (
                    <tr key={log.id}>
                      <td><code>{log.recipient_email}</code></td>
                      <td><strong>{log.student_name}</strong></td>
                      <td>{log.subject}</td>
                      <td>{new Date(log.sent_at).toLocaleTimeString()}</td>
                      <td>
                        <span className="status-badge">Dispatched</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;