# Diagrame de Arhitectură - StudySync AI

Acest document conține diagramele UML și de arhitectură ale proiectului StudySync AI.

## 1. Diagrama de Arhitectură (C4 - Container Level)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              StudySync AI System                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        │                               │                               │
        ▼                               ▼                               ▼
┌───────────────────┐         ┌───────────────────┐         ┌───────────────────┐
│                   │         │                   │         │                   │
│   Angular SPA     │◄───────►│  Spring Boot API  │◄───────►│   FastAPI ML      │
│   (Frontend)      │  HTTP   │   (Backend)       │  HTTP   │   Server          │
│                   │         │                   │         │                   │
│  - Components     │         │  - REST API       │         │  - RAG Pipeline   │
│  - Services       │         │  - Auth (JWT)     │         │  - Vector Search  │
│  - Routing        │         │  - WebSocket      │         │  - PDF Parser     │
│                   │         │  - Business Logic │         │  - Embeddings     │
│                   │         │                   │         │                   │
│   Port: 4200      │         │   Port: 8080      │         │   Port: 8000      │
└───────────────────┘         └───────────────────┘         └───────────────────┘
                                        │
                                        ▼
                              ┌───────────────────┐
                              │                   │
                              │     MongoDB       │
                              │   (Database)      │
                              │                   │
                              │  - Users          │
                              │  - Documents      │
                              │  - StudySpaces    │
                              │  - Comments       │
                              │  - ChatMessages   │
                              │                   │
                              │   Port: 27017     │
                              └───────────────────┘
```

## 2. Diagrama de Clase - Backend Services

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Backend Services Layer                              │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐     ┌─────────────────────────┐
│  AuthenticationService  │     │    StudySpaceService    │
├─────────────────────────┤     ├─────────────────────────┤
│ - userRepository        │     │ - spaceRepository       │
│ - passwordEncoder       │     │ - membershipRepository  │
│ - jwtUtils              │     │ - userRepository        │
├─────────────────────────┤     ├─────────────────────────┤
│ + register(dto)         │     │ + createSpace(dto)      │
│ + login(dto)            │     │ + getSpacesForUser()    │
│                         │     │ + joinSpace(code)       │
│                         │     │ + deleteSpace(id)       │
│                         │     │ + removeMember(id, uid) │
└─────────────────────────┘     └─────────────────────────┘
            │                               │
            └───────────────┬───────────────┘
                            │
                            ▼
            ┌─────────────────────────────────┐
            │       SecurityUtils             │
            ├─────────────────────────────────┤
            │ + getCurrentUserId(): String    │
            │ + getCurrentUser(): UserDetails │
            └─────────────────────────────────┘

┌─────────────────────────┐     ┌─────────────────────────┐
│ DocumentManagementSvc   │     │    RAGSearchService     │
├─────────────────────────┤     ├─────────────────────────┤
│ - documentRepository    │     │ - webClientBuilder      │
│ - ragSearchService      │     │ - documentRepository    │
│ - fileConversionService │     │ - ragServerUrl          │
├─────────────────────────┤     ├─────────────────────────┤
│ + uploadDocument(...)   │────►│ + indexDocument(...)    │
│ + deleteDocument(id)    │────►│ + search(query, ...)    │
│ + executeIndexing(...)  │     │ + deleteDocument(id)    │
│ + getDocuments(spaceId) │     │ + getDocumentChunks(id) │
└─────────────────────────┘     │ + renderPage(...)       │
                                └─────────────────────────┘

┌─────────────────────────┐     ┌─────────────────────────┐
│      ChatService        │     │     CommentService      │
├─────────────────────────┤     ├─────────────────────────┤
│ - chatMessageRepository │     │ - commentRepository     │
│ - membershipRepository  │     │ - membershipRepository  │
│ - webSocketService      │     │ - webSocketService      │
├─────────────────────────┤     ├─────────────────────────┤
│ + getMessages(spaceId)  │     │ + createComment(...)    │
│ + sendMessage(...)      │     │ + updateComment(...)    │
│                         │     │ + deleteComment(id)     │
│                         │     │ + extractMentions(text) │
└─────────────────────────┘     └─────────────────────────┘
            │                               │
            └───────────────┬───────────────┘
                            │
                            ▼
            ┌─────────────────────────────────┐
            │       WebSocketService          │
            ├─────────────────────────────────┤
            │ + sendChatMessage(event)        │
            │ + sendCommentEvent(event)       │
            │ + broadcastToSpace(spaceId,msg) │
            └─────────────────────────────────┘
```

## 3. Diagrama de Clase - ML Server

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              ML Server Components                                │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐     ┌─────────────────────────┐
│        Chunk            │     │       ChunkStore        │
├─────────────────────────┤     ├─────────────────────────┤
│ - text: str             │     │ - chunks: Dict[str,     │
│ - document_id: str      │◄────│     List[Chunk]]        │
│ - page: int             │     ├─────────────────────────┤
│ - embedding: List[float]│     │ + add_chunks(doc_id,    │
│ - bounds: Dict          │     │     chunks)             │
├─────────────────────────┤     │ + get_chunks(doc_id)    │
│ + to_dict()             │     │ + delete_document(id)   │
└─────────────────────────┘     │ + get_all_for_space()   │
                                └─────────────────────────┘

┌─────────────────────────┐     ┌─────────────────────────┐
│     VectorSearch        │     │    UnifiedParser        │
├─────────────────────────┤     ├─────────────────────────┤
│ - model: SentenceTransf │     │                         │
│ - cross_encoder         │     ├─────────────────────────┤
├─────────────────────────┤     │ + parse_document(path)  │
│ + encode_chunks(chunks) │     │ + extract_text_pdf()    │
│ + search(query, chunks, │     │ + extract_text_docx()   │
│     top_k)              │     │ + extract_text_txt()    │
│ + cosine_similarity()   │     │ + chunk_text(text,      │
└─────────────────────────┘     │     max_tokens)         │
            │                   └─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│    rerank_chunks()      │
├─────────────────────────┤
│ Cross-encoder reranking │
│ pentru rezultate mai    │
│ precise                 │
└─────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FastAPI Endpoints                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│  POST /index     - Indexează un document (parsare + embeddings)                 │
│  POST /search    - Căutare semantică în chunks                                  │
│  GET  /chunks/{doc_id} - Returnează toate chunks-urile unui document            │
│  DELETE /documents/{doc_id} - Șterge un document din index                      │
│  POST /render    - Renderizează o pagină PDF ca imagine                         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 4. Diagrama de Secvență - Flux de Căutare RAG

```
┌────────┐     ┌────────────┐     ┌────────────┐     ┌──────────┐     ┌─────────┐
│  User  │     │  Angular   │     │Spring Boot │     │  FastAPI │     │ MongoDB │
│        │     │  Frontend  │     │  Backend   │     │ ML Server│     │         │
└───┬────┘     └─────┬──────┘     └─────┬──────┘     └────┬─────┘     └────┬────┘
    │                │                  │                 │                │
    │ 1. Enter query │                  │                 │                │
    │───────────────►│                  │                 │                │
    │                │                  │                 │                │
    │                │ 2. POST /search  │                 │                │
    │                │─────────────────►│                 │                │
    │                │                  │                 │                │
    │                │                  │ 3. Validate JWT │                │
    │                │                  │────────────────►│                │
    │                │                  │                 │                │
    │                │                  │ 4. Check membership              │
    │                │                  │────────────────────────────────►│
    │                │                  │◄────────────────────────────────│
    │                │                  │                 │                │
    │                │                  │ 5. POST /search │                │
    │                │                  │────────────────►│                │
    │                │                  │                 │                │
    │                │                  │                 │ 6. Encode query│
    │                │                  │                 │───────┐        │
    │                │                  │                 │◄──────┘        │
    │                │                  │                 │                │
    │                │                  │                 │ 7. Vector      │
    │                │                  │                 │    Search      │
    │                │                  │                 │───────┐        │
    │                │                  │                 │◄──────┘        │
    │                │                  │                 │                │
    │                │                  │                 │ 8. Cross-enc   │
    │                │                  │                 │    Reranking   │
    │                │                  │                 │───────┐        │
    │                │                  │                 │◄──────┘        │
    │                │                  │                 │                │
    │                │                  │ 9. Ranked results               │
    │                │                  │◄────────────────│                │
    │                │                  │                 │                │
    │                │                  │ 10. Get doc filenames            │
    │                │                  │────────────────────────────────►│
    │                │                  │◄────────────────────────────────│
    │                │                  │                 │                │
    │                │ 11. PassageDTO[] │                 │                │
    │                │◄─────────────────│                 │                │
    │                │                  │                 │                │
    │ 12. Display    │                  │                 │                │
    │    results     │                  │                 │                │
    │◄───────────────│                  │                 │                │
    │                │                  │                 │                │
```

## 5. Diagrama de Secvență - Upload și Indexare Document

```
┌────────┐     ┌────────────┐     ┌────────────┐     ┌──────────┐     ┌─────────┐
│  User  │     │  Angular   │     │Spring Boot │     │  FastAPI │     │ MongoDB │
│        │     │  Frontend  │     │  Backend   │     │ ML Server│     │         │
└───┬────┘     └─────┬──────┘     └─────┬──────┘     └────┬─────┘     └────┬────┘
    │                │                  │                 │                │
    │ 1. Select file │                  │                 │                │
    │───────────────►│                  │                 │                │
    │                │                  │                 │                │
    │                │ 2. POST /documents│                │                │
    │                │  (multipart/form) │                │                │
    │                │─────────────────►│                 │                │
    │                │                  │                 │                │
    │                │                  │ 3. Save metadata│                │
    │                │                  │────────────────────────────────►│
    │                │                  │◄────────────────────────────────│
    │                │                  │                 │                │
    │                │                  │ 4. Save file to │                │
    │                │                  │    disk         │                │
    │                │                  │───────┐         │                │
    │                │                  │◄──────┘         │                │
    │                │                  │                 │                │
    │                │                  │ 5. Async:       │                │
    │                │                  │   POST /index   │                │
    │                │                  │────────────────►│                │
    │                │                  │                 │                │
    │                │ 6. Document (    │                 │                │
    │                │    indexed=false)│                 │                │
    │                │◄─────────────────│                 │                │
    │                │                  │                 │                │
    │ 7. Show        │                  │                 │ 8. Parse PDF   │
    │   "Indexing..."│                  │                 │───────┐        │
    │◄───────────────│                  │                 │◄──────┘        │
    │                │                  │                 │                │
    │                │                  │                 │ 9. Create      │
    │                │                  │                 │    Chunks      │
    │                │                  │                 │───────┐        │
    │                │                  │                 │◄──────┘        │
    │                │                  │                 │                │
    │                │                  │                 │ 10. Generate   │
    │                │                  │                 │    Embeddings  │
    │                │                  │                 │───────┐        │
    │                │                  │                 │◄──────┘        │
    │                │                  │                 │                │
    │                │                  │ 11. Success +   │                │
    │                │                  │    chunk_count  │                │
    │                │                  │◄────────────────│                │
    │                │                  │                 │                │
    │                │                  │ 12. Update      │                │
    │                │                  │   indexed=true  │                │
    │                │                  │────────────────────────────────►│
    │                │                  │                 │                │
    │                │ 13. WebSocket:   │                 │                │
    │                │   document_updated                 │                │
    │                │◄─────────────────│                 │                │
    │                │                  │                 │                │
    │ 14. Update UI  │                  │                 │                │
    │   (indexed)    │                  │                 │                │
    │◄───────────────│                  │                 │                │
```

## 6. Diagrama Entitate-Relație (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              MongoDB Collections                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────┐         ┌───────────────────┐
│       User        │         │    StudySpace     │
├───────────────────┤         ├───────────────────┤
│ _id: ObjectId     │         │ _id: ObjectId     │
│ email: String     │◄───────►│ name: String      │
│ password: String  │  owns   │ description: Str  │
│ firstName: String │         │ ownerUserId: Str  │
│ lastName: String  │         │ inviteCode: String│
│ role: Enum        │         │ createdAt: Date   │
│ createdAt: Date   │         └─────────┬─────────┘
└─────────┬─────────┘                   │
          │                             │
          │                             │
          │         ┌───────────────────┴───────────────────┐
          │         │                                       │
          │         ▼                                       ▼
          │  ┌───────────────────┐                 ┌───────────────────┐
          │  │ SpaceMembership   │                 │   StudyDocument   │
          │  ├───────────────────┤                 ├───────────────────┤
          │  │ _id: ObjectId     │                 │ _id: ObjectId     │
          └──│ userId: String    │                 │ spaceId: String   │
             │ spaceId: String   │                 │ originalFilename  │
             │ role: Enum        │                 │ contentType: Str  │
             │ joinedAt: Date    │                 │ fileSize: Long    │
             └───────────────────┘                 │ indexed: Boolean  │
                                                   │ chunkCount: Int   │
                                                   │ uploadedBy: Str   │
                                                   │ createdAt: Date   │
                                                   └─────────┬─────────┘
                                                             │
                    ┌────────────────────────────────────────┤
                    │                                        │
                    ▼                                        ▼
          ┌───────────────────┐                   ┌───────────────────┐
          │     Comment       │                   │   ChatMessage     │
          ├───────────────────┤                   ├───────────────────┤
          │ _id: ObjectId     │                   │ _id: ObjectId     │
          │ spaceId: String   │                   │ spaceId: String   │
          │ documentId: Str   │                   │ authorUserId: Str │
          │ chunkId: String   │                   │ content: String   │
          │ pageNumber: Int   │                   │ createdAt: Date   │
          │ selectedText: Str │                   └───────────────────┘
          │ authorUserId: Str │
          │ content: String   │
          │ mentions: [String]│
          │ createdAt: Date   │
          └───────────────────┘
```

## 7. Diagrama de Componente - Frontend Angular

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            Angular Application                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   Pages                                          │
├────────────────────┬────────────────────┬────────────────────┬──────────────────┤
│    LoginPage       │   RegisterPage     │    DashboardPage   │  SpaceDetailPage │
│                    │                    │                    │                  │
│  - Login form      │  - Register form   │  - Space list      │  - Documents     │
│  - Auth redirect   │  - Validation      │  - Create space    │  - Search panel  │
│                    │                    │  - Join space      │  - Chat panel    │
│                    │                    │                    │  - Members       │
└────────────────────┴────────────────────┴────────────────────┴──────────────────┘
            │                    │                    │                 │
            └────────────────────┴────────────────────┴─────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 Components                                       │
├────────────────────────────────────┬────────────────────────────────────────────┤
│         DocumentViewer             │           ToastContainer                   │
│                                    │                                            │
│  - PDF rendering                   │  - Notifications                           │
│  - Page navigation                 │  - Success/Error messages                  │
│  - Study mode (chunks)             │                                            │
│  - Comment overlay                 │                                            │
└────────────────────────────────────┴────────────────────────────────────────────┘
            │                                        │
            └────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 Services                                         │
├───────────────┬───────────────┬───────────────┬───────────────┬────────────────┤
│ AuthService   │ SpaceService  │DocumentService│ SearchService │  ChatService   │
├───────────────┼───────────────┼───────────────┼───────────────┼────────────────┤
│ - login()     │ - getSpaces() │ - upload()    │ - search()    │ - getMessages()│
│ - register()  │ - create()    │ - download()  │               │ - sendMessage()│
│ - logout()    │ - join()      │ - delete()    │               │                │
│ - getUser()   │ - leave()     │ - settings()  │               │                │
└───────────────┴───────────────┴───────────────┴───────────────┴────────────────┘
            │               │               │               │                │
            └───────────────┴───────────────┴───────────────┴────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  Core                                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│  - HTTP Interceptor (JWT token injection)                                        │
│  - Auth Guard (route protection)                                                 │
│  - Theme Service (dark/light mode)                                               │
│  - WebSocket Service (real-time updates)                                         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 8. Diagrama de Deployment

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Production Environment                              │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  Client Tier                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│  │     Browser     │  │     Browser     │  │     Browser     │                  │
│  │   (Chrome)      │  │   (Firefox)     │  │   (Safari)      │                  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘                  │
└───────────┼────────────────────┼────────────────────┼────────────────────────────┘
            │                    │                    │
            └────────────────────┼────────────────────┘
                                 │ HTTPS
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                Application Tier                                  │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         Nginx Reverse Proxy                              │    │
│  │                    (SSL Termination, Load Balancing)                     │    │
│  └───────────────────────────────┬─────────────────────────────────────────┘    │
│                                  │                                               │
│          ┌───────────────────────┼───────────────────────┐                      │
│          │                       │                       │                      │
│          ▼                       ▼                       ▼                      │
│  ┌───────────────┐      ┌───────────────┐      ┌───────────────┐               │
│  │   Angular     │      │  Spring Boot  │      │    FastAPI    │               │
│  │   Static      │      │    API        │      │   ML Server   │               │
│  │   Files       │      │               │      │               │               │
│  │               │      │  - REST API   │      │  - RAG        │               │
│  │  nginx:80     │      │  - WebSocket  │      │  - Embeddings │               │
│  │  /app         │      │  - JWT Auth   │      │  - PDF Parse  │               │
│  │               │      │               │      │               │               │
│  │               │      │  :8080        │      │  :8000        │               │
│  └───────────────┘      └───────┬───────┘      └───────────────┘               │
│                                 │                                               │
└─────────────────────────────────┼───────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  Data Tier                                       │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                          MongoDB Atlas                                   │    │
│  │                    (Managed Cloud Database)                              │    │
│  │                                                                          │    │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                     │    │
│  │   │   Primary   │  │  Secondary  │  │  Secondary  │  (Replica Set)      │    │
│  │   │   Node      │  │   Node      │  │   Node      │                     │    │
│  │   └─────────────┘  └─────────────┘  └─────────────┘                     │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         File Storage                                     │    │
│  │                    (Local / Cloud Storage)                               │    │
│  │                                                                          │    │
│  │   - Uploaded PDFs, DOCX files                                           │    │
│  │   - Temporary processing files                                          │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 9. Use Case Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              StudySync AI - Use Cases                            │
└─────────────────────────────────────────────────────────────────────────────────┘

                          ┌─────────────────────────────────┐
                          │        StudySync System          │
    ┌──────────┐          │                                 │
    │          │          │  ┌───────────────────────────┐  │
    │ Student  │─────────►│  │   Register / Login        │  │
    │          │          │  └───────────────────────────┘  │
    │  (User)  │          │                                 │
    │          │─────────►│  ┌───────────────────────────┐  │
    │          │          │  │   Create Study Space      │  │
    │          │          │  └───────────────────────────┘  │
    │          │          │                                 │
    │          │─────────►│  ┌───────────────────────────┐  │
    │          │          │  │   Join Space (invite code)│  │
    │          │          │  └───────────────────────────┘  │
    │          │          │                                 │
    │          │─────────►│  ┌───────────────────────────┐  │
    │          │          │  │   Upload Document         │──┼──► <<include>>
    │          │          │  └───────────────────────────┘  │    Index Document
    │          │          │                                 │
    │          │─────────►│  ┌───────────────────────────┐  │
    │          │          │  │   Search Passages (RAG)   │  │
    │          │          │  └───────────────────────────┘  │
    │          │          │                                 │
    │          │─────────►│  ┌───────────────────────────┐  │
    │          │          │  │   View Document           │  │
    │          │          │  └───────────────────────────┘  │
    │          │          │                                 │
    │          │─────────►│  ┌───────────────────────────┐  │
    │          │          │  │   Add Comment on Chunk    │  │
    │          │          │  └───────────────────────────┘  │
    │          │          │                                 │
    │          │─────────►│  ┌───────────────────────────┐  │
    │          │          │  │   Chat with Group         │  │
    │          │          │  └───────────────────────────┘  │
    │          │          │                                 │
    │          │─────────►│  ┌───────────────────────────┐  │
    │          │          │  │   @Mention Team Members   │  │
    └──────────┘          │  └───────────────────────────┘  │
                          │                                 │
    ┌──────────┐          │  ┌───────────────────────────┐  │
    │  Space   │─────────►│  │   Remove Members          │  │
    │  Owner   │          │  └───────────────────────────┘  │
    │          │          │                                 │
    │          │─────────►│  ┌───────────────────────────┐  │
    │          │          │  │   Delete Space            │  │
    └──────────┘          │  └───────────────────────────┘  │
                          │                                 │
                          └─────────────────────────────────┘
```

## 10. State Diagram - Document Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Document State Machine                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌───────────┐
                              │   START   │
                              └─────┬─────┘
                                    │
                                    │ upload()
                                    ▼
                           ┌─────────────────┐
                           │    UPLOADED     │
                           │  (indexed=false)│
                           └────────┬────────┘
                                    │
                                    │ executeIndexing()
                                    ▼
                           ┌─────────────────┐
                           │   INDEXING      │
                           │  (processing)   │
                           └────────┬────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    │ success                       │ failure
                    ▼                               ▼
           ┌─────────────────┐             ┌─────────────────┐
           │    INDEXED      │             │     FAILED      │
           │  (indexed=true) │             │ (error message) │
           └────────┬────────┘             └────────┬────────┘
                    │                               │
                    │ updateSettings()              │ retry()
                    │ (re-index)                    │
                    ▼                               │
           ┌─────────────────┐                     │
           │  RE-INDEXING    │◄────────────────────┘
           │ (delete old     │
           │  chunks, reparse│
           └────────┬────────┘
                    │
                    │
                    ▼
           ┌─────────────────┐
           │    INDEXED      │
           │  (new chunks)   │
           └────────┬────────┘
                    │
                    │ delete()
                    ▼
           ┌─────────────────┐
           │    DELETED      │
           │  (removed from  │
           │   storage)      │
           └─────────────────┘
```
