# COE Greivance Application
### An app where you can report your problems regarding examinations to the exam admins of the university / college.
---
The project follows the following architecture diagram:

![COE Greivance App Diagram](https://github.com/user-attachments/assets/f7b8df05-f9b1-41f2-93de-4c944164f62a)
---
The project uses the following schema:

![Project Schema](https://github.com/Yoshida28/qr-support-hub/blob/main/readme_stuff/COE%20Greivance%20App%20Schema.png)

The schema was made on supabase.
Project ID: xrwildhnakpfdkpjqzfm
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhyd2lsZGhuYWtwZmRrcGpxemZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2NjczOTQsImV4cCI6MjA2MTI0MzM5NH0.yB1HtOI4InWrCECYUXrq43rWHAH8yJf0U2amM5QI06Y

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
- solution_title
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
- user_degree -> The degree whose learning / faculty work pertains to.

***

## Extra Details For Project Segments

### Google OAuth Feature
- Get email, name, registration number from SRM mail Google OAuth.
- If email already exists in the database, return their details in the database (all details, including role).
- If email does not exist in the database, ask for user's campus, department and degree using a dropdown box.
- Register the user details in the database with the role 'user'.

### Students Request Posting, Request Viewing and Timeline Viewing Page
- Make sure these pages only comes when the details returned from authentication contains role as 'user'.
- Use the details returned from Google OAuth feature to implement the feature. refer the architecture diagram for more details.

### Request Solving Page and Mailing Feature
- Should work for both cases, admin or super admin solving the request.

### Admin Request Viewing Page
- Make sure this page only comes when the details returned from authentication contains role as 'admin'.

### Super Admin Analytics and Requests Viewing Page
- Make sure this page only comes when the details returned from authentication contains role as 'super_admin'.
