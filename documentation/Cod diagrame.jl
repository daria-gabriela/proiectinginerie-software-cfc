Cod diagrame
1. System Context Diagram
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml

title System Context Diagram for StudySync AI

Person(student, "Student", "A user who uploads documents, creates study spaces, and searches for information.")

System(studysync, "StudySync AI", "Allows users to manage study spaces, upload documents, and perform AI-powered searches (RAG).")

System_Ext(email_system, "E-mail System", "External e-mail provider for sending invitations and password resets.")

Rel(student, studysync, "Uses", "HTTPS")
Rel(studysync, email_system, "Sends e-mails using", "SMTP")
@enduml

2. Container Diagram
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml

title Container Diagram for StudySync AI

Person(student, "Student", "A user who uploads documents and studies.")

System_Boundary(c1, "StudySync AI") {
    Container(web_app, "Web Application", "Angular", "Delivers the static content and the SPA for users to interact with.")
    Container(api_app, "API Application", "Java, Spring Boot", "Handles business logic, document management, authentication, and orchestration.")
    Container(ml_server, "ML Server", "Python, Flask/FastAPI", "Handles document parsing, text embedding, and vector search operations.")
    ContainerDb(database, "Database", "MongoDB", "Stores user profiles, document metadata, comments, and vector embeddings.")
}

Rel(student, web_app, "Uses", "HTTPS")
Rel(web_app, api_app, "Makes API calls to", "JSON/HTTPS")
Rel(api_app, database, "Reads/Writes data", "MongoDB Wire Protocol")
Rel(api_app, ml_server, "Requests embeddings & search", "JSON/HTTP")
Rel(ml_server, database, "Reads/Writes vectors", "MongoDB Wire Protocol")
@enduml

3. Component Diagram (API Application)
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Component.puml

title Component Diagram for API Application (Spring Boot)

Container(web_app, "Web Application", "Angular", "Delivers the SPA.")
ContainerDb(database, "Database", "MongoDB", "Stores data.")
Container(ml_server, "ML Server", "Python", "Handles embeddings.")

Container_Boundary(api, "API Application") {
    Component(auth_controller, "AuthController", "Spring MVC Rest Controller", "Handles login and registration.")
    Component(doc_controller, "DocumentController", "Spring MVC Rest Controller", "Handles document uploads and retrieval.")
    Component(search_controller, "PassageFinderController", "Spring MVC Rest Controller", "Handles RAG search queries.")
    Component(space_controller, "StudySpaceController", "Spring MVC Rest Controller", "Manages study groups/spaces.")
    
    Component(auth_service, "AuthenticationService", "Spring Service", "Business logic for users.")
    Component(doc_service, "DocumentManagementService", "Spring Service", "Business logic for files.")
    Component(rag_service, "RAGSearchService", "Spring Service", "Logic for search and retrieval.")
    Component(space_service, "StudySpaceService", "Spring Service", "Logic for study spaces.")
    
    Component(user_repo, "UserRepository", "Spring Data Repository", "Accesses user data.")
    Component(doc_repo, "DocumentRepository", "Spring Data Repository", "Accesses document metadata.")
    Component(space_repo, "StudySpaceRepository", "Spring Data Repository", "Accesses group data.")
}

' wiring components
Rel(web_app, auth_controller, "Uses", "JSON/HTTPS")
Rel(web_app, doc_controller, "Uses", "JSON/HTTPS")
Rel(web_app, search_controller, "Uses", "JSON/HTTPS")
Rel(web_app, space_controller, "Uses", "JSON/HTTPS")

Rel(auth_controller, auth_service, "Uses")
Rel(doc_controller, doc_service, "Uses")
Rel(search_controller, rag_service, "Uses")
Rel(space_controller, space_service, "Uses")

Rel(auth_service, user_repo, "Uses")
Rel(space_service, space_repo, "Uses")
Rel(doc_service, doc_repo, "Uses")
Rel(doc_service, ml_server, "Sends files to be indexed", "JSON/HTTP")

Rel(rag_service, ml_server, "Requests search results", "JSON/HTTP")
Rel(rag_service, doc_repo, "Enriches results", "Java Call")

Rel(user_repo, database, "Read/Write")
Rel(doc_repo, database, "Read/Write")
Rel(space_repo, database, "Read/Write")
@enduml