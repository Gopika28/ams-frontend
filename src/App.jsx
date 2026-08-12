import { useEffect, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

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

  const [dbStatus, setDbStatus] = useState({ mode: "checking", message: "Connecting to server..." });
  const [toastMessage, setToastMessage] = useState("");

  const [activeTab, setActiveTab] = useState("default");

  const [studentProfile, setStudentProfile] = useState(null);
  const [studentHistory, setStudentHistory] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);

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
    "student_roll_no,marks,grade,remarks\nSTU101,95,A+,Excellent problem solving\nSTU102,88,A,Great lab work\nSTU999,75,B,Unregistered student test row"
  );
  const [bulkReport, setBulkReport] = useState(null);

  const [showEmailLogs, setShowEmailLogs] = useState(false);
  const [emailLogs, setEmailLogs] = useState([]);

  const [adminStats, setAdminStats] = useState(null);
  const [adminCourses, setAdminCourses] = useState([]);
  const [adminStudents, setAdminStudents] = useState([]);
  const [adminFaculty, setAdminFaculty] = useState([]);

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
        setDbStatus({ mode: "memory", message: "In-Memory Mode Active" });
      }
    } catch {
      setDbStatus({ mode: "memory", message: "Offline / Fallback Active" });
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
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem("ams_token");
    localStorage.removeItem("ams_user");
    setActiveTab("default");
    showToast("Signed out");
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
      alert("Select a course offering first.");
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

      showToast("Grade updated and notification email sent.");
      setSingleGradeForm({ student_roll_no: "", marks: "", grade: "A+", remarks: "" });
      fetchEnrolledStudents(selectedOfferingID);
    } catch (err) {
      alert(`Grade Error: ${err.message}`);
    }
  };

  const handleBulkGradeSubmit = async () => {
    if (!selectedOfferingID) {
      alert("Select a course offering first.");
      return;
    }

    const lines = bulkCsvText.trim().split("\n");
    if (lines.length < 2) {
      alert("Provide valid CSV format with header row and at least 1 student row.");
      return;
    }

    const grades = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",");
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
      showToast(`Processed bulk upload: ${data.success_count} saved, ${data.failed_count} flagged.`);
      fetchEnrolledStudents(selectedOfferingID);
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
        setEmailLogs(await res.json());
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
      const pts = gradePoints[item.grade] ?? 7;
      const crd = item.credits || 4;
      totalPoints += pts * crd;
      totalCredits += crd;
    });

    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
  };

  return (
    <div className="app-container">
      {toastMessage && <div className="toast">{toastMessage}</div>}

      {/* Header Bar */}
      <header className="navbar">
        <div className="brand">
          <div className="brand-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <div>
            <div className="brand-title">Academic Management System</div>
            <div className="brand-subtitle">University Student & Faculty Portal</div>
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
                {authError}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>{loginTab === "student" ? "Roll Number / Email" : loginTab === "faculty" ? "Employee ID / Email" : "Username"}</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={loginTab === "student" ? "e.g. STU101" : loginTab === "faculty" ? "e.g. FAC201" : "admin"}
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
                <span style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px", display: "block" }}>
                  Default password for accounts: <strong>password123</strong>
                </span>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={authLoading}>
                {authLoading ? "Authenticating..." : "Sign In to Portal →"}
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Authenticated View */
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
                    <>Roll No: <strong>{studentProfile.student_id}</strong> | {studentProfile.program} | Section {studentProfile.section}</>
                  ) : user.role === "faculty" && facultyProfile ? (
                    <>Emp ID: <strong>{facultyProfile.faculty_id}</strong> | {facultyProfile.designation} - {facultyProfile.department}</>
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
                  <span className="detail-label">📞 Phone:</span>
                  <span className="detail-val">{studentProfile.phone || "555-0101"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">🏛️ Dept:</span>
                  <span className="detail-val">{studentProfile.department}</span>
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
                  <span className="detail-label">📞 Phone:</span>
                  <span className="detail-val">{facultyProfile.phone || "555-0201"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">🏛️ Dept:</span>
                  <span className="detail-val">{facultyProfile.department}</span>
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
                  <span className="detail-label">🔑 Role:</span>
                  <span className="detail-val">Administrator</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">🏛️ System:</span>
                  <span className="detail-val">AMS University Portal</span>
                </div>
              </div>
            )}

            <div className="profile-stats">
              {user.role === "student" ? (
                <>
                  <div className="stat-item">
                    <div className="stat-value">{(studentHistory || []).length}</div>
                    <div className="stat-label">Registered Courses</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{computeGPA(studentHistory)}</div>
                    <div className="stat-label">Cumulative GPA</div>
                  </div>
                </>
              ) : user.role === "faculty" ? (
                <>
                  <div className="stat-item">
                    <div className="stat-value">{(taughtCourses || []).length}</div>
                    <div className="stat-label">Taught Courses</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{(enrolledStudents || []).length}</div>
                    <div className="stat-label">Enrolled Roster</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="stat-item">
                    <div className="stat-value">{(studentHistory || []).length}</div>
                    <div className="stat-label">Student History</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{(taughtCourses || []).length}</div>
                    <div className="stat-label">Faculty Courses</div>
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
                  className={`nav-tab-btn ${activeTab === "registration" ? "active" : ""}`}
                  onClick={() => setActiveTab("registration")}
                >
                  Course Registration
                </button>
                <button
                  className={`nav-tab-btn ${activeTab === "history" ? "active" : ""}`}
                  onClick={() => setActiveTab("history")}
                >
                  Academic History
                </button>
                <button
                  className={`nav-tab-btn ${activeTab === "grades" ? "active" : ""}`}
                  onClick={() => setActiveTab("grades")}
                >
                  Grade Transcript
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
                  Bulk CSV Grade Upload
                </button>
                <button
                  className="nav-tab-btn"
                  onClick={fetchEmailLogs}
                  style={{ marginLeft: "auto" }}
                >
                  Email Notification Logs
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
                  Email Notification Logs
                </button>
              </>
            )}
          </div>

          {/* Student Tab: Registration */}
          {user.role === "student" && activeTab === "registration" && (
            <div className="table-card">
              <div className="table-header">
                <h4>Active Semester Course Registration</h4>
                <button className="btn btn-outline btn-sm" onClick={fetchStudentData}>
                  Refresh
                </button>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Course Code</th>
                    <th>Course Title</th>
                    <th>Department</th>
                    <th>Credits</th>
                    <th>Instructor</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {availableCourses.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px" }}>
                        No open courses currently available in this registration period.
                      </td>
                    </tr>
                  ) : (
                    availableCourses.map((c) => {
                      const isRegistered = studentHistory.some((h) => h.course_offering_id === c.id);
                      return (
                        <tr key={c.id}>
                          <td><strong>{c.course_code}</strong></td>
                          <td>{c.course_name}</td>
                          <td>{c.department}</td>
                          <td>{c.credits} Credits</td>
                          <td>{c.faculty_name || "Unassigned"}</td>
                          <td>
                            {isRegistered ? (
                              <span className="status-badge">Registered</span>
                            ) : (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleRegisterCourse(c.id)}
                              >
                                Register
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

          {/* Student Tab: Academic History */}
          {user.role === "student" && activeTab === "history" && (
            <div className="table-card">
              <div className="table-header">
                <h4>Registered Course History (All Semesters)</h4>
                <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                  Full academic history across all semesters
                </div>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Semester</th>
                    <th>Code</th>
                    <th>Course Title</th>
                    <th>Credits</th>
                    <th>Instructor</th>
                    <th>Status</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {studentHistory.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px" }}>
                        No course registration records found.
                      </td>
                    </tr>
                  ) : (
                    studentHistory.map((item) => (
                      <tr key={item.id}>
                        <td><strong>{item.semester_name || "Semester"}</strong></td>
                        <td>{item.course_code}</td>
                        <td>{item.course_name}</td>
                        <td>{item.credits}</td>
                        <td>{item.faculty_name}</td>
                        <td>
                          <span style={{ textTransform: "capitalize", fontWeight: 500 }}>{item.status}</span>
                        </td>
                        <td>
                          {item.grade ? (
                            <span className={`grade-badge grade-${item.grade.replace("+", "-plus")}`}>
                              {item.grade} ({item.marks})
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-dim)", fontSize: "12px" }}>Pending</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Student Tab: Grade Transcript */}
          {user.role === "student" && activeTab === "grades" && (
            <div className="table-card">
              <div className="table-header">
                <h4>Academic Transcript</h4>
                <div className="status-badge" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8" }}>
                  GPA: <strong>{computeGPA(studentHistory)}</strong>
                </div>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Semester</th>
                    <th>Course Code & Title</th>
                    <th>Credits</th>
                    <th>Marks</th>
                    <th>Grade</th>
                    <th>Sync</th>
                  </tr>
                </thead>
                <tbody>
                  {studentHistory.filter((item) => item.grade).length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px" }}>
                        No published grades available yet.
                      </td>
                    </tr>
                  ) : (
                    studentHistory
                      .filter((item) => item.grade)
                      .map((item) => (
                        <tr key={item.id}>
                          <td><strong>{item.semester_name}</strong></td>
                          <td>{item.course_code} - {item.course_name}</td>
                          <td>{item.credits}</td>
                          <td><strong>{item.marks}</strong></td>
                          <td>
                            <span className={`grade-badge grade-${item.grade.replace("+", "-plus")}`}>
                              {item.grade}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: "12px", color: "var(--accent)" }}>Synced with Email</span>
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
            <div className="content-stack">
              <div className="table-card">
                <div className="table-header">
                  <h4>Courses Taught</h4>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Semester</th>
                      <th>Code</th>
                      <th>Course Name</th>
                      <th>Department</th>
                      <th>Credits</th>
                      <th>Status</th>
                      <th>Select</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taughtCourses.map((c) => (
                      <tr key={c.id}>
                        <td><strong>{c.semester_name}</strong></td>
                        <td>{c.course_code}</td>
                        <td>{c.course_name}</td>
                        <td>{c.department}</td>
                        <td>{c.credits}</td>
                        <td>
                          {c.is_active ? (
                            <span className="status-badge">Active</span>
                          ) : (
                            <span style={{ color: "var(--text-dim)", fontSize: "12px" }}>Previous</span>
                          )}
                        </td>
                        <td>
                          <button
                            className={`btn btn-sm ${selectedOfferingID === c.id.toString() ? "btn-primary" : "btn-outline"}`}
                            onClick={() => {
                              setSelectedOfferingID(c.id.toString());
                              fetchEnrolledStudents(c.id);
                            }}
                          >
                            {selectedOfferingID === c.id.toString() ? "Selected" : "Select"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Roster Table */}
              <div className="table-card">
                <div className="table-header">
                  <h4>Enrolled Student Roster</h4>
                  <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                    Total: {(enrolledStudents || []).length} Students
                  </div>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Roll Number</th>
                      <th>Name</th>
                      <th>Email Contact</th>
                      <th>Phone Contact</th>
                      <th>Current Grade</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(enrolledStudents || []).length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px" }}>
                          Select a course offering above to inspect student roster.
                        </td>
                      </tr>
                    ) : (
                      enrolledStudents.map((st) => (
                        <tr key={st.student_id}>
                          <td><strong>{st.student_roll_no}</strong></td>
                          <td>{st.name}</td>
                          <td>{st.email}</td>
                          <td>{st.phone || ("555-010" + st.student_id)}</td>
                          <td>
                            {st.grade ? (
                              <span className={`grade-badge grade-${st.grade.replace("+", "-plus")}`}>
                                {st.grade} ({st.marks})
                              </span>
                            ) : (
                              <span style={{ color: "var(--text-dim)", fontSize: "12px" }}>Unassigned</span>
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
                              Grade
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
            <div className="table-card" style={{ padding: "24px" }}>
              <h4 style={{ marginBottom: "16px" }}>Individual Grade Submission</h4>

              <form onSubmit={handleSingleGradeSubmit}>
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
                  <label>Student Roll Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. STU101"
                    value={singleGradeForm.student_roll_no}
                    onChange={(e) => setSingleGradeForm({ ...singleGradeForm, student_roll_no: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label>Marks (100 Scale)</label>
                    <input
                      type="number"
                      step="0.5"
                      className="form-control"
                      placeholder="e.g. 92.5"
                      value={singleGradeForm.marks}
                      onChange={(e) => setSingleGradeForm({ ...singleGradeForm, marks: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label>Letter Grade</label>
                    <select
                      className="form-control"
                      value={singleGradeForm.grade}
                      onChange={(e) => setSingleGradeForm({ ...singleGradeForm, grade: e.target.value })}
                    >
                      <option value="A+">A+</option>
                      <option value="A">A</option>
                      <option value="B+">B+</option>
                      <option value="B">B</option>
                      <option value="C+">C+</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                      <option value="F">F</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Remarks</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Excellent performance"
                    value={singleGradeForm.remarks}
                    onChange={(e) => setSingleGradeForm({ ...singleGradeForm, remarks: e.target.value })}
                  />
                </div>

                <button type="submit" className="btn btn-primary">
                  Publish Grade
                </button>
              </form>
            </div>
          )}

          {/* Faculty Tab: Bulk CSV Grade Upload */}
          {user.role === "faculty" && activeTab === "bulk_grade" && (
            <div className="bulk-container">
              <div className="table-card" style={{ padding: "24px" }}>
                <h4>Bulk CSV Grade Upload</h4>
                <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "16px" }}>
                  Upload a CSV file or edit raw CSV data below.
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
                  <label>CSV Editor (Header: student_roll_no, marks, grade, remarks)</label>
                  <textarea
                    className="csv-textarea"
                    value={bulkCsvText}
                    onChange={(e) => setBulkCsvText(e.target.value)}
                  ></textarea>
                </div>

                <button className="btn btn-primary" onClick={handleBulkGradeSubmit}>
                  Submit Batch
                </button>
              </div>

              {/* Bulk Report Summary */}
              <div className="table-card" style={{ padding: "24px" }}>
                <h4>Batch Processing Report</h4>
                {bulkReport ? (
                  <div>
                    <div className="report-card success">
                      <strong>{bulkReport.success_count} Records Updated</strong> (Email notifications sent to students)
                    </div>

                    {bulkReport.failed_count > 0 && (
                      <div className="report-card warning" style={{ marginTop: "12px" }}>
                        <strong>{bulkReport.failed_count} Flagged Rows</strong> requiring review.
                      </div>
                    )}

                    {bulkReport.failed_rows && bulkReport.failed_rows.length > 0 && (
                      <div style={{ marginTop: "16px" }}>
                        <h5>Row Validation Details:</h5>
                        <ul style={{ paddingLeft: "20px", marginTop: "8px", fontSize: "13px", color: "var(--warning)" }}>
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
                  <p style={{ color: "var(--text-muted)", fontSize: "13px", padding: "24px 0" }}>
                    Submit a CSV batch to view execution summary and row validation details.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Admin Tab: Master Course Catalog */}
          {user.role === "admin" && activeTab === "admin_courses" && (
            <div className="table-card">
              <div className="table-header">
                <h4>Master Course Catalog & Active Offerings</h4>
                <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                  Total Active Courses: {(adminCourses || []).length}
                </div>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Semester</th>
                    <th>Course Code</th>
                    <th>Course Title</th>
                    <th>Department</th>
                    <th>Credits</th>
                    <th>Assigned Faculty</th>
                    <th>Max Capacity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(adminCourses || []).length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px" }}>
                        No course records found in system.
                      </td>
                    </tr>
                  ) : (
                    adminCourses.map((c) => (
                      <tr key={c.id}>
                        <td><strong>{c.semester_name || "Semester 2"}</strong></td>
                        <td>{c.course_code}</td>
                        <td>{c.course_name}</td>
                        <td>{c.department}</td>
                        <td>{c.credits} Credits</td>
                        <td>{c.faculty_name || "Unassigned"}</td>
                        <td>{c.max_capacity || 60} Seats</td>
                        <td>
                          {c.is_active ? (
                            <span className="status-badge">Active</span>
                          ) : (
                            <span style={{ color: "var(--text-dim)", fontSize: "12px" }}>Previous</span>
                          )}
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
                <h4>University Enrolled Student Directory</h4>
                <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                  Total Enrolled Students: {(adminStudents || []).length}
                </div>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Student Name</th>
                    <th>Email Address</th>
                    <th>Phone</th>
                    <th>Department</th>
                    <th>Degree Program</th>
                    <th>Year</th>
                    <th>Section</th>
                  </tr>
                </thead>
                <tbody>
                  {(adminStudents || []).length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px" }}>
                        No student records found.
                      </td>
                    </tr>
                  ) : (
                    adminStudents.map((s) => (
                      <tr key={s.id}>
                        <td><strong>{s.student_id}</strong></td>
                        <td>{s.name}</td>
                        <td>{s.email}</td>
                        <td>{s.phone || ("555-010" + s.id)}</td>
                        <td>{s.department}</td>
                        <td>{s.program}</td>
                        <td>Year {s.year}</td>
                        <td>Section {s.section}</td>
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
                <h4>University Academic Faculty Directory</h4>
                <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                  Total Faculty Members: {(adminFaculty || []).length}
                </div>
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
                  {(adminFaculty || []).length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px" }}>
                        No faculty records found.
                      </td>
                    </tr>
                  ) : (
                    adminFaculty.map((f) => (
                      <tr key={f.id}>
                        <td><strong>{f.faculty_id}</strong></td>
                        <td>{f.name}</td>
                        <td>{f.email}</td>
                        <td>{f.phone || ("555-020" + f.id)}</td>
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
              <h3>Email Notification Audit Trail</h3>
              <button className="modal-close" onClick={() => setShowEmailLogs(false)}>
                ✕
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px" }}>
              Audit log of grade publication notification emails sent to students.
            </p>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Student Name</th>
                  <th>Subject</th>
                  <th>Sent At</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {emailLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px" }}>
                      No emails logged yet.
                    </td>
                  </tr>
                ) : (
                  emailLogs.map((log) => (
                    <tr key={log.id}>
                      <td><strong>{log.recipient_email}</strong></td>
                      <td>{log.student_name}</td>
                      <td>{log.subject}</td>
                      <td>{new Date(log.sent_at).toLocaleTimeString()}</td>
                      <td>
                        <span className="status-badge">Sent</span>
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