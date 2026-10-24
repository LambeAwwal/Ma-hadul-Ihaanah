CREATE TABLE enrollments (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(10),
    level VARCHAR(50),
    parent_guardian_name VARCHAR(100),
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(100),
    address TEXT,
    message TEXT,
    status VARCHAR(20) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT NOW()
);