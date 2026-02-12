CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(120) NOT NULL,
  last_name VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  location VARCHAR(255) NOT NULL,
  is_free TINYINT(1) NOT NULL DEFAULT 1,
  price DECIMAL(10, 2) UNSIGNED NOT NULL DEFAULT 0.00,
  capacity INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_events_starts_at (starts_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  status ENUM('confirmed','cancelled') NOT NULL DEFAULT 'confirmed',
  guest_count INT UNSIGNED NOT NULL DEFAULT 1,
  guest_names TEXT NULL,
  booked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_bookings_user_event (user_id, event_id),
  KEY idx_bookings_user (user_id),
  KEY idx_bookings_event (event_id),
  CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO events (title, description, starts_at, ends_at, location, is_free, price, capacity)
VALUES
  ('Abbey Gardens Tour', 'Guided tour of the historic gardens.', '2026-03-01 10:00:00', '2026-03-01 11:30:00', 'Delapre Abbey Gardens', 1, 0.00, 30),
  ('Family Craft Morning', 'Family friendly craft activities in the visitor center.', '2026-03-05 10:00:00', '2026-03-05 12:00:00', 'Visitor Center', 1, 0.00, 40),
  ('Local History Talk', 'Talk on the history of Delapre Abbey.', '2026-03-12 18:30:00', '2026-03-12 20:00:00', 'Main Hall', 1, 0.00, 80),
  ('Photography Workshop', 'Learn professional photography techniques in the Abbey grounds.', '2026-03-08 09:00:00', '2026-03-08 13:00:00', 'Delapre Abbey Gardens', 0, 15.00, 12),
  ('Afternoon Tea Experience', 'Traditional afternoon tea served in the historic dining room.', '2026-03-15 14:00:00', '2026-03-15 16:00:00', 'Abbey Dining Room', 0, 22.50, 20),
  ('Medieval History Tour', 'In-depth guided tour exploring the Abbey\'s medieval past.', '2026-03-18 10:30:00', '2026-03-18 12:30:00', 'Main Hall', 0, 10.00, 25),
  ('Watercolour Painting Class', 'Beginner-friendly painting class with all materials provided.', '2026-03-22 10:00:00', '2026-03-22 15:00:00', 'Studio Room', 0, 28.00, 15),
  ('Ghost Stories Evening', 'Spine-tingling tales of the Abbey\'s haunted history.', '2026-03-25 19:00:00', '2026-03-25 21:00:00', 'Main Hall', 0, 12.00, 50),
  ('Garden Design Workshop', 'Expert guidance on creating your own heritage-style garden.', '2026-03-29 13:00:00', '2026-03-29 17:00:00', 'Visitor Center', 0, 30.00, 18),
  ('Family Nature Walk', 'Explore local wildlife with our naturalist guide.', '2026-04-02 10:00:00', '2026-04-02 12:00:00', 'Delapre Abbey Gardens', 1, 0.00, 35),
  ('Calligraphy Workshop', 'Learn the art of beautiful handwriting and illumination.', '2026-04-05 14:00:00', '2026-04-05 17:00:00', 'Studio Room', 0, 18.50, 10);
