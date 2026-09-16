CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    student_name VARCHAR(100) NOT NULL,
    admission_number VARCHAR(30),
    class VARCHAR(50),
    attendance_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Present',
    created_at TIMESTAMP DEFAULT NOW()
);