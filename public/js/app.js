function showMessage() {
    alert("Student registration will open here.");
}
function toggleSidebar() {
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.querySelector(".sidebar-overlay");

    sidebar.classList.toggle("show");
    overlay.classList.toggle("show");
}
// =================================
// STUDENT MODAL
// =================================

function openStudentModal() {

    const modal = document.getElementById("studentModal");

    modal.classList.add("show");

}


function closeStudentModal() {

    const modal = document.getElementById("studentModal");

    modal.classList.remove("show");

}


// =================================
// ADD STUDENT
// =================================



// =================================
// VIEW STUDENT
// =================================

function viewStudent(name) {

    alert("Opening profile for " + name);

}


// =================================
// SEARCH STUDENTS
// =================================

function searchStudents() {

    const input =
        document
        .getElementById("studentSearch")
        .value
        .toLowerCase();

    const rows =
        document
        .querySelectorAll("#studentsTable tbody tr");


    rows.forEach(row => {

        const text =
            row.textContent.toLowerCase();

        row.style.display =
            text.includes(input)
            ? ""
            : "none";

    });

}


// =================================
// FILTER BY CLASS
// =================================

function filterStudents() {

    const selectedClass =
        document
        .getElementById("classFilter")
        .value;

    const rows =
        document
        .querySelectorAll("#studentsTable tbody tr");


    rows.forEach(row => {

        const studentClass =
            row.children[2].textContent.trim();


        if (
            selectedClass === "all" ||
            studentClass === selectedClass
        ) {

            row.style.display = "";

        } else {

            row.style.display = "none";

        }

    });

}

// =================================
// TEACHER MODAL
// =================================

function openTeacherModal() {

    const modal =
        document.getElementById("teacherModal");

    modal.classList.add("show");

}


function closeTeacherModal() {

    const modal =
        document.getElementById("teacherModal");

    modal.classList.remove("show");

}


// =================================
// ADD TEACHER
// =================================



// =================================
// VIEW TEACHER
// =================================

function viewTeacher(name) {

    alert("Opening profile for " + name);

}


// =================================
// SEARCH TEACHERS
// =================================

function searchTeachers() {

    const input =
        document
        .getElementById("teacherSearch")
        .value
        .toLowerCase();


    const rows =
        document
        .querySelectorAll("#teachersTable tbody tr");


    rows.forEach(row => {

        const text =
            row.textContent.toLowerCase();


        row.style.display =
            text.includes(input)
            ? ""
            : "none";

    });

}


// =================================
// FILTER TEACHERS
// =================================

function filterTeachers() {

    const selectedStatus =
        document
        .getElementById("teacherStatusFilter")
        .value;


    const rows =
        document
        .querySelectorAll("#teachersTable tbody tr");


    rows.forEach(row => {

        const status =
            row
            .children[5]
            .textContent
            .trim();


        if (
            selectedStatus === "all" ||
            status === selectedStatus
        ) {

            row.style.display = "";

        } else {

            row.style.display = "none";

        }

    });

}

// =================================
// CLASS MODAL
// =================================

function openClassModal() {
    document.getElementById("classModal").classList.add("show");
}

function closeClassModal() {
    document.getElementById("classModal").classList.remove("show");
}


// =================================
// ADD CLASS
// =================================


// =================================
// VIEW CLASS
// =================================

function viewClass(name) {
    alert("Opening details for " + name);
}


// =================================
// SEARCH CLASSES
// =================================

function searchClasses() {
    const input = document.getElementById("classSearch").value.toLowerCase();
    const cards = document.querySelectorAll("#classesGrid .class-card");

    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(input) ? "" : "none";
    });
}


// =================================
// FILTER CLASSES BY STATUS
// =================================

function filterClasses() {
    const selectedStatus = document.getElementById("classStatusFilter").value;
    const cards = document.querySelectorAll("#classesGrid .class-card");

    cards.forEach(card => {
        const status = card.dataset.status;

        if (selectedStatus === "all" || status === selectedStatus) {
            card.style.display = "";
        } else {
            card.style.display = "none";
        }
    });
}

// =================================
// COURSE MODAL
// =================================

function openCourseModal() {
    document.getElementById("courseModal").classList.add("show");
}

function closeCourseModal() {
    document.getElementById("courseModal").classList.remove("show");
}


// =================================
// ADD COURSE
// =================================


// =================================
// VIEW COURSE
// =================================

function viewCourse(name) {
    alert("Opening details for " + name);
}


// =================================
// SEARCH COURSES
// =================================

function searchCourses() {
    const input = document.getElementById("courseSearch").value.toLowerCase();
    const cards = document.querySelectorAll("#coursesGrid .class-card");

    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(input) ? "" : "none";
    });
}


// =================================
// FILTER COURSES BY STATUS
// =================================

function filterCourses() {
    const selectedStatus = document.getElementById("courseStatusFilter").value;
    const cards = document.querySelectorAll("#coursesGrid .class-card");

    cards.forEach(card => {
        const status = card.dataset.status;

        if (selectedStatus === "all" || status === selectedStatus) {
            card.style.display = "";
        } else {
            card.style.display = "none";
        }
    });
}

// =================================
// MARK ATTENDANCE
// =================================

function markAttendance(button, status) {

    const toggle = button.parentElement;

    toggle.querySelectorAll(".att-btn").forEach(btn => {
        btn.classList.remove("active");
    });

    button.classList.add("active");
    toggle.dataset.status = status;

    updateAttendanceStats();
}


// =================================
// UPDATE ATTENDANCE STATS
// =================================

function updateAttendanceStats() {

    const rows = document.querySelectorAll("#attendanceTable tbody tr");

    let present = 0;
    let absent = 0;
    let late = 0;
    let visibleTotal = 0;

    rows.forEach(row => {

        if (row.style.display === "none") return;

        visibleTotal++;

        const status = row.querySelector(".attendance-toggle").dataset.status;

        if (status === "Present") present++;
        else if (status === "Absent") absent++;
        else if (status === "Late") late++;

    });

    document.getElementById("statTotal").textContent = visibleTotal;
    document.getElementById("statPresent").textContent = present;
    document.getElementById("statAbsent").textContent = absent;
    document.getElementById("statLate").textContent = late;

}


// =================================
// FILTER ATTENDANCE BY CLASS
// =================================

function filterAttendanceClass() {

    const selectedClass = document.getElementById("attendanceClassFilter").value;
    const rows = document.querySelectorAll("#attendanceTable tbody tr");

    rows.forEach(row => {

        const rowClass = row.dataset.class;

        if (selectedClass === "all" || rowClass === selectedClass) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }

    });

    updateAttendanceStats();
}


// =================================
// SAVE ATTENDANCE
// =================================

function saveAttendance() {

    const date = document.getElementById("attendanceDate").value;
    const rows = document.querySelectorAll("#attendanceTable tbody tr");

    const records = [];

    rows.forEach(row => {
        records.push({
            full_name: row.querySelector(".student-name strong").textContent,
            admission_number: row.dataset.admission,
            class: row.dataset.class,
            status: row.querySelector(".attendance-toggle").dataset.status
        });
    });

    fetch(attendanceEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, records })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert("Attendance saved successfully!");
        } else {
            alert("Something went wrong saving attendance.");
        }
    })
    .catch(() => alert("Could not reach the server."));

}

// Initialize attendance stats on page load (only runs if the table exists)
if (document.getElementById("attendanceTable")) {
    updateAttendanceStats();
}

// =================================
// RESULT MODAL
// =================================

function openResultModal() {
    document.getElementById("resultModal").classList.add("show");
}

function closeResultModal() {
    document.getElementById("resultModal").classList.remove("show");
}


// =================================
// ADD RESULT
// =================================

function addResult(event) {
    event.preventDefault();
    alert("Result saved successfully!");
    closeResultModal();
}


// =================================
// VIEW RESULT
// =================================

function viewResult(name) {
    alert("Opening result details for " + name);
}


// =================================
// SEARCH RESULTS
// =================================

function searchResults() {
    const input = document.getElementById("resultSearch").value.toLowerCase();
    const rows = document.querySelectorAll("#resultsTable tbody tr");

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(input) ? "" : "none";
    });
}


// =================================
// FILTER RESULTS (COURSE + TERM)
// =================================

function filterResults() {

    const selectedCourse = document.getElementById("resultCourseFilter").value;
    const selectedTerm = document.getElementById("resultTermFilter").value;

    const rows = document.querySelectorAll("#resultsTable tbody tr");

    rows.forEach(row => {

        const course = row.children[1].textContent.trim();
        const term = row.children[5].textContent.trim();

        const courseMatch = selectedCourse === "all" || course === selectedCourse;
        const termMatch = selectedTerm === "all" || term === selectedTerm;

        row.style.display = (courseMatch && termMatch) ? "" : "none";

    });
}

// =================================
// ANNOUNCEMENT MODAL
// =================================

function openAnnouncementModal() {
    document.getElementById("announcementModal").classList.add("show");
}

function closeAnnouncementModal() {
    document.getElementById("announcementModal").classList.remove("show");
}


// =================================
// ADD ANNOUNCEMENT
// =================================



// =================================
// SEARCH ANNOUNCEMENTS
// =================================

function searchAnnouncements() {
    const input = document.getElementById("announcementSearch").value.toLowerCase();
    const items = document.querySelectorAll("#announcementsList .announcement");

    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(input) ? "" : "none";
    });
}


// =================================
// FILTER ANNOUNCEMENTS BY AUDIENCE
// =================================

function filterAnnouncements() {
    const selectedAudience = document.getElementById("audienceFilter").value;
    const items = document.querySelectorAll("#announcementsList .announcement");

    items.forEach(item => {
        const audience = item.dataset.audience;

        if (selectedAudience === "all" || audience === selectedAudience) {
            item.style.display = "";
        } else {
            item.style.display = "none";
        }
    });
}

function viewCourseDetails(name) {
    alert("Opening course details for " + name);
}

function openLesson(name) {
    alert("Opening lesson: " + name);
}

function searchLessons() {
    const input = document.getElementById("lessonSearch").value.toLowerCase();
    document.querySelectorAll("#lessonsGrid .class-card").forEach(card => {
        card.style.display = card.textContent.toLowerCase().includes(input) ? "" : "none";
    });
}

function filterLessons() {
    const selected = document.getElementById("lessonCourseFilter").value;
    document.querySelectorAll("#lessonsGrid .class-card").forEach(card => {
        const course = card.dataset.course;
        card.style.display = (selected === "all" || course === selected) ? "" : "none";
    });
}

function openEditClassModal(id, name, teacher, schedule, courses, capacity, status) {
    document.getElementById("editClassForm").action = "/classes/" + id + "/edit";
    document.getElementById("editClassName").value = name;
    document.getElementById("editClassTeacher").value = teacher;
    document.getElementById("editClassSchedule").value = schedule;
    document.getElementById("editClassCourses").value = courses;
    document.getElementById("editClassCapacity").value = capacity;
    document.getElementById("editClassStatus").value = status;
    document.getElementById("editClassModal").classList.add("show");
}

function closeEditClassModal() {
    document.getElementById("editClassModal").classList.remove("show");
}

function confirmDeleteClass(id, name) {
    if (confirm("Delete class \"" + name + "\"? This cannot be undone.")) {
        const form = document.getElementById("deleteClassForm");
        form.action = "/classes/" + id + "/delete";
        form.submit();
    }
}

function openEditCourseModal(id, name, teacher, lessons, progress, status) {
    document.getElementById("editCourseForm").action = "/courses/" + id + "/edit";
    document.getElementById("editCourseName").value = name;
    document.getElementById("editCourseTeacher").value = teacher;
    document.getElementById("editCourseLessons").value = lessons;
    document.getElementById("editCourseProgress").value = progress;
    document.getElementById("editCourseStatus").value = status;
    document.getElementById("editCourseModal").classList.add("show");
}

function closeEditCourseModal() {
    document.getElementById("editCourseModal").classList.remove("show");
}

function confirmDeleteCourse(id, name) {
    if (confirm("Delete course \"" + name + "\"? This cannot be undone.")) {
        const form = document.getElementById("deleteCourseForm");
        form.action = "/courses/" + id + "/delete";
        form.submit();
    }
}