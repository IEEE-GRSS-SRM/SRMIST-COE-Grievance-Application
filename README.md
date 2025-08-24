# COE Grievance Application
### An app where you can report your problems regarding examinations to the exam admins of the university / college.
---
The project follows the following architecture diagram:

![COE Greivance App Diagram](https://github.com/IEEE-GRSS-SRM/COE-Greivance-Application/blob/main/readme_stuff/COE%20Greivance%20App%20Architecture%20Diagram.png)
---
The project uses the following schema:

![Project Schema](https://github.com/IEEE-GRSS-SRM/COE-Grievance-Application/blob/main/readme_stuff/supabase-schema.png).

The schema was made on supabase.

***
## Examination Requests – Contains Data of Requests put out by Students
- **id** → Unique id for the request in the database.
- **title** → Title of the request.
- **attachments** → Any attachment files of the request.
- **created_at** → When the request was created.
- **description** → Detailed content of the request.
- **request_type** → Type of request (exam-related, certificate, etc.).
- **department_id** → ID of the department the request is related to.
- **updated_at** → When the request was last updated.
- **resolution_notes** → Notes added when resolving the request.
- **resolved_at** → When the request was marked as resolved.
- **priority** → Priority of the request (low, medium, high).
- **status** → Current status of the request (pending / resolved).
- **student_id** → ID of the student who created the request.
- **assigned_admin_id** → ID of the admin assigned to handle the request.

---

## Request Responses – Contains Replies/Actions Taken for a Request
- **id** → Unique id for the response.
- **created_at** → When the response was created.
- **request_id** → The request this response belongs to.
- **response_text** → The text content of the response.
- **response_type** → Type of response (acknowledgment / resolution / note).
- **responder_id** → ID of the admin/staff who responded.
- **attachments** → Any attachments included in the response.

---

## Email Notifications – Contains Logs of Emails Sent Regarding Requests
- **id** → Unique id for the email notification.
- **recipient_email** → Email address of the recipient.
- **recipient_name** → Name of the recipient.
- **request_id** → The request this email is related to.
- **email_type** → Type of email (notification / reminder / resolution).
- **subject** → Subject line of the email.
- **content** → Body text of the email.
- **sent_at** → Timestamp of when the email was sent.
- **status** → Status of the email (sent / failed).
- **attachments** → Any attachments included in the email.

---

## Profiles – Contains Data of Users (Students, Admins, Staff)
- **id** → Unique id of the user profile.
- **email** → User’s email address.
- **full_name** → Full name of the user.
- **role** → Role of the user (student / admin / staff).
- **department_id** → ID of the department user belongs to (if applicable).
- **student_id** → Student roll number / identifier.
- **phone** → Contact number of the user.
- **is_profile_complete** → Whether the user has completed profile setup.
- **is_active** → Whether the profile is active.
- **created_at** → When the profile was created.
- **updated_at** → When the profile was last updated.
- **avatar_url** → URL of the user’s profile picture.

---

## Departments – Contains Data of Different Departments in the Institution
- **id** → Unique id of the department.
- **name** → Name of the department.
- **code** → Short code of the department.
- **description** → Description of the department.

***
