CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    audience VARCHAR(30) DEFAULT 'Everyone',
    posted_by VARCHAR(100) DEFAULT 'Administrator',
    created_at TIMESTAMP DEFAULT NOW()
);