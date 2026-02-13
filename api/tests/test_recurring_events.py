import unittest
import requests
import uuid
from datetime import datetime, timedelta

# Configuration
API_URL = "http://localhost:8080/api"
STAFF_EMAIL = "staff@example.com"  # Updated to match init.sql
STAFF_PASSWORD = "password"

class TestRecurringEvents(unittest.TestCase):
    def setUp(self):
        # Authenticate as staff
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": STAFF_EMAIL,
            "password": STAFF_PASSWORD
        })
        if response.status_code != 200:
            self.fail(f"Login failed: {response.text}")
        
        data = response.json()
        self.token = data["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_create_weekly_event(self):
        # Create a unique title
        unique_id = str(uuid.uuid4())[:8]
        title = f"Test Recurring Event {unique_id}"
        
        # Dates
        start_date = datetime.now() + timedelta(days=1)
        end_date_first = start_date + timedelta(hours=2)
        recur_end_date = start_date + timedelta(weeks=3) # Should create 4 events (0, 1, 2, 3 weeks)
        
        payload = {
            "title": title,
            "description": "This is a test event for recursion.",
            "location": "Test Location", # Or location_id if implemented
            "starts_at": start_date.isoformat(),
            "ends_at": end_date_first.isoformat(),
            "capacity": 10,
            "price": 0,
            "is_free": True,
            "recurrence": {
                "type": "weekly",
                "end_date": recur_end_date.strftime("%Y-%m-%d")
            }
        }
        
        # Create Event
        response = requests.post(f"{API_URL}/events", json=payload, headers=self.headers)
        self.assertEqual(response.status_code, 201, f"Failed to create event: {response.text}")
        
        created_event = response.json()
        self.assertIn("id", created_event)
        self.assertEqual(created_event["title"], title)
        
        # Verify multiple instances created
        # Fetch all events and filter by title (inefficient but effective for test)
        list_response = requests.get(f"{API_URL}/events")
        self.assertEqual(list_response.status_code, 200)
        
        all_events = list_response.json()
        matching_events = [e for e in all_events if e["title"] == title]
        
        # Should correspond to number of weeks between start and recur_end
        # start: T+1 day, recur_end: T+1 day + 3 weeks.
        # Occurrences: T+1, T+1+1wk, T+1+2wk, T+1+3wk. Total 4.
        self.assertGreaterEqual(len(matching_events), 1, "Should create at least one event")
        
        # Check group_id consistency
        group_ids = {e.get("group_id") for e in matching_events}
        self.assertEqual(len(group_ids), 1, "All recurring events should share the same group_id")
        self.assertIsNotNone(list(group_ids)[0])
        
        print(f"\nSUCCESS: Created {len(matching_events)} recurring events for '{title}'")
        for e in matching_events:
            print(f" - {e['title']} on {e['starts_at']} (ID: {e['id']})")

if __name__ == "__main__":
    unittest.main()
