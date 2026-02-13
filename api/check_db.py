from app import app, db, Booking
from sqlalchemy import text

with app.app_context():
    try:
        print("Checking Booking columns...")
        with db.engine.connect() as conn:
            result = conn.execute(text("DESCRIBE bookings"))
            for row in result:
                print(f"Column: {row[0]}, Type: {row[1]}, Null: {row[2]}, Key: {row[3]}")
    except Exception as e:
        print(f"Error: {e}")
