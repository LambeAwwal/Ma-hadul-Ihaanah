CREATE TABLE results (
    id SERIAL PRIMARY KEY,
    student_name VARCHAR(100) NOT NULL,
    course_name VARCHAR(100),
    exam_type VARCHAR(30),
    score INTEGER,
    grade VARCHAR(5),
    term VARCHAR(20),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);