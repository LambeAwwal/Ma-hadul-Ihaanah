CREATE TABLE teachers (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    teacher_id VARCHAR(30) UNIQUE NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(30),
    subject VARCHAR(100),
    classes VARCHAR(150),
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT NOW()
);