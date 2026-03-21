import requests

BASE_URL = "http://127.0.0.1:8000"

def test_auth_flow():
    # 1. Register a user
    print("Registering user...")
    resp = requests.post(f"{BASE_URL}/auth/register", json={
        "email": "test_final@example.com",
        "password": "password123"
    })
    print(f"Register: {resp.status_code}, {resp.json()}")

    # 2. Login
    print("\nLogging in...")
    resp = requests.post(f"{BASE_URL}/auth/login", data={
        "username": "test_final@example.com",
        "password": "password123"
    })
    print(f"Login: {resp.status_code}, {resp.json()}")
    token = resp.json().get("access_token")

    # 3. Test secured endpoint
    print("\nFetching jobs with token...")
    resp = requests.get(f"{BASE_URL}/jobs", headers={"Authorization": f"Bearer {token}"})
    print(f"List Jobs: {resp.status_code}, Length: {len(resp.json())}")

    # 4. Try without token
    print("\nFetching jobs WITHOUT token...")
    resp = requests.get(f"{BASE_URL}/jobs")
    print(f"List Jobs (No Token): {resp.status_code}, {resp.json()}")

if __name__ == "__main__":
    test_auth_flow()
