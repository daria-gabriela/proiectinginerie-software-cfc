# Development Setup

Follow these steps to set up the project locally for development.

### Prerequisites
- **Java 17+** (for Backend)
- **Node.js 18+ & npm** (for Frontend)
- **Python 3.12+** (for ML Server)
- **Conda** (for ML Server)
- **MongoDB** running locally or online (the free tier from MongoDB Atlas is the simplest way to set up, ask the team lead for the connection string if you don't have your own).
- **LibreOffice** (for DOCX/PPTX to PDF conversion)
  - macOS: `brew install --cask libreoffice`
  - Windows: Download from [libreoffice.org](https://www.libreoffice.org/download/)
  - Linux: `sudo apt install libreoffice`
  
  > **Note:** LibreOffice is used in headless mode to convert Office documents to PDF for the document viewer. The app will work without it, but uploaded DOCX/PPTX files won't be viewable in the browser.

### 1. Database
Ensure MongoDB is running locally or that you fill in the `MONGODB_URI` environment variable in the backend's `application.properties` file (the free tier from MongoDB Atlas is the simplest way to set up, ask the team lead for the connection string if you don't have your own).

You would only need to create a `.env` file in the root directory of the backend with the following content:

```.env
MONGODB_URI=mongodb://localhost:27017/studysync (or your own connection string)
JWT_SECRET=your-secret-key
```

This is necessary for the backend to connect to the database.

### 2. Backend (Spring Boot)
Located in `studysync-backend/`.
```bash
cd studysync-backend
mvn spring-boot:run
```
*Server runs on: `http://localhost:8080`*

Make sure you have the path to your Java installation added to your PATH environment variable.

Example on macOS (with Homebrew):

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export PATH=$PATH:$JAVA_HOME/bin
```

### 3. ML Server (FastAPI)
Located in `ml-server/`. Uses `conda` or `venv` is recommended.
```bash
cd ml-server
# Create/Activate environment
conda create -n studysync-ml python=3.12.11 -y
conda activate studysync-ml

# Install dependencies
pip install -r requirements.txt

# Run server
cd proiect-inginerie-software-cfc/ml-server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
*Server runs on: `http://localhost:8000`*

### 4. Frontend (Angular)
Located in `studysync-frontend/`.
```bash
cd studysync-frontend
npm install
npm start
```
*App runs on: `http://localhost:4200`*

### Architecture Overview
*   **Web App**: Angular client connecting to Java Backend.
*   **Backend**: Spring Boot handling logic, auth, and DB interactions.
*   **ML Server**: Python service for "heavy lifting" — parsing PDFs, chunking documents, and AI search (RAG).
*   **Communication**: Backend forward search/index requests to ML Server via HTTP.




