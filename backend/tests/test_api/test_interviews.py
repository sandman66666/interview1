import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.base import Base, engine

# Create test client
client = TestClient(app)

def setup_module():
    """Create tables before tests"""
    Base.metadata.create_all(bind=engine)

def teardown_module():
    """Drop tables after tests"""
    Base.metadata.drop_all(bind=engine)

def test_create_interview():
    """Test creating a new interview"""
    response = client.post("/api/v1/interviews/")
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["status"] == "pending"
    assert "created_at" in data
    assert "updated_at" in data
    return data["id"]

def test_get_interview():
    """Test retrieving an interview"""
    # First create an interview
    create_response = client.post("/api/v1/interviews/")
    interview_id = create_response.json()["id"]
    
    # Then get it
    response = client.get(f"/api/v1/interviews/{interview_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == interview_id
    assert data["status"] == "pending"

def test_get_nonexistent_interview():
    """Test retrieving a non-existent interview"""
    response = client.get("/api/v1/interviews/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404

def test_update_interview():
    """Test updating an interview status"""
    # First create an interview
    create_response = client.post("/api/v1/interviews/")
    interview_id = create_response.json()["id"]
    
    # Update its status
    update_data = {"status": "in_progress"}
    response = client.put(f"/api/v1/interviews/{interview_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "in_progress"