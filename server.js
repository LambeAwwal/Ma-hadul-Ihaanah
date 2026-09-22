const express = require("express");
const bcrypt = require("bcrypt");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);

const app = express();
app.set("trust proxy", 1);

const PORT = process.env.PORT || 3000;

const pool = require("./db");

app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: "session",
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

function requireLogin(role) {
    return (req, res, next) => {
        if (!req.session.user) {
            return res.redirect("/login");
        }
        if (role && req.session.user.role !== role) {
            return res.status(403).send("Access denied.");
        }
        next();
    };
}

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");

app.get("/", requireLogin("admin"), async (req, res) => {
    try {
        const studentsCount = await pool.query("SELECT COUNT(*) FROM students");
        const teachersCount = await pool.query("SELECT COUNT(*) FROM teachers");
        const classesCount = await pool.query("SELECT COUNT(*) FROM classes");
        const coursesCount = await pool.query("SELECT COUNT(*) FROM courses");

        const recentStudentsResult = await pool.query(
            "SELECT * FROM students ORDER BY id DESC LIMIT 3"
        );

        const attendanceStats = await pool.query(`
            SELECT status, COUNT(*) FROM attendance
            WHERE attendance_date = (SELECT MAX(attendance_date) FROM attendance)
            GROUP BY status
        `);

        let present = 0, absent = 0, late = 0;
        attendanceStats.rows.forEach(row => {
            if (row.status === "Present") present = parseInt(row.count);
            if (row.status === "Absent") absent = parseInt(row.count);
            if (row.status === "Late") late = parseInt(row.count);
        });
        const totalMarked = present + absent + late;
        const attendancePercent = totalMarked ? Math.round((present / totalMarked) * 100) : 0;

        const recentAnnouncements = await pool.query(
            "SELECT * FROM announcements ORDER BY created_at DESC LIMIT 3"
        );
        const announcements = recentAnnouncements.rows.map(a => ({ ...a, posted_ago: timeAgo(a.created_at) }));

        res.render("dashboard", {
            totalStudents: studentsCount.rows[0].count,
            totalTeachers: teachersCount.rows[0].count,
            totalClasses: classesCount.rows[0].count,
            totalCourses: coursesCount.rows[0].count,
            recentStudents: recentStudentsResult.rows,
            present, absent, late, attendancePercent,
            announcements
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading dashboard");
    }
});

app.get("/students/:id", requireLogin("admin"), async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM students WHERE id = $1", [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).send("Student not found");
        }

        const student = result.rows[0];

        const resultsResult = await pool.query(
            "SELECT * FROM results WHERE student_name = $1 ORDER BY id DESC", [student.full_name]
        );

        const attendanceResult = await pool.query(
            "SELECT status FROM attendance WHERE student_name = $1", [student.full_name]
        );
        const total = attendanceResult.rows.length;
        const present = attendanceResult.rows.filter(r => r.status === "Present").length;
        const attendancePercent = total ? Math.round((present / total) * 100) : 0;

        const classesResult = await pool.query("SELECT class_name FROM classes ORDER BY class_name");

        res.render("student-profile", {
            student,
            results: resultsResult.rows,
            attendancePercent,
            classes: classesResult.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading student profile");
    }
});

app.post("/students/:id/edit", requireLogin("admin"), async (req, res) => {
    try {
        const { full_name, email, gender, class: studentClass, date_of_birth, parent_guardian_name, parent_phone, address, status } = req.body;

        await pool.query(
            `UPDATE students
             SET full_name = $1, email = $2, gender = $3, class = $4, date_of_birth = $5,
                 parent_guardian_name = $6, parent_phone = $7, address = $8, status = $9
             WHERE id = $10`,
            [full_name, email, gender, studentClass, date_of_birth || null, parent_guardian_name, parent_phone, address, status, req.params.id]
        );

        res.redirect("/students");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error updating student");
    }
});

app.get("/students", requireLogin("admin"), async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM students ORDER BY id");
        const students = result.rows;

        const totalStudents = students.length;
        const activeStudents = students.filter(s => s.status === "Active").length;
        const inactiveStudents = students.filter(s => s.status === "Inactive").length;

        const classesCount = await pool.query("SELECT COUNT(*) FROM classes");

        res.render("students", {
            students,
            totalStudents,
            activeStudents,
            inactiveStudents,
            totalClasses: classesCount.rows[0].count
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading students");
    }
});

app.post("/students", requireLogin("admin"), async (req, res) => {
    try {
        const {
            full_name,
            email,
            gender,
            class: studentClass,
            date_of_birth,
            parent_guardian_name,
            parent_phone,
            address,
            password
        } = req.body;

        const year = new Date().getFullYear();

        const lastAdmission = await pool.query(
            `SELECT admission_number FROM students
             WHERE admission_number LIKE $1
             ORDER BY id DESC LIMIT 1`,
            [`AS/${year}/%`]
        );

        let nextNumber = 1;
        if (lastAdmission.rows.length > 0) {
            const lastNum = parseInt(lastAdmission.rows[0].admission_number.split("/")[2]);
            nextNumber = lastNum + 1;
        }

        const admission_number = `AS/${year}/${String(nextNumber).padStart(3, "0")}`;

        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            `INSERT INTO students
                (full_name, admission_number, email, gender, class, date_of_birth, parent_guardian_name, parent_phone, address, password)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [full_name, admission_number, email, gender, studentClass, date_of_birth || null, parent_guardian_name, parent_phone, address, hashedPassword]
        );

        res.redirect("/students");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error saving student");
    }
});

app.get("/teachers/:id", requireLogin("admin"), async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM teachers WHERE id = $1", [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).send("Teacher not found");
        }

        const teacher = result.rows[0];

        const classesResult = await pool.query(
            "SELECT * FROM classes WHERE teacher_name = $1", [teacher.full_name]
        );

        const classNames = classesResult.rows.map(c => c.class_name);
        const studentsResult = await pool.query(
            "SELECT COUNT(*) FROM students WHERE class = ANY($1)", [classNames]
        );

        res.render("teacher-profile", {
            teacher,
            classes: classesResult.rows,
            totalStudents: studentsResult.rows[0].count
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading teacher profile");
    }
});

app.get("/teachers", requireLogin("admin"), async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM teachers ORDER BY id");
        const teachers = result.rows;

        const totalTeachers = teachers.length;
        const activeTeachers = teachers.filter(t => t.status === "Active").length;

        const uniqueSubjects = new Set(
            teachers.flatMap(t => t.subject ? t.subject.split(",").map(s => s.trim()) : [])
        );

        const classesCount = await pool.query("SELECT COUNT(*) FROM classes");
        const classesResult = await pool.query("SELECT class_name FROM classes ORDER BY class_name");

        res.render("teachers", {
            teachers,
            totalTeachers,
            activeTeachers,
            coursesTaught: uniqueSubjects.size,
            totalClasses: classesCount.rows[0].count,
            classes: classesResult.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading teachers");
    }
});

app.post("/teachers", requireLogin("admin"), async (req, res) => {
    try {
        const { full_name, email, phone, subject, classes, password } = req.body;

        const year = new Date().getFullYear();

        const lastId = await pool.query(
            `SELECT teacher_id FROM teachers
             WHERE teacher_id LIKE $1
             ORDER BY id DESC LIMIT 1`,
            [`TCH/${year}/%`]
        );

        let nextNumber = 1;
        if (lastId.rows.length > 0) {
            const lastNum = parseInt(lastId.rows[0].teacher_id.split("/")[2]);
            nextNumber = lastNum + 1;
        }

        const teacher_id = `TCH/${year}/${String(nextNumber).padStart(3, "0")}`;

        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            `INSERT INTO teachers (full_name, teacher_id, email, phone, subject, classes, password)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [full_name, teacher_id, email, phone, subject, classes, hashedPassword]
        );

        res.redirect("/teachers");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error saving teacher");
    }
});

app.get("/classes/:id", requireLogin("admin"), async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM classes WHERE id = $1", [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).send("Class not found");
        }

        const cls = result.rows[0];

        const studentsResult = await pool.query(
            "SELECT * FROM students WHERE class = $1 ORDER BY id", [cls.class_name]
        );

        res.render("class-profile", {
            cls,
            students: studentsResult.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading class");
    }
});



app.post("/classes", requireLogin("admin"), async (req, res) => {
    try {
        const { class_name, teacher_name, schedule, courses, capacity, status } = req.body;

        await pool.query(
            `INSERT INTO classes (class_name, teacher_name, schedule, courses, capacity, status)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [class_name, teacher_name, schedule, courses, capacity || null, status]
        );

        res.redirect("/classes");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error saving class");
    }
});

app.get("/classes", requireLogin("admin"), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.*,
                (SELECT COUNT(*) FROM students s WHERE s.class = c.class_name) AS student_count
            FROM classes c
            ORDER BY c.id
        `);
        const classes = result.rows;

        const totalClasses = classes.length;
        const activeClasses = classes.filter(c => c.status === "Active").length;
        const studentsEnrolled = classes.reduce((sum, c) => sum + parseInt(c.student_count), 0);
        const teachersAssigned = new Set(classes.map(c => c.teacher_name)).size;

        const teachersResult = await pool.query("SELECT full_name FROM teachers ORDER BY full_name");

        res.render("classes", {
            classes, totalClasses, activeClasses, studentsEnrolled, teachersAssigned,
            teachers: teachersResult.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading classes");
    }
});

app.post("/classes/:id/edit", requireLogin("admin"), async (req, res) => {
    try {
        const { class_name, teacher_name, schedule, courses, capacity, status } = req.body;

        await pool.query(
            `UPDATE classes
             SET class_name = $1, teacher_name = $2, schedule = $3, courses = $4, capacity = $5, status = $6
             WHERE id = $7`,
            [class_name, teacher_name, schedule, courses, capacity || null, status, req.params.id]
        );

        res.redirect("/classes");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error updating class");
    }
});

app.post("/classes/:id/delete", requireLogin("admin"), async (req, res) => {
    try {
        await pool.query("DELETE FROM classes WHERE id = $1", [req.params.id]);
        res.redirect("/classes");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error deleting class");
    }
});

app.get("/courses/:id", requireLogin("admin"), async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM courses WHERE id = $1", [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).send("Course not found");
        }

        const course = result.rows[0];

        const classesResult = await pool.query(
            "SELECT * FROM classes WHERE courses ILIKE '%' || $1 || '%'", [course.course_name]
        );

        const classNames = classesResult.rows.map(c => c.class_name);
        const studentsResult = await pool.query(
            "SELECT * FROM students WHERE class = ANY($1) ORDER BY id", [classNames]
        );

        res.render("course-profile", {
            course,
            classes: classesResult.rows,
            students: studentsResult.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading course");
    }
});

app.post("/courses/:id/edit", requireLogin("admin"), async (req, res) => {
    try {
        const { course_name, teacher_name, lessons_count, progress, status } = req.body;

        await pool.query(
            `UPDATE courses
             SET course_name = $1, teacher_name = $2, lessons_count = $3, progress = $4, status = $5
             WHERE id = $6`,
            [course_name, teacher_name, lessons_count || 0, progress || 0, status, req.params.id]
        );

        res.redirect("/courses");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error updating course");
    }
});

app.post("/courses/:id/delete", requireLogin("admin"), async (req, res) => {
    try {
        await pool.query("DELETE FROM courses WHERE id = $1", [req.params.id]);
        res.redirect("/courses");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error deleting course");
    }
});

app.get("/courses", requireLogin("admin"), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.*,
                (SELECT COUNT(*) FROM students s WHERE s.class IN (
                    SELECT class_name FROM classes cl WHERE cl.courses ILIKE '%' || c.course_name || '%'
                )) AS student_count
            FROM courses c
            ORDER BY c.id
        `);
        const courses = result.rows;

        const totalCourses = courses.length;
        const activeCourses = courses.filter(c => c.status === "Active").length;
        const teachersInvolved = new Set(courses.map(c => c.teacher_name)).size;
        const totalEnrollments = courses.reduce((sum, c) => sum + parseInt(c.student_count), 0);

        const teachersResult = await pool.query("SELECT full_name FROM teachers ORDER BY full_name");

        res.render("courses", {
            courses, totalCourses, activeCourses, teachersInvolved, totalEnrollments,
            teachers: teachersResult.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading courses");
    }
});

app.post("/courses", requireLogin("admin"), async (req, res) => {
    try {
        const { course_name, teacher_name, lessons_count, progress, status } = req.body;

        await pool.query(
            `INSERT INTO courses (course_name, teacher_name, lessons_count, progress, status)
             VALUES ($1, $2, $3, $4, $5)`,
            [course_name, teacher_name, lessons_count || 0, progress || 0, status]
        );

        res.redirect("/courses");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error saving course");
    }
});

app.get("/assignments", requireLogin("admin"), (req, res) => {
      res.render("coming-soon", {
        feature: "Assignments"
    });
});

app.get("/results", requireLogin("admin"), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.*, s.id AS student_id
            FROM results r
            LEFT JOIN students s ON s.full_name = r.student_name
            ORDER BY r.id DESC
        `);
        const results = result.rows;

        const totalRecords = results.length;
        const averageScore = totalRecords ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / totalRecords) : 0;
        const highestScore = totalRecords ? Math.max(...results.map(r => r.score)) : 0;
        const passRate = totalRecords ? Math.round(results.filter(r => r.score >= 50).length / totalRecords * 100) : 0;

        res.render("results", { results, totalRecords, averageScore, highestScore, passRate });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading results");
    }
});

app.post("/results", requireLogin("admin"), async (req, res) => {
    try {
        const { student_name, course_name, exam_type, score, term, remarks } = req.body;

        // Auto-calculate grade from score
        let grade = "D";
        if (score >= 80) grade = "A";
        else if (score >= 70) grade = "B";
        else if (score >= 60) grade = "C";

        await pool.query(
            `INSERT INTO results (student_name, course_name, exam_type, score, grade, term, remarks)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [student_name, course_name, exam_type, score, grade, term, remarks]
        );

        res.redirect("/results");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error saving result");
    }
});

app.get("/attendance", requireLogin("admin"), async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM students ORDER BY id");
        res.render("attendance", { students: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading attendance page");
    }
});

app.post("/attendance", requireLogin("admin"), async (req, res) => {
    try {
        const { date, records } = req.body;
        // records is an array like: [{ student_id, full_name, admission_number, class, status }, ...]

        for (const record of records) {
            await pool.query(
                `INSERT INTO attendance (student_name, admission_number, class, attendance_date, status)
                 VALUES ($1, $2, $3, $4, $5)`,
                [record.full_name, record.admission_number, record.class, date, record.status]
            );
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    const intervals = [
        { label: "year", secs: 31536000 },
        { label: "month", secs: 2592000 },
        { label: "week", secs: 604800 },
        { label: "day", secs: 86400 },
        { label: "hour", secs: 3600 },
        { label: "minute", secs: 60 }
    ];

    for (const interval of intervals) {
        const count = Math.floor(seconds / interval.secs);
        if (count >= 1) {
            return count === 1 ? `1 ${interval.label} ago` : `${count} ${interval.label}s ago`;
        }
    }

    return "Just now";
}

app.get("/announcements", requireLogin("admin"), async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM announcements ORDER BY created_at DESC");
        const announcements = result.rows.map(a => ({ ...a, posted_ago: timeAgo(a.created_at) }));

        const totalAnnouncements = announcements.length;
        const sentToEveryone = announcements.filter(a => a.audience === "Everyone").length;
        const forStudents = announcements.filter(a => a.audience === "All Students").length;
        const forTeachers = announcements.filter(a => a.audience === "All Teachers").length;

        const classesResult = await pool.query("SELECT class_name FROM classes ORDER BY class_name");

        res.render("announcements", {
            announcements, totalAnnouncements, sentToEveryone, forStudents, forTeachers,
            classes: classesResult.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading announcements");
    }
});

app.post("/announcements", requireLogin("admin"), async (req, res) => {
    try {
        const { title, message, audience } = req.body;

        await pool.query(
            `INSERT INTO announcements (title, message, audience)
             VALUES ($1, $2, $3)`,
            [title, message, audience]
        );

        res.redirect("/announcements");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error saving announcement");
    }
});
app.get("/login", (req, res) => {
    res.render("login", { error: null });
});

app.post("/login", async (req, res) => {
    try {
        const { role, email, password } = req.body;

        let user;
        let table;

        if (role === "admin") {
            table = "admins";
            const result = await pool.query("SELECT * FROM admins WHERE email = $1", [email]);
            user = result.rows[0];
        } else if (role === "teacher") {
            table = "teachers";
            const result = await pool.query("SELECT * FROM teachers WHERE email = $1", [email]);
            user = result.rows[0];
        } else if (role === "student") {
            table = "students";
            const result = await pool.query("SELECT * FROM students WHERE email = $1", [email]);
            user = result.rows[0];
        }

        if (!user) {
            return res.render("login", { error: "No account found with that email." });
        }

        const passwordMatches = await bcrypt.compare(password, user.password);

        if (!passwordMatches) {
            return res.render("login", { error: "Incorrect password." });
        }

        // Save logged-in user info in the session
        req.session.user = {
            id: user.id,
            name: user.full_name,
            email: user.email,
            role: role
        };

        if (role === "admin") res.redirect("/");
        else if (role === "teacher") res.redirect("/teacher/dashboard");
        else res.redirect("/student/dashboard");

    }   catch (err) {
    console.error(err);
    res.render("login", { error: "Something went wrong. Please try again." });
}
});


app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});




app.get("/student/dashboard", requireLogin("student"), async (req, res) => {
    try {
        const studentName = req.session.user.name;

        const studentResult = await pool.query("SELECT * FROM students WHERE full_name = $1", [studentName]);
        const student = studentResult.rows[0];

        const classResult = await pool.query("SELECT * FROM classes WHERE class_name = $1", [student.class]);
        const studentClass = classResult.rows[0];

        const resultsResult = await pool.query(
            "SELECT * FROM results WHERE student_name = $1 ORDER BY id DESC LIMIT 3", [studentName]
        );

        const attendanceResult = await pool.query(
            "SELECT status FROM attendance WHERE student_name = $1", [studentName]
        );
        const totalRecords = attendanceResult.rows.length;
        const presentRecords = attendanceResult.rows.filter(r => r.status === "Present").length;
        const attendancePercent = totalRecords ? Math.round((presentRecords / totalRecords) * 100) : 0;

        res.render("student/dashboard", {
            studentName,
            student,
            studentClass,
            recentResults: resultsResult.rows,
            attendancePercent
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading dashboard");
    }
});

app.get("/student/courses", requireLogin("student"), async (req, res) => {
                            try {
                                const studentName = req.session.user.name;
        const studentResult = await pool.query("SELECT class FROM students WHERE full_name = $1", [studentName]);
        const studentClass = studentResult.rows[0].class;

        const classResult = await pool.query("SELECT courses FROM classes WHERE class_name = $1", [studentClass]);
        const courseNames = classResult.rows[0].courses.split(",").map(c => c.trim());

        const coursesResult = await pool.query("SELECT * FROM courses WHERE course_name = ANY($1)", [courseNames]);

        res.render("student/courses", { courses: coursesResult.rows });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading courses");
    }
});

app.get("/student/lessons", requireLogin("student"), (req, res) => {
      res.render("coming-soon", {
        feature: "Lessons"
    });
});

app.get("/student/results", requireLogin("student"), async (req, res) => {
    try {
        const studentName = req.session.user.name;;
        const result = await pool.query("SELECT * FROM results WHERE student_name = $1 ORDER BY id DESC", [studentName]);
        res.render("student/results", { results: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading results");
    }
});

app.get("/student/attendance", requireLogin("student"), async (req, res) => {
    try {
        const studentName = req.session.user.name;
        const result = await pool.query(
            "SELECT * FROM attendance WHERE student_name = $1 ORDER BY attendance_date DESC", [studentName]
        );

        const records = result.rows;
        const present = records.filter(r => r.status === "Present").length;
        const absent = records.filter(r => r.status === "Absent").length;
        const late = records.filter(r => r.status === "Late").length;
       const attendancePercent = records.length ? Math.round((present / records.length) * 100) : 0;

res.render("student/attendance", { records, present, absent, late, attendancePercent });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading attendance");
    }
});

app.get("/student/announcements", requireLogin("student"), async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM announcements ORDER BY created_at DESC");
        const announcements = result.rows.map(a => ({ ...a, posted_ago: timeAgo(a.created_at) }));
        res.render("student/announcements", { announcements });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading announcements");
    }
});

app.get("/student/profile", requireLogin("student"), async (req, res) => {
    try {
        const studentName = req.session.user.name;
        const result = await pool.query("SELECT * FROM students WHERE full_name = $1", [studentName]);
        res.render("student/profile", { student: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading profile");
    }
});
app.get("/student/assignments", requireLogin("student"), (req, res) => {
      res.render("coming-soon", {
        feature: "Assignments"
    });
});
app.get("/teacher/dashboard", requireLogin("teacher"), async (req, res) => {
    try {
        const teacherName = req.session.user.name;

        const classesResult = await pool.query(
            "SELECT * FROM classes WHERE teacher_name = $1", [teacherName]
        );

        const classNames = classesResult.rows.map(c => c.class_name);

        const studentsResult = await pool.query(
            "SELECT * FROM students WHERE class = ANY($1)", [classNames]
        );

        const resultsResult = await pool.query(
            "SELECT * FROM results WHERE student_name = ANY($1) ORDER BY created_at DESC LIMIT 5",
            [studentsResult.rows.map(s => s.full_name)]
        );

       const studentNames = studentsResult.rows.map(s => s.full_name);
const attendanceResult = await pool.query(
    "SELECT status FROM attendance WHERE student_name = ANY($1)", [studentNames]
);
const totalRecords = attendanceResult.rows.length;
const presentRecords = attendanceResult.rows.filter(r => r.status === "Present").length;
const avgAttendance = totalRecords ? Math.round((presentRecords / totalRecords) * 100) : 0;

       res.render("teacher/dashboard", {
    teacherName,
    classes: classesResult.rows,
    totalStudents: studentsResult.rows.length,
    recentResults: resultsResult.rows,
    avgAttendance,
    presentRecords,
    totalRecords
});
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading teacher dashboard");
    }
});

app.get("/teacher/students", requireLogin("teacher"), async (req, res) => {
    try {
        const teacherName = req.session.user.name;
        const classesResult = await pool.query("SELECT class_name FROM classes WHERE teacher_name = $1", [teacherName]);
        const classNames = classesResult.rows.map(c => c.class_name);

        const studentsResult = await pool.query("SELECT * FROM students WHERE class = ANY($1) ORDER BY id", [classNames]);

        res.render("teacher/students", { students: studentsResult.rows });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading students");
    }
});

app.get("/teacher/classes", requireLogin("teacher"), async (req, res) => {
    try {
        const teacherName = req.session.user.name;
        const result = await pool.query(`
            SELECT c.*,
                (SELECT COUNT(*) FROM students s WHERE s.class = c.class_name) AS student_count
            FROM classes c
            WHERE c.teacher_name = $1
            ORDER BY c.id
        `, [teacherName]);

        res.render("teacher/classes", { classes: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading classes");
    }
});

app.get("/teacher/results", requireLogin("teacher"), async (req, res) => {
    try {
        const teacherName = req.session.user.name;
        const classesResult = await pool.query("SELECT class_name, courses FROM classes WHERE teacher_name = $1", [teacherName]);
        const classNames = classesResult.rows.map(c => c.class_name);

        const studentsResult = await pool.query("SELECT full_name FROM students WHERE class = ANY($1)", [classNames]);
        const studentNames = studentsResult.rows.map(s => s.full_name);

        const resultsResult = await pool.query(
            "SELECT * FROM results WHERE student_name = ANY($1) ORDER BY id DESC",
            [studentNames]
        );

        const courseNames = [...new Set(classesResult.rows.flatMap(c => c.courses.split(",").map(x => x.trim())))];

        res.render("teacher/results", {
            results: resultsResult.rows,
            students: studentNames,
            courses: courseNames
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading results");
    }
});

app.post("/teacher/results", requireLogin("teacher"), async (req, res) => {
    try {
        const { student_name, course_name, exam_type, score, remarks } = req.body;

        let grade = "D";
        if (score >= 70) grade = "A";
        else if (score >= 60) grade = "B";
        else if (score >= 50) grade = "C";

        await pool.query(
            `INSERT INTO results (student_name, course_name, exam_type, score, grade, term, remarks)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [student_name, course_name, exam_type, score, grade, "Term 1", remarks]
        );

        res.redirect("/teacher/results");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error saving result");
    }
});

app.get("/teacher/attendance", requireLogin("teacher"), async (req, res) => {
    try {
        const teacherName = req.session.user.name;
        const classesResult = await pool.query("SELECT class_name FROM classes WHERE teacher_name = $1", [teacherName]);
        const classNames = classesResult.rows.map(c => c.class_name);

        const studentsResult = await pool.query("SELECT * FROM students WHERE class = ANY($1) ORDER BY id", [classNames]);

        res.render("teacher/attendance", { students: studentsResult.rows });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading attendance");
    }
});

app.post("/teacher/attendance", requireLogin("teacher"), async (req, res) => {
    try {
        const { date, records } = req.body;

        for (const record of records) {
            await pool.query(
                `INSERT INTO attendance (student_name, admission_number, class, attendance_date, status)
                 VALUES ($1, $2, $3, $4, $5)`,
                [record.full_name, record.admission_number, record.class, date, record.status]
            );
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

app.get("/teacher/announcements", requireLogin("teacher"), async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM announcements ORDER BY created_at DESC");
        const announcements = result.rows.map(a => ({ ...a, posted_ago: timeAgo(a.created_at) }));
        res.render("teacher/announcements", { announcements });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading announcements");
    }
});

app.post("/teacher/announcements", requireLogin("teacher"), async (req, res) => {
    try {
        const { title, message, audience } = req.body;
        await pool.query(
            `INSERT INTO announcements (title, message, audience, posted_by)
             VALUES ($1, $2, $3, $4)`,
            [title, message, audience, req.session.user.name]
        );
        res.redirect("/teacher/announcements");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error saving announcement");
    }
});
app.get("/teacher/lessons", requireLogin("teacher"), (req, res) => {
  res.render("coming-soon", {
        feature: "Lessons"
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});