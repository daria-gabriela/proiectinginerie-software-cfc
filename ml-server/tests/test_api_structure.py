import pytest
from main import app, IndexRequest, SearchRequest, ChunkResult
from pydantic import ValidationError

class TestApiStructure:
    def test_app_initialization(self):
        """Test that FastAPI app is initialized correctly"""
        assert app is not None
        # Verify title matches what's defined in main.py
        assert app.title == "StudySync ML Server - Chunk-Centric"

    def test_index_request_model(self):
        """Test IndexRequest pydantic model"""
        req = IndexRequest(
            document_id="test_doc",
            file_path="/path/to/file.pdf",
            space_id="space123"
        )
        assert req.document_id == "test_doc"
        # Check default value
        assert req.max_tokens == 400

    def test_search_request_model(self):
        """Test SearchRequest pydantic model"""
        req = SearchRequest(
            query="test query",
            space_id="space123",
            top_k=5
        )
        assert req.query == "test query"
        # Check default values
        assert req.include_images is True

class TestInputValidation:
    def test_valid_index_request(self):
        """Test valid index request creation"""
        valid_request = IndexRequest(
            document_id="doc1",
            file_path="/path/file.pdf",
            space_id="space1"
        )
        assert valid_request.document_id == "doc1"

    def test_search_request_defaults(self):
        """Test search request default values"""
        search_req = SearchRequest(
            query="test",
            space_id="space1"
        )
        # We updated the default top_k to 10 in the recent merge
        assert search_req.top_k == 10
        assert search_req.include_images is True

    def test_custom_max_tokens(self):
        """Test custom max_tokens validation"""
        custom_tokens = IndexRequest(
            document_id="doc2",
            file_path="/path/file.pdf",
            space_id="space1",
            max_tokens=800
        )
        assert custom_tokens.max_tokens == 800
