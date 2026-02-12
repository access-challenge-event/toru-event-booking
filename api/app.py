from __future__ import annotations

import os
from datetime import datetime, timedelta
from functools import wraps
import json

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
    category = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, server_default=func.current_timestamp())
    updated_at = db.Column(
        db.DateTime,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )


class Booking(db.Model):
    __tablename__ = "bookings"

    id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=False)
    event_id = db.Column(db.BigInteger, db.ForeignKey("events.id"), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="confirmed")
    guest_count = db.Column(db.Integer, nullable=False, default=1)
    guest_names = db.Column(db.Text, nullable=True)
    booked_at = db.Column(db.DateTime, server_default=func.current_timestamp())
    cancelled_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship("User", backref="bookings")
    event = db.relationship("Event", backref="bookings")


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
        if "category" not in columns:
            conn.execute(
                text(
                    "ALTER TABLE events ADD COLUMN category VARCHAR(50) NULL"
                )
            )


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
            "category": event.category if hasattr(event, "category") else None,
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

    guest_names_raw = payload.get("guest_names") or []
    if isinstance(guest_names_raw, str):
        guest_names = [
            name.strip() for name in guest_names_raw.split(",") if name.strip()
        ]
    elif isinstance(guest_names_raw, list):
        guest_names = [str(name).strip() for name in guest_names_raw if str(name).strip()]
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

    booking.status = "cancelled"
    booking.cancelled_at = datetime.utcnow()
    db.session.commit()
    return jsonify(booking_to_dict(booking))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
