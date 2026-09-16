const bcrypt = require("bcrypt");
const pool = require(".");

async function setPasswords() {
    const password = "password123"; // temporary default for all accounts
    const hashed = await bcrypt.hash(password, 10);

    await pool.query("UPDATE students SET password = $1", [hashed]);
    await pool.query("UPDATE teachers SET password = $1", [hashed]);

    await pool.query(
        `INSERT INTO admins (full_name, email, password)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO NOTHING`,
        ["Administrator", "admin@mahadulihaanah.edu", hashed]
    );

    console.log("Passwords set! Default password for everyone: password123");
    process.exit();
}

setPasswords();