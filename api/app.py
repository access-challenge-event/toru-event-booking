from __future__ import annotations

import os
from datetime import datetime, timedelta
from functools import wraps
import json
import re

import jwt
from flask import Flask, jsonify, request, send_from_directory, Response
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func, text
from werkzeug.security import check_password_hash, generate_password_hash
import uuid
import io
from fpdf import FPDF
import qrcode

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
    phone = db.Column(db.String(50), nullable=True)
    email_opt_in = db.Column(db.Boolean, nullable=False, default=True)
    sms_opt_in = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, server_default=func.current_timestamp())
    updated_at = db.Column(
        db.DateTime,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )
    is_staff = db.Column(db.Boolean, default=False)


class Event(db.Model):
    __tablename__ = "events"

    id = db.Column(db.BigInteger, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    starts_at = db.Column(db.DateTime, nullable=False)
    ends_at = db.Column(db.DateTime, nullable=False)
    location_id = db.Column(db.BigInteger, db.ForeignKey("locations.id"), nullable=True)
    location = db.relationship("Location", backref="events", lazy="joined")
    is_free = db.Column(db.Boolean, nullable=False, default=True)
    price = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    capacity = db.Column(db.Integer, nullable=False, default=0)
    # Recurrence fields
    group_id = db.Column(db.String(36), nullable=True)  # UUID to group recurring events
    recurrence_type = db.Column(db.String(20), nullable=True)  # 'weekly', etc.
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
    confirmation_code = db.Column(db.String(10), unique=True, nullable=True)
    booked_at = db.Column(db.DateTime, server_default=func.current_timestamp())
    cancelled_at = db.Column(db.DateTime, nullable=True)
    checked_in = db.Column(db.Boolean, nullable=False, default=False)
    checked_in_at = db.Column(db.DateTime, nullable=True)

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


class Location(db.Model):
    __tablename__ = "locations"

    id = db.Column(db.BigInteger, primary_key=True)
    name = db.Column(db.String(255), nullable=False, unique=True)
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
        if "confirmation_code" not in columns:
            conn.execute(text("ALTER TABLE bookings ADD COLUMN confirmation_code VARCHAR(10) NULL"))
            try:
                conn.execute(text("CREATE UNIQUE INDEX uk_bookings_confirmation_code ON bookings(confirmation_code)"))
            except Exception:
                pass
        if "checked_in" not in columns:
            conn.execute(text("ALTER TABLE bookings ADD COLUMN checked_in TINYINT(1) NOT NULL DEFAULT 0"))
        if "checked_in_at" not in columns:
            conn.execute(text("ALTER TABLE bookings ADD COLUMN checked_in_at DATETIME NULL"))
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
        if "is_staff" not in columns:
            conn.execute(
                text("ALTER TABLE users ADD COLUMN is_staff TINYINT(1) NOT NULL DEFAULT 0")
            )
        if "phone" not in columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(50) NULL"))
        if "email_opt_in" not in columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN email_opt_in TINYINT(1) NOT NULL DEFAULT 1"))
        if "sms_opt_in" not in columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN sms_opt_in TINYINT(1) NOT NULL DEFAULT 0"))




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

        # ensure locations table exists
        conn.execute(
                text(
                        """
                        CREATE TABLE IF NOT EXISTS locations (
                            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                            name VARCHAR(255) NOT NULL,
                            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                            PRIMARY KEY (id),
                            UNIQUE KEY uk_locations_name (name)
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

        # category_id
        if "category_id" not in columns:
            conn.execute(text("ALTER TABLE events ADD COLUMN category_id BIGINT UNSIGNED NULL"))
            try:
                conn.execute(text("ALTER TABLE events ADD CONSTRAINT fk_events_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL"))
            except Exception:
                pass

        # location_id
        if "location_id" not in columns:
            conn.execute(text("ALTER TABLE events ADD COLUMN location_id BIGINT UNSIGNED NULL"))
            try:
                conn.execute(text("ALTER TABLE events ADD CONSTRAINT fk_events_location FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE SET NULL"))
            except Exception:
                pass

        # group_id and index
        if "group_id" not in columns:
            conn.execute(text("ALTER TABLE events ADD COLUMN group_id VARCHAR(36) NULL"))
            try:
                conn.execute(text("CREATE INDEX idx_events_group_id ON events(group_id)"))
            except Exception:
                pass

        # recurrence_type
        if "recurrence_type" not in columns:
            conn.execute(text("ALTER TABLE events ADD COLUMN recurrence_type VARCHAR(20) NULL"))



def ensure_staff_user():
    user = User.query.filter_by(email="staff@example.com").first()
    target_hash = generate_password_hash("password")
    
    if not user:
        user = User(
            email="staff@example.com",
            password_hash=target_hash,
            first_name="Staff",
            last_name="User",
            is_staff=True
        )
        db.session.add(user)
        print("Created default staff user: staff@example.com")
    else:
        # Force update password and staff status to ensure it works
        user.password_hash = target_hash
        user.is_staff = True
        print("Updated existing staff user: staff@example.com")
        
    db.session.commit()

with app.app_context():
    db.create_all()
    ensure_user_columns()
    ensure_booking_columns()
    ensure_event_columns()
    ensure_staff_user()


def json_error(message: str, status: int = 400):
    return jsonify({"message": message}), status


def token_for_user(user: User) -> str:
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "phone": user.phone,
        "email_opt_in": bool(user.email_opt_in),
        "sms_opt_in": bool(user.sms_opt_in),
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


def require_staff(handler):
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
        if not getattr(user, "is_staff", False):
            return json_error("Forbidden", 403)
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
        "location_id": int(event.location_id) if getattr(event, "location_id", None) is not None else None,
        "location": event.location.name if getattr(event, "location", None) else None,
        "is_free": bool(event.is_free),
        "price": float(event.price) if event.price else 0.00,
        "capacity": event.capacity,
        "spots_left": spots_left,
        "category_id": int(event.category_id) if getattr(event, "category_id", None) is not None else None,
        "category": {"id": int(event.category.id), "name": event.category.name} if getattr(event, "category", None) else None,
        "group_id": event.group_id,
        "recurrence_type": event.recurrence_type
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
        "confirmation_code": booking.confirmation_code,
        "booked_at": booking.booked_at.isoformat() if booking.booked_at else None,
        "cancelled_at": booking.cancelled_at.isoformat() if booking.cancelled_at else None,
        "checked_in": bool(booking.checked_in),
        "checked_in_at": booking.checked_in_at.isoformat() if booking.checked_in_at else None,
        "event": event_to_dict(booking.event),
    }


def build_confirmation_qr(data: str):
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=6,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer


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
    locations = Location.query.order_by(Location.name.asc()).all()
    return jsonify([{"id": l.id, "name": l.name} for l in locations])


@app.post("/api/events")
@require_auth
def create_event(current_user: User):
    # In a real app we'd check current_user.is_staff
    payload = request.get_json(silent=True) or {}
    
    title = (payload.get("title") or "").strip()
    description = (payload.get("description") or "").strip()
    # location can be provided as a string (legacy) or a location_id (preferred)
    location = (payload.get("location") or "").strip()
    location_id = payload.get("location_id")
    try:
        starts_at = datetime.fromisoformat(payload.get("starts_at", ""))
        ends_at = datetime.fromisoformat(payload.get("ends_at", ""))
    except ValueError:
        return json_error("Invalid date format")

    if not title or not starts_at or not ends_at:
        return json_error("Title, start time, and end time are required")

    # Resolve location_id if not provided but location string is
    if not location_id and location:
        # If the client passed the numeric id in the `location` field (legacy), use it
        try:
            maybe_id = int(location)
            if db.session.get(Location, maybe_id):
                location_id = maybe_id
            else:
                # Fall back to treating it as a name below
                pass
        except (ValueError, TypeError):
            pass

        if not location_id:
            # find or create location by name
            loc = Location.query.filter(func.lower(Location.name) == location.lower()).first()
            if not loc:
                loc = Location(name=location)
                db.session.add(loc)
                db.session.commit()
            location_id = loc.id

    if not location_id:
        return json_error("Location is required")

    try:
        location_id = int(location_id)
        if not db.session.get(Location, location_id):
            return json_error("Invalid location id", 400)
    except (ValueError, TypeError):
        return json_error("Invalid location id", 400)

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

    recurrence = payload.get("recurrence", {})
    recurrence_type = (recurrence.get("type") or "").strip().lower()
    recurrence_end_date = recurrence.get("end_date")
    
    events_created = []
    group_id = None

    # Helper: check for overlapping events at the same location
    def has_conflict(loc_id, start_dt, end_dt):
        # overlap if existing.starts_at < new.ends_at and existing.ends_at > new.starts_at
        conflict = (
            Event.query
            .filter(Event.location_id == loc_id)
            .filter(Event.starts_at < end_dt)
            .filter(Event.ends_at > start_dt)
            .first()
        )
        return conflict is not None

    if recurrence_type == "weekly" and recurrence_end_date:
        try:
            end_date_obj = datetime.fromisoformat(recurrence_end_date)
            # Ensure end date includes time if only date provided, or assume end of day? No, just compare dates.
            # Usually end_date comes as YYYY-MM-DD
        except ValueError:
            return json_error("Invalid recurrence end date")
            
        group_id = str(uuid.uuid4())
        
        # Create instances
        current_start = starts_at
        current_end = ends_at
        
        while current_start <= end_date_obj:
            # Check for time/location conflicts before adding
            if has_conflict(location_id, current_start, current_end):
                return json_error(
                    f"Location is already booked for {current_start.date()} {current_start.time()} - {current_end.time()}",
                    409,
                )

            event = Event(
                title=title,
                description=description or "No description provided.",
                starts_at=current_start,
                ends_at=current_end,
                location_id=location_id,
                is_free=bool(is_free),
                price=price,
                capacity=capacity,
                category_id=category_id,
                group_id=group_id,
                recurrence_type=recurrence_type,
            )
            db.session.add(event)
            events_created.append(event)
            
            # Add 7 days
            current_start += timedelta(days=7)
            current_end += timedelta(days=7)
            
    else:
        # Single event
        # Check for conflict at this location/time
        if has_conflict(location_id, starts_at, ends_at):
            return json_error("Location is already booked at that time", 409)

        event = Event(
            title=title,
            description=description or "No description provided.",
            starts_at=starts_at,
            ends_at=ends_at,
            location_id=location_id,
            is_free=bool(is_free),
            price=price,
            capacity=capacity,
            category_id=category_id,
            group_id=None,
            recurrence_type=None,
        )
        db.session.add(event)
        events_created.append(event)

    db.session.commit()
    
    # Return the first event created
    return jsonify(event_to_dict(events_created[0])), 201


@app.route("/api/events/<int:event_id>", methods=["PUT"])
@require_staff
def update_event(event_id):
    event = Event.query.get(event_id)
    if not event:
        return json_error("Event not found", 404)

    payload = request.get_json(silent=True) or {}
    
    # Update fields if provided
    if "title" in payload:
        event.title = payload["title"].strip()
    if "description" in payload:
        event.description = payload["description"].strip()
    if "location" in payload:
        event.location = payload["location"].strip()
    if "starts_at" in payload:
        try:
            event.starts_at = datetime.fromisoformat(payload["starts_at"])
        except ValueError:
            return json_error("Invalid start date", 400)
    if "ends_at" in payload:
        try:
            event.ends_at = datetime.fromisoformat(payload["ends_at"])
        except ValueError:
            return json_error("Invalid end date", 400)
    if "price" in payload:
        try:
            event.price = float(payload["price"])
        except ValueError:
            return json_error("Invalid price", 400)
    if "capacity" in payload:
        try:
            event.capacity = int(payload["capacity"])
        except ValueError:
            return json_error("Invalid capacity", 400)
    if "is_free" in payload:
        event.is_free = bool(payload["is_free"])
    if "category_id" in payload:
        try:
            event.category_id = int(payload["category_id"])
        except (ValueError, TypeError):
            pass # Ignore invalid category id type if weird

    db.session.commit()
    return jsonify(event_to_dict(event))


@app.post("/api/auth/register")
def register_user():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    first_name = (payload.get("first_name") or "").strip()
    last_name = (payload.get("last_name") or "").strip()
    phone = (payload.get("phone") or "").strip() or None
    email_opt_in = bool(payload.get("email_opt_in", True))
    sms_opt_in = bool(payload.get("sms_opt_in", False))

    if not email or not password or not first_name or not last_name:
        return json_error("Email, password, first name, and last name are required")

    if User.query.filter_by(email=email).first():
        return json_error("Email already registered", 409)

    user = User(
        email=email,
        password_hash=generate_password_hash(password),
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        email_opt_in=email_opt_in,
        sms_opt_in=sms_opt_in,
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
                "is_staff": bool(user.is_staff),
                "phone": user.phone,
                "email_opt_in": bool(user.email_opt_in),
                "sms_opt_in": bool(user.sms_opt_in),
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
            "is_staff": bool(user.is_staff),
            "phone": user.phone,
            "email_opt_in": bool(user.email_opt_in),
            "sms_opt_in": bool(user.sms_opt_in),
        },
    })


@app.get("/api/user/preferences")
@require_auth
def get_user_preferences(current_user: User):
    return jsonify({
        "phone": current_user.phone,
        "email_opt_in": bool(current_user.email_opt_in),
        "sms_opt_in": bool(current_user.sms_opt_in),
    })


@app.put("/api/user/preferences")
@require_auth
def update_user_preferences(current_user: User):
    payload = request.get_json(silent=True) or {}
    phone = (payload.get("phone") or "").strip() or None
    email_opt_in = payload.get("email_opt_in")
    sms_opt_in = payload.get("sms_opt_in")

    # Basic phone validation
    if phone and not re.match(r'^[\d\s\-\+\(\)]{7,20}$', phone):
        return json_error("Please enter a valid phone number")

    if email_opt_in is not None:
        current_user.email_opt_in = bool(email_opt_in)
    if sms_opt_in is not None:
        current_user.sms_opt_in = bool(sms_opt_in)

    current_user.phone = phone
    db.session.commit()

    return jsonify({
        "phone": current_user.phone,
        "email_opt_in": bool(current_user.email_opt_in),
        "sms_opt_in": bool(current_user.sms_opt_in),
    })


@app.get("/api/bookings/<int:booking_id>/receipt")
@require_auth
def generate_receipt(current_user: User, booking_id: int):
    booking = Booking.query.get(booking_id)
    if not booking:
        return json_error("Booking not found", 404)
    if not current_user.is_staff and booking.user_id != current_user.id:
        return json_error("Unauthorized", 403)

    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", "B", 16)
    pdf.cell(190, 10, "RECEIPT", ln=True, align="C")
    pdf.ln(10)
    pdf.set_font("Arial", "", 12)
    pdf.cell(190, 10, f"Booking ID: {booking.id}", ln=True)
    pdf.cell(190, 10, f"Event: {booking.event.title}", ln=True)
    pdf.cell(190, 10, f"Date: {booking.event.starts_at.strftime('%Y-%m-%d %H:%M')}", ln=True)
    pdf.cell(190, 10, f"Location: {booking.event.location.name if booking.event.location else 'N/A'}", ln=True)
    pdf.cell(190, 10, f"Customer: {current_user.first_name} {current_user.last_name}", ln=True)
    pdf.ln(5)
    
    total_price = float(booking.event.price) * booking.guest_count
    pdf.set_font("Arial", "B", 12)
    pdf.cell(190, 10, f"Total Amount: £{total_price:.2f}", ln=True)
    pdf.set_font("Arial", "I", 10)
    pdf.cell(190, 10, "Thank you for your booking with Delapre Abbey!", ln=True)

    buffer = io.BytesIO()
    pdf.output(buffer)
    buffer.seek(0)
    return Response(
        buffer,
        mimetype="application/pdf",
        headers={"Content-Disposition": f"attachment;filename=receipt_{booking_id}.pdf"}
    )


@app.get("/api/bookings/<int:booking_id>/confirmation")
@require_auth
def generate_confirmation(current_user: User, booking_id: int):
    booking = Booking.query.get(booking_id)
    if not booking:
        return json_error("Booking not found", 404)
    if not current_user.is_staff and booking.user_id != current_user.id:
        return json_error("Unauthorized", 403)

    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", "B", 16)
    pdf.cell(190, 10, "BOOKING CONFIRMATION", ln=True, align="C")
    pdf.ln(10)
    pdf.set_font("Arial", "", 12)
    pdf.cell(190, 10, f"Confirmation Code: {booking.confirmation_code or 'N/A'}", ln=True)
    if booking.confirmation_code:
        qr_buffer = build_confirmation_qr(booking.confirmation_code)
        qr_x = 165
        qr_y = 22
        pdf.image(qr_buffer, type="PNG", x=qr_x, y=qr_y, w=35, h=35)
        pdf.set_xy(10, pdf.get_y())
        pdf.set_font("Arial", "I", 10)
        pdf.multi_cell(140, 6, "Scan this code at check-in.")
        pdf.set_font("Arial", "", 12)
        pdf.ln(2)
    pdf.cell(190, 10, f"Event: {booking.event.title}", ln=True)
    pdf.cell(190, 10, f"Attendee: {current_user.first_name} {current_user.last_name}", ln=True)
    pdf.cell(190, 10, f"Guests: {booking.guest_count}", ln=True)
    pdf.ln(5)
    pdf.multi_cell(190, 10, f"Description: {booking.event.description}")
    pdf.ln(10)
    pdf.set_font("Arial", "B", 12)
    pdf.cell(190, 10, f"Start Time: {booking.event.starts_at.strftime('%Y-%m-%d %H:%M')}", ln=True)
    pdf.cell(190, 10, f"End Time: {booking.event.ends_at.strftime('%Y-%m-%d %H:%M')}", ln=True)
    pdf.ln(10)
    pdf.set_font("Arial", "", 10)
    pdf.multi_cell(190, 10, "Please bring this confirmation with you (digital or printed) to the event. We look forward to seeing you there!")

    pdf_bytes = pdf.output(dest='S')
    if isinstance(pdf_bytes, bytearray):
        pdf_bytes = bytes(pdf_bytes)
    return Response(
        pdf_bytes,
        mimetype="application/pdf",
        headers={"Content-Disposition": f"attachment;filename=confirmation_{booking_id}.pdf"}
    )


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
        confirmation_code=uuid.uuid4().hex[:8].upper()
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
        confirmation_code=uuid.uuid4().hex[:8].upper()
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


@app.get("/api/staff/bookings")
@require_staff
def list_all_bookings(current_user: User):
    bookings = (
        Booking.query.join(Event)
        .order_by(Event.starts_at.desc(), Booking.booked_at.desc())
        .all()
    )
    return jsonify([booking_to_dict(booking) for booking in bookings])


@app.post("/api/staff/checkin")
@require_staff
def staff_checkin(current_user: User):
    payload = request.get_json(silent=True) or {}
    confirmation_code = (payload.get("confirmation_code") or "").strip().upper()
    if not confirmation_code:
        return json_error("Confirmation code is required")

    booking = Booking.query.filter_by(confirmation_code=confirmation_code).first()
    if not booking:
        return json_error("Booking not found", 404)
    if booking.status != "confirmed":
        return json_error("Booking is not confirmed", 409)
    if booking.checked_in:
        return json_error("Booking already checked in", 409)

    booking.checked_in = True
    booking.checked_in_at = datetime.utcnow()
    db.session.commit()
    return jsonify(booking_to_dict(booking))


@app.cli.command("send-reminders")
def send_reminders():
    """Generates TXT notification files for events in the next 24 hours."""
    now = datetime.now()
    tomorrow = now + timedelta(days=1)
    
    # Query pending confirmations in the next 24 hours
    upcoming_bookings = Booking.query.join(Event).filter(
        Event.starts_at >= now,
        Event.starts_at <= tomorrow,
        Booking.status == 'confirmed'
    ).all()
    
    if not upcoming_bookings:
        print("No upcoming events in the next 24 hours.")
        return

    notifications_dir = os.path.join(os.path.dirname(__file__), "notifications")
    if not os.path.exists(notifications_dir):
        os.makedirs(notifications_dir)

    for booking in upcoming_bookings:
        # Determine recipient and opt-in
        if booking.user:
            # Respect user preferences
            if not booking.user.email_opt_in:
                continue
            email = booking.user.email
            name = f"{booking.user.first_name} {booking.user.last_name}"
        else:
            # Guest booking
            email = booking.guest_email
            name = booking.guest_name or "Guest"

        if not email:
            continue

        timestamp = now.strftime("%Y%m%d_%H%M%S")
        filename = f"notification_{booking.id}_{timestamp}.txt"
        filepath = os.path.join(notifications_dir, filename)
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(f"Subject: Reminder: {booking.event.title} is coming up soon!\n\n")
            f.write(f"Hello {name},\n\n")
            f.write(f"This is a reminder that you have a booking for '{booking.event.title}'.\n")
            f.write(f"When: {booking.event.starts_at.strftime('%A, %d %B at %H:%M')}\n")
            f.write(f"Where: {booking.event.location.name if booking.event.location else 'Delapre Abbey'}\n\n")
            f.write("We look forward to seeing you there!\n\n")
            f.write("Best regards,\n")
            f.write("Delapre Abbey Events Team")
            
        print(f"Generated notification for {email}: {filename}")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
