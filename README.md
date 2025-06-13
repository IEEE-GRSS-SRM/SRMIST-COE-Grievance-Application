# COE Greivance Application
### An app where you can report your problems regarding examinations to the exam admins of the university / college.
---
The project follows the following architecture diagram:

![COE Greivance App Diagram](https://github.com/user-attachments/assets/f7b8df05-f9b1-41f2-93de-4c944164f62a)
---
The project uses the following schema:

![Project Schema](https://github.com/Yoshida28/qr-support-hub/blob/main/readme_stuff/COE%20Greivance%20App%20Schema.png)

***

### Requests - Contains Data of Requests put out by Users
- request_id -> Unique id for the request in the database.
- request_sender -> User id of the user who put out the request in the first place.
- request_title
- request_content
- request_media -> Any attachment files of the request.
- request_created_at -> When the request was published.
- request_updated_at -> When the reqest was viewed and acknowledged by an admin / super admin.
- request_status -> Status of the request (ongoing / completed).

***

### RequestSolutions - Contains Data of Solutions Written by Admins / Super Admins to Solve Requests
- solution_id -> Unique id of the solution in the database
- solution_given_by -> Id of the admin / super admin that wrote the solution
- solution_for_request_id -> Id of the request for which this solution was written.
- solution_for_request_id
- solution_content
- solution_media -> Any attachment files of the solution.
- solution_created -> When the solution was published.

***

### SuperAdminRequests - Contains IDs of all Requests That Have Been Sent to Super Admin From Admin
- super_admin_request_id -> Unique id of the super admin request in the database.
- request_id -> Id of the request that was sent to the super admin.

***

### Users - Contains Data of Persons Using the App
- user_id -> Unique id of the user in the database.
- user_role -> Saying if they are just a regular user, or an admin, or a super admin.
- user_name -> Full name of the user (can be obtained from google oauth using SRM mail).
- user_registration_number -> Registration number of the user (can be obtained from google oauth using SRM mail).
- user_campus -> Campus of user's university (eg., Kattangulatur).
- user_department -> Department to which the user belongs to.

***
