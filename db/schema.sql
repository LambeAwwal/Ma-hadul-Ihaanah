CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    admission_number VARCHAR(30) UNIQUE NOT NULL,
    email VARCHAR(100),
    gender VARCHAR(10),
    class VARCHAR(50),
    parent_guardian_name VARCHAR(100),
    parent_phone VARCHAR(30),
    address TEXT,
    date_of_birth DATE,
    attendance INTEGER DEFAULT 100,
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT NOW()
);