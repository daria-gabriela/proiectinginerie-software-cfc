# User Stories

## User Authentication & Profile
* **As a** student, **I want** to sign up for an account, **so that** I can secure my documents and study spaces.
* **As a** student, **I want** to log in to the app, **so that** I can access my study materials.
* **As a** student, **I want** to reset my password if I forget it, **so that** I can regain access to my account.

## Document & Workspace Management
* **As a** student, **I want** to create a "Study Space" (e.g., "CS 330: Algorithms"), **so that** I can organize all my materials for a specific course.
* **As a** student, **I want** to upload documents (PDF, .txt, .md, .docx) to a Study Space, **so that** the AI can index them for search.
* **As a** student, **I want** to see a list of all documents I've uploaded in a Study Space, **so that** I can manage my files.
* **As a** student, **I want** to open and view an uploaded document (e.g., in a PDF.js viewer) within the app, **so that** I can read its contents and add comments.
* **As a** student, **I want** to delete a document I uploaded, **so that** I can remove outdated or irrelevant information.
* **As a** student, **I want** to invite other students to my Study Space via a shareable link or email, **so that** we can study and share documents together.
* **As a** student (space owner), **I want** to remove a member from my Study Space, **so that** I can manage access.

## AI Passage Finder (Core RAG Tool)
* **As a** student, **I want** to see a dedicated "Passage Finder" search bar within my Study Space, **so that** I can input exam questions or topics.
* **As a** student, **I want** to submit a query and get a list of relevant passages from my documents, **so that** I can find the best sections to study.
* **As a** student, **I want** the search results to be sorted by relevance, **so that** I can focus on the most important passages first.
* **As a** student, **I want** to see which document (and page number) each passage came from, **so that** I can identify the source.
* **As a** student, **I want** to click a "Go to reference" link on a search result, **so that** I can navigate directly to that part of the original document for more context.
* **As a** student, **I want** all members of a shared Study Space to see the same results for the same query, **so that** we are all "on the same page."

## General AI Chatbot (Separate Tool)
* **As a** student, **I want** to open a "General AI Chat" panel, **so that** I can ask general knowledge or study-related questions.
* **As a** student, **I want** this chat to be separate from my document search, **so that** I know its answers are general and not from my specific course files.
* **As a** student, **I want** to type a question (e.g., "Explain what a hash map is in simple terms") and receive a text-based answer, **so that** I can get help with concepts.
* **As a** student, **I want** to be able to copy the chatbot's response, **so that** I can paste it into my notes or into the document comments.

## Collaboration (Contextual Comments)
* **As a** student, **I want** to see a list of members in my Study Space, **so that** I know who I am sharing information with.
* **As a** student, (while viewing a document), **I want** to highlight a piece of text and add a comment, **so that** I can ask a question or leave a note on that specific section (Notion-style).
* **As a** student, **I want** to be able to @-mention another member of the Study Space in a comment, **so that** I can get their attention.
* **As a** student, **I want** to see all comment threads for a document, **so that** I can review the discussion.
* **As a** student, (while viewing "Passage Finder" results), **I want** to leave a comment on a *specific passage* in the results list, **so that** I can ask my group "Is this what we're looking for?"

## **Notes:**
* We are planning to use **Notion** to manage tasks within our stories across the development process.
* Currently all user stories have their own **GitHub Issue** custom labeled as **user story**.
* Each one has a few tasks written down inside their respective issue
* This should be expanded upon in Notion and might recieve in the near future a more organized **GitHub Projects** page where each task is tracked by their respective user story.
