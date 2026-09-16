CREATE TABLE classes (
    id SERIAL PRIMARY KEY,
    class_name VARCHAR(50) UNIQUE NOT NULL,
    teacher_name VARCHAR(100),
    schedule VARCHAR(100),
    courses VARCHAR(200),
    capacity INTEGER,
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT NOW()
);