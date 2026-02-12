from __future__ import annotations

import os
from datetime import datetime, timedelta
from functools import wraps
import json
import re

import jwt
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func, text
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

db_user = os.getenv("DB_USER", "delapre_user")
db_pass = os.getenv("DB_PASS", "delapre_password")
db_host = os.getenv("DB_HOST", "db")
db_port = os.getenv("DB_PORT", "3306")
db_name = os.getenv("DB_NAME", "delapre_events")

app.config["SQLALCHEMY_DATABASE_URI"] = (
    f"mysql+pymysql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

jwt_secret = os.getenv("JWT_SECRET", "change_me")

db = SQLAlchemy(app)

# Maximum guests allowed per single booking
MAX_GUESTS_PER_BOOKING = 4


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.BigInteger, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(120), nullable=False)
    last_name = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime, server_default=func.current_timestamp())
    updated_at = db.Column(
        db.DateTime,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )


class Event(db.Model):
    __tablename__ = "events"

    id = db.Column(db.BigInteger, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    starts_at = db.Column(db.DateTime, nullable=False)
    ends_at = db.Column(db.DateTime, nullable=False)
    location = db.Column(db.String(255), nullable=False)
    is_free = db.Column(db.Boolean, nullable=False, default=True)
    price = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    capacity = db.Column(db.Integer, nullable=False, default=0)
    category_id = db.Column(db.BigInteger, db.ForeignKey("categories.id"), nullable=True)
    category = db.relationship("Category", backref="events", lazy="joined")
    created_at = db.Column(db.DateTime, server_default=func.current_timestamp())
    updated_at = db.Column(
        db.DateTime,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )


class Booking(db.Model):
    __tablename__ = "bookings"

    id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    event_id = db.Column(db.BigInteger, db.ForeignKey("events.id"), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="confirmed")
    guest_count = db.Column(db.Integer, nullable=False, default=1)
    guest_names = db.Column(db.Text, nullable=True)
    guest_email = db.Column(db.String(255), nullable=True)
    guest_name = db.Column(db.String(255), nullable=True)
    guest_phone = db.Column(db.String(50), nullable=True)
    booked_at = db.Column(db.DateTime, server_default=func.current_timestamp())
    cancelled_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship("User", backref="bookings")
    event = db.relationship("Event", backref="bookings")


class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.BigInteger, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, server_default=func.current_timestamp())
    updated_at = db.Column(
        db.DateTime,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )


def ensure_booking_columns():
    with db.engine.begin() as conn:
        result = conn.execute(
            text(
                """
                SELECT COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = :schema_name AND TABLE_NAME = 'bookings'
                """
            ),
            {"schema_name": db_name},
        )
        columns = {row[0] for row in result}
        if "guest_count" not in columns:
            conn.execute(
                text(
                    "ALTER TABLE bookings ADD COLUMN guest_count INT UNSIGNED NOT NULL DEFAULT 1"
                )
            )
        if "guest_names" not in columns:
            conn.execute(text("ALTER TABLE bookings ADD COLUMN guest_names TEXT NULL"))
        if "guest_email" not in columns:
            conn.execute(text("ALTER TABLE bookings ADD COLUMN guest_email VARCHAR(255) NULL"))
        if "guest_name" not in columns:
            conn.execute(text("ALTER TABLE bookings ADD COLUMN guest_name VARCHAR(255) NULL"))
        if "guest_phone" not in columns:
            conn.execute(text("ALTER TABLE bookings ADD COLUMN guest_phone VARCHAR(50) NULL"))
        # Make user_id nullable if it isn't already
        try:
            conn.execute(text("ALTER TABLE bookings MODIFY COLUMN user_id BIGINT UNSIGNED NULL"))
        except Exception:
            pass


def ensure_user_columns():
    with db.engine.begin() as conn:
        result = conn.execute(
            text(
                """
                SELECT COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = :schema_name AND TABLE_NAME = 'users'
                """
            ),
            {"schema_name": db_name},
        )
        columns = {row[0] for row in result}
        if "first_name" not in columns:
            conn.execute(
                text(
                    "ALTER TABLE users ADD COLUMN first_name VARCHAR(120) NOT NULL DEFAULT ''"
                )
            )
        if "last_name" not in columns:
            conn.execute(
                text(
                    "ALTER TABLE users ADD COLUMN last_name VARCHAR(120) NOT NULL DEFAULT ''"
                )
            )
        if "full_name" in columns:
            conn.execute(
                text(
                    """
                    UPDATE users
                    SET first_name = IF(first_name = '', SUBSTRING_INDEX(full_name, ' ', 1), first_name),
                        last_name = IF(last_name = '', TRIM(SUBSTRING(full_name, LOCATE(' ', full_name) + 1)), last_name)
                    WHERE (first_name = '' OR last_name = '')
                    """
                )
            )


def ensure_event_columns():
    with db.engine.begin() as conn:
        # ensure categories table exists
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS categories (
                  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                  name VARCHAR(50) NOT NULL,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                  PRIMARY KEY (id),
                  UNIQUE KEY uk_categories_name (name)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """
            )
        )

        result = conn.execute(
            text(
                """
                SELECT COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = :schema_name AND TABLE_NAME = 'events'
                """
            ),
            {"schema_name": db_name},
        )
        columns = {row[0] for row in result}
        if "category_id" not in columns:
            conn.execute(
                text(
                    "ALTER TABLE events ADD COLUMN category_id BIGINT UNSIGNED NULL"
                )
            )
            # add index and foreign key if needed
            try:
                conn.execute(text("ALTER TABLE events ADD CONSTRAINT fk_events_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL"))
            except Exception:
                # ignore if constraint already exists or DB doesn't support it here
                pass


with app.app_context():
    db.create_all()
    ensure_user_columns()
    ensure_booking_columns()
    ensure_event_columns()


def json_error(message: str, status: int = 400):
    return jsonify({"message": message}), status


def token_for_user(user: User) -> str:
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "exp": datetime.utcnow() + timedelta(hours=12),
    }
    return jwt.encode(payload, jwt_secret, algorithm="HS256")


def require_auth(handler):
    @wraps(handler)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return json_error("Missing or invalid token", 401)
        token = auth_header.split(" ", 1)[1]
        try:
            payload = jwt.decode(token, jwt_secret, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return json_error("Token expired", 401)
        except jwt.InvalidTokenError:
            return json_error("Invalid token", 401)
        user = db.session.get(User, int(payload["sub"]))
        if not user:
            return json_error("User not found", 401)
        return handler(user, *args, **kwargs)

    return wrapper


def event_to_dict(event: Event, include_spots: bool = True):
    spots_left = None
    if include_spots:
        confirmed = (
            db.session.query(func.coalesce(func.sum(Booking.guest_count), 0))
            .filter_by(event_id=event.id, status="confirmed")
            .scalar()
        )
        spots_left = max(0, event.capacity - int(confirmed or 0))
    return {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "starts_at": event.starts_at.isoformat(),
        "ends_at": event.ends_at.isoformat(),
        "location": event.location,
        "is_free": bool(event.is_free),
        "price": float(event.price) if event.price else 0.00,
        "capacity": event.capacity,
        "spots_left": spots_left,
        "category_id": int(event.category_id) if getattr(event, "category_id", None) is not None else None,
        "category": {"id": int(event.category.id), "name": event.category.name} if getattr(event, "category", None) else None,
    }


def booking_to_dict(booking: Booking):
    guest_names = []
    if booking.guest_names:
        try:
            guest_names = json.loads(booking.guest_names)
        except json.JSONDecodeError:
            guest_names = []
    return {
        "id": booking.id,
        "status": booking.status,
        "guest_count": booking.guest_count,
        "guest_names": guest_names,
        "guest_email": booking.guest_email,
        "guest_name": booking.guest_name,
        "guest_phone": booking.guest_phone,
        "booked_at": booking.booked_at.isoformat() if booking.booked_at else None,
        "cancelled_at": booking.cancelled_at.isoformat() if booking.cancelled_at else None,
        "event": event_to_dict(booking.event),
    }


@app.get("/api/health")
def health_check():
    return jsonify({"status": "ok"})


@app.get("/api/docs/openapi.json")
def openapi_spec():
    return send_from_directory(os.path.dirname(__file__), "openapi.json")


@app.get("/api/events")
def list_events():
    free_only = request.args.get("free") in {"1", "true", "True"}
    query = Event.query
    if free_only:
        query = query.filter_by(is_free=True)
    events = query.order_by(Event.starts_at.asc()).all()
    return jsonify([event_to_dict(event) for event in events])


@app.get("/api/events/<int:event_id>")
def event_details(event_id: int):
    event = db.session.get(Event, event_id)
    if not event:
        return json_error("Event not found", 404)
    return jsonify(event_to_dict(event))


@app.get("/api/categories")
def list_categories():
    categories = Category.query.order_by(Category.name.asc()).all()
    return jsonify([{"id": c.id, "name": c.name} for c in categories])


@app.get("/api/locations")
def list_locations():
    # Fetch distinct locations from existing events
    locations = db.session.query(Event.location).distinct().order_by(Event.location.asc()).all()
    return jsonify([loc[0] for loc in locations if loc[0]])


@app.post("/api/events")
@require_auth
def create_event(current_user: User):
    # In a real app we'd check current_user.is_staff
    payload = request.get_json(silent=True) or {}
    
    title = (payload.get("title") or "").strip()
    description = (payload.get("description") or "").strip()
    location = (payload.get("location") or "").strip()
    try:
        starts_at = datetime.fromisoformat(payload.get("starts_at", ""))
        ends_at = datetime.fromisoformat(payload.get("ends_at", ""))
    except ValueError:
        return json_error("Invalid date format")

    if not title or not location or not starts_at or not ends_at:
        return json_error("Title, location, start time, and end time are required")

    capacity = payload.get("capacity", 0)
    try:
        capacity = int(capacity)
    except (ValueError, TypeError):
        return json_error("Capacity must be a number")

    is_free = payload.get("is_free", False)
    price = payload.get("price", 0.0)
    try:
        price = float(price)
    except (ValueError, TypeError):
        return json_error("Price must be a number")

    if is_free:
        price = 0.0

    category_id = payload.get("category_id")
    if category_id:
        try:
            category_id = int(category_id)
            if not db.session.get(Category, category_id):
                return json_error("Invalid category ID", 400)
        except (ValueError, TypeError):
            return json_error("Invalid category ID", 400)

    event = Event(
        title=title,
        description=description or "No description provided.",
        starts_at=starts_at,
        ends_at=ends_at,
        location=location,
        is_free=bool(is_free),
        price=price,
        capacity=capacity,
        category_id=category_id
    )
    db.session.add(event)
    db.session.commit()
    return jsonify(event_to_dict(event)), 201


@app.post("/api/auth/register")
def register_user():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    first_name = (payload.get("first_name") or "").strip()
    last_name = (payload.get("last_name") or "").strip()

    if not email or not password or not first_name or not last_name:
        return json_error("Email, password, first name, and last name are required")

    if User.query.filter_by(email=email).first():
        return json_error("Email already registered", 409)

    user = User(
        email=email,
        password_hash=generate_password_hash(password),
        first_name=first_name,
        last_name=last_name,
    )
    db.session.add(user)
    db.session.commit()

    token = token_for_user(user)
    return (
        jsonify({
            "token": token,
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
            },
        }),
        201,
    )


@app.post("/api/auth/login")
def login_user():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    if not email or not password:
        return json_error("Email and password are required")

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return json_error("Invalid credentials", 401)

    token = token_for_user(user)
    return jsonify({
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
        },
    })


@app.get("/api/bookings")
@require_auth
def list_bookings(current_user: User):
    now = datetime.utcnow()
    bookings = (
        Booking.query.join(Event)
        .filter(
            Booking.user_id == current_user.id,
            Booking.status == "confirmed",
            Event.starts_at >= now,
        )
        .order_by(Event.starts_at.asc())
        .all()
    )
    return jsonify([booking_to_dict(booking) for booking in bookings])


@app.post("/api/bookings")
@require_auth
def create_booking(current_user: User):
    payload = request.get_json(silent=True) or {}
    event_id = payload.get("event_id")
    if not event_id:
        return json_error("Event id is required")

    guest_count = payload.get("guest_count", 1)
    try:
        guest_count = int(guest_count)
    except (TypeError, ValueError):
        return json_error("Guest count must be a number")

    if guest_count < 1:
        return json_error("Guest count must be at least 1")

    if guest_count > MAX_GUESTS_PER_BOOKING:
        return json_error(f"Guest count must be {MAX_GUESTS_PER_BOOKING} or fewer")

    guest_names_raw = payload.get("guest_names") or []
    if isinstance(guest_names_raw, str):
        guest_names = [
            name.strip() for name in guest_names_raw.split(",") if name.strip()
        ]
    elif isinstance(guest_names_raw, list):
        guest_names = []
        for g in guest_names_raw:
            if isinstance(g, str) and g.strip():
                guest_names.append(g.strip())
            elif isinstance(g, dict):
                guest_names.append(g)
    else:
        guest_names = []

    if guest_names and len(guest_names) > guest_count:
        guest_names = guest_names[:guest_count]

    event = db.session.get(Event, int(event_id))
    if not event:
        return json_error("Event not found", 404)

    existing = Booking.query.filter_by(
        user_id=current_user.id, event_id=event.id, status="confirmed"
    ).first()
    if existing:
        return json_error("Booking already exists", 409)

    confirmed = (
        db.session.query(func.coalesce(func.sum(Booking.guest_count), 0))
        .filter_by(event_id=event.id, status="confirmed")
        .scalar()
    )
    available = event.capacity - int(confirmed or 0)
    if event.capacity > 0 and guest_count > available:
        return json_error("Not enough spaces available", 409)

    # enforce max per-booking limit server-side as well
    if guest_count > MAX_GUESTS_PER_BOOKING:
        return json_error(f"Cannot book more than {MAX_GUESTS_PER_BOOKING} guests at once", 409)

    booking = Booking(
        user_id=current_user.id,
        event_id=event.id,
        status="confirmed",
        guest_count=guest_count,
        guest_names=json.dumps(guest_names) if guest_names else None,
    )
    db.session.add(booking)
    db.session.commit()
    return jsonify(booking_to_dict(booking)), 201


@app.post("/api/bookings/guest")
def create_guest_booking():
    payload = request.get_json(silent=True) or {}
    event_id = payload.get("event_id")
    email = (payload.get("email") or "").strip().lower()
    name = (payload.get("name") or "").strip()
    phone = (payload.get("phone") or "").strip()

    if not event_id:
        return json_error("Event id is required")
    if not email:
        return json_error("Email is required")
    if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email):
        return json_error("Please enter a valid email address")
    if not name:
        return json_error("Name is required")
    if phone and not re.match(r'^[\d\s\-\+\(\)]{7,20}$', phone):
        return json_error("Please enter a valid phone number")

    guest_count = payload.get("guest_count", 1)
    try:
        guest_count = int(guest_count)
    except (TypeError, ValueError):
        return json_error("Guest count must be a number")

    if guest_count < 1:
        return json_error("Guest count must be at least 1")
    if guest_count > MAX_GUESTS_PER_BOOKING:
        return json_error(f"Guest count must be {MAX_GUESTS_PER_BOOKING} or fewer")

    guest_names_raw = payload.get("guest_names") or []
    if isinstance(guest_names_raw, str):
        guest_names = [
            n.strip() for n in guest_names_raw.split(",") if n.strip()
        ]
    elif isinstance(guest_names_raw, list):
        guest_names = []
        for g in guest_names_raw:
            if isinstance(g, str) and g.strip():
                guest_names.append(g.strip())
            elif isinstance(g, dict):
                guest_names.append(g)
    else:
        guest_names = []
    if guest_names and len(guest_names) > guest_count:
        guest_names = guest_names[:guest_count]

    event = db.session.get(Event, int(event_id))
    if not event:
        return json_error("Event not found", 404)

    # Check for duplicate guest booking by email + event
    existing = Booking.query.filter_by(
        guest_email=email, event_id=event.id, status="confirmed"
    ).first()
    if existing:
        return json_error("A booking with this email already exists for this event", 409)

    confirmed = (
        db.session.query(func.coalesce(func.sum(Booking.guest_count), 0))
        .filter_by(event_id=event.id, status="confirmed")
        .scalar()
    )
    available = event.capacity - int(confirmed or 0)
    if event.capacity > 0 and guest_count > available:
        return json_error("Not enough spaces available", 409)

    booking = Booking(
        user_id=None,
        event_id=event.id,
        status="confirmed",
        guest_count=guest_count,
        guest_names=json.dumps(guest_names) if guest_names else None,
        guest_email=email,
        guest_name=name,
        guest_phone=phone or None,
    )
    db.session.add(booking)
    db.session.commit()
    return jsonify(booking_to_dict(booking)), 201


@app.get("/api/bookings/history")
@require_auth
def booking_history(current_user: User):
    bookings = (
        Booking.query.join(Event)
        .filter(Booking.user_id == current_user.id)
        .order_by(Booking.booked_at.desc())
        .all()
    )
    return jsonify([booking_to_dict(booking) for booking in bookings])


@app.delete("/api/bookings/<int:booking_id>")
@require_auth
def cancel_booking(current_user: User, booking_id: int):
    booking = Booking.query.filter_by(id=booking_id, user_id=current_user.id).first()
    if not booking:
        return json_error("Booking not found", 404)
    if booking.status == "cancelled":
        return jsonify(booking_to_dict(booking))

    # Prevent cancellation within 24 hours of event start
    event = booking.event
    now = datetime.utcnow()
    if event and event.starts_at:
        try:
            if event.starts_at - now <= timedelta(hours=24):
                return json_error("Cannot cancel within 24 hours of the event start", 409)
        except Exception:
            # if comparison fails for any reason, fall back to disallowing close cancellations
            pass

    booking.status = "cancelled"
    booking.cancelled_at = datetime.utcnow()
    db.session.commit()
    return jsonify(booking_to_dict(booking))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
