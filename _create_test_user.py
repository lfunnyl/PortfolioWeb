import sqlite3

# The password is 'password123'
hashed = "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjIQG8.RMG"

conn = sqlite3.connect('backend/portfolio_v2.db')
c = conn.cursor()
c.execute(f"INSERT OR IGNORE INTO users (email, hashed_password, is_verified, is_active) VALUES ('test@example.com', '{hashed}', 1, 1)")
c.execute("UPDATE users SET is_verified = 1 WHERE email = 'test@example.com'")
conn.commit()
conn.close()
print("Test user created and verified.")
