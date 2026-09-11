// ==========================================
// Web App Backend Config
// ==========================================
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzz8OVNHavBboyPIXbybl4E8LPR979pA85W-3zdVn0mhtQInA0InZNvYDFyekt8wZOP/exec";

let currentUser = null;
let chartInstance = null;

// --- PASSWORD TOGGLE FUNCTION ---
window.togglePassword = function(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.type = input.type === "password" ? "text" : "password";
    }
};

// --- NAVIGATION & AUTH HELPERS ---
window.showPage1 = function() {
    document.getElementById("page2").style.display = "none";
    document.getElementById("page1").style.display = "block";
    clearAuthInputs();
};

window.showPage2 = function() {
    document.getElementById("page1").style.display = "none";
    document.getElementById("page2").style.display = "block";
    clearAuthInputs();
};

window.clearAuthInputs = function() {
    if (document.getElementById("loginGmail")) document.getElementById("loginGmail").value = "";
    if (document.getElementById("loginPassword")) document.getElementById("loginPassword").value = "";
    if (document.getElementById("signupName")) document.getElementById("signupName").value = "";
    if (document.getElementById("signupGmail")) document.getElementById("signupGmail").value = "";
    if (document.getElementById("signupPassword")) document.getElementById("signupPassword").value = "";
    
    const authStatus = document.getElementById("authStatus");
    const signupStatus = document.getElementById("signupStatus");
    if (authStatus) authStatus.innerText = "";
    if (signupStatus) signupStatus.innerText = "";
};

window.logout = function() {
    currentUser = null;
    document.getElementById("attendanceContainer").style.display = "none";
    document.getElementById("studentContainer").style.display = "none";
    document.getElementById("mainContainer").classList.remove("wide");
    document.getElementById("authContainer").style.display = "block";
    showPage1();
};

// --- DOM INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    const loginBtn = document.getElementById("loginBtn");
    if (loginBtn) loginBtn.addEventListener("click", handleLogin);

    const signupBtn = document.getElementById("signupBtn");
    if (signupBtn) signupBtn.addEventListener("click", handleRegistration);

    const submitAttendanceBtn = document.getElementById("submitAttendanceBtn");
    if (submitAttendanceBtn) submitAttendanceBtn.addEventListener("click", handleSubmitAttendance);

    const chartTypeSelect = document.getElementById("chartType");
    if (chartTypeSelect) {
        chartTypeSelect.addEventListener("change", (e) => {
            renderStudentChart(e.target.value);
        });
    }
});

// --- ROUTING ENGINE WITH HARDENED ROLE MATCHING ---
function routeUser(user) {
    currentUser = user;
    document.getElementById("authContainer").style.display = "none";

    // Normalize role string for flexible comparison
    const rawRole = String(user.role || "").trim().toLowerCase();
    console.log("User object passed to router:", user);

    // Matches 'leader', 'teacher', 'admin', 'staff', or 'leader / teacher'
    if (rawRole.includes("leader") || rawRole.includes("teacher") || rawRole.includes("admin")) {
        document.getElementById("displayEmail").innerText = user.email || user.name;
        document.getElementById("displayRole").innerText = user.role || "Teacher";
        document.getElementById("displayBatch").innerText = user.batch || "Team Kenes";
        
        document.getElementById("attendanceContainer").style.display = "block";
        loadTeamRoster(user.batch || "Team Kenes");
    } else {
        const mainContainer = document.getElementById("mainContainer");
        if (mainContainer) mainContainer.classList.add("wide");
        
        document.getElementById("studentWelcomeText").innerText = `Welcome, ${user.name || user.email}!`;
        document.getElementById("studentContainer").style.display = "block";
        renderStudentChart("line");
    }
}

// --- BACKEND DISPATCHER ---
async function sendToGoogle(payload) {
    try {
        const targetUrl = `${WEB_APP_URL}?payload=${encodeURIComponent(JSON.stringify(payload))}`;
        const response = await fetch(targetUrl, {
            method: "GET",
            redirect: "follow"
        });
        const rawText = await response.text();
        return JSON.parse(rawText);
    } catch (error) {
        console.error("sendToGoogle error:", error);
        return { success: false, message: "Network error or backend deployment issue." };
    }
}

// --- EVENT HANDLERS ---
async function handleLogin(e) {
    if (e) e.preventDefault();

    const email = document.getElementById("loginGmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    const statusDiv = document.getElementById("authStatus");

    if (!email || !password) {
        if (statusDiv) statusDiv.innerText = "Please enter both Email and Password.";
        return;
    }

    if (statusDiv) statusDiv.innerText = "Verifying credentials...";

    const response = await sendToGoogle({
        action: "login",
        email: email,
        password: password
    });

    if (response.success) {
        if (statusDiv) statusDiv.innerText = "";
        routeUser(response.user);
    } else {
        if (statusDiv) statusDiv.innerText = response.message || "Invalid credentials.";
    }
}

async function handleRegistration(e) {
    if (e) e.preventDefault();

    const statusDiv = document.getElementById("signupStatus");
    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupGmail").value.trim();
    const password = document.getElementById("signupPassword").value;

    if (!name || !email || !password) {
        if (statusDiv) statusDiv.innerText = "Please fill in all required fields.";
        return;
    }

    const payload = {
        action: "register",
        name: name,
        email: email,
        password: password,
        school: document.getElementById("signupSchool").value,
        role: document.getElementById("signupRole").value,
        batch: document.getElementById("signupBatch").value
    };

    if (statusDiv) statusDiv.innerText = "Creating account...";

    const response = await sendToGoogle(payload);

    if (response.success) {
        if (statusDiv) statusDiv.innerText = "";
        routeUser(payload);
    } else {
        if (statusDiv) statusDiv.innerText = response.message || "Registration failed.";
    }
}

async function loadTeamRoster(batchName) {
    const studentListContainer = document.getElementById("studentList");
    if (!studentListContainer) return;

    studentListContainer.innerHTML = "<p style='color:white;'>Loading roster from database...</p>";

    const response = await sendToGoogle({
        action: "getStudents",
        batch: batchName
    });

    let roster = [
        { id: "S1", name: "Druthi K" },
        { id: "S2", name: "Charvi" },
        { id: "S3", name: "Aaron" },
        { id: "S4", name: "Unnathi" }
    ];

    if (response.success && response.students && response.students.length > 0) {
        roster = response.students;
    }

    let html = "";
    roster.forEach(student => {
        html += `
            <div class="attendance-row" data-id="${student.id}" data-name="${student.name}">
                <span>${student.name}</span>
                <select class="attendance-status">
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                </select>
            </div>
        `;
    });

    studentListContainer.innerHTML = html;
}

async function handleSubmitAttendance() {
    const statusDiv = document.getElementById("attendanceStatus");
    const rows = document.querySelectorAll(".attendance-row");
    const attendanceData = [];

    rows.forEach(row => {
        attendanceData.push({
            studentId: row.getAttribute("data-id"),
            studentName: row.getAttribute("data-name"),
            status: row.querySelector(".attendance-status").value
        });
    });

    if (statusDiv) statusDiv.innerText = "Submitting attendance record...";

    const response = await sendToGoogle({
        action: "submitAttendance",
        batch: currentUser ? currentUser.batch : "Team Kenes",
        date: new Date().toISOString().split("T")[0],
        records: attendanceData
    });

    if (response.success) {
        if (statusDiv) statusDiv.innerText = "Attendance submitted successfully!";
    } else {
        if (statusDiv) statusDiv.innerText = response.message || "Failed to submit attendance.";
    }
}

function renderStudentChart(type) {
    const ctx = document.getElementById("attendanceChart");
    if (!ctx) return;

    if (chartInstance) chartInstance.destroy();

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const attendanceDataPoints = [1, 1, 0, 1, 1, 1];

    Chart.defaults.color = "#ffffff";

    if (type === "line") {
        chartInstance = new Chart(ctx, {
            type: "line",
            data: {
                labels: days,
                datasets: [{
                    label: "Attendance Status",
                    data: attendanceDataPoints,
                    borderColor: "#38bdf8",
                    backgroundColor: "rgba(56, 189, 248, 0.3)",
                    borderWidth: 3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: { ticks: { color: '#ffffff' } },
                    y: {
                        min: 0, max: 1,
                        ticks: {
                            stepSize: 1, color: '#ffffff',
                            callback: val => val === 1 ? "Present" : "Absent"
                        }
                    }
                }
            }
        });
    } else {
        chartInstance = new Chart(ctx, {
            type: "pie",
            data: {
                labels: ["Present", "Absent"],
                datasets: [{
                    data: [5, 1],
                    backgroundColor: ["#22c55e", "#ef4444"]
                }]
            }
        });
    }
}
