CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    course_name VARCHAR(100) UNIQUE NOT NULL,
    teacher_name VARCHAR(100),
    lessons_count INTEGER DEFAULT 0,
    progress INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT NOW()
);