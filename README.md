# Taskflow Backend API

Production-ready REST API and real-time backend service for the **Taskflow** project. Built with Node.js, Express.js, TypeScript, PostgreSQL, Prisma ORM, JWT authentication, bcrypt, Nodemailer, and Socket.IO.

---

## Table of Contents
1. [Tech Stack & Architecture](#tech-stack--architecture)
2. [Project Structure](#project-structure)
3. [Environment Variables](#environment-variables)
4. [Database Setup & Prisma Migrations](#database-setup--prisma-migrations)
5. [Authentication & Security](#authentication--security)
6. [API Response Format](#api-response-format)
7. [API Endpoint Documentation](#api-endpoint-documentation)
   - [Authentication Endpoints](#1-authentication-api)
   - [User Management Endpoints](#2-user-api)
   - [Projects Endpoints](#3-projects-api)
   - [Tasks Endpoints](#4-tasks-api)
   - [Calendar Endpoints](#5-calendar-api)
   - [Channels Endpoints](#6-channels-api)
   - [Messages Endpoints](#7-messages-api)
   - [Team Endpoints](#8-team-api)
   - [Notifications Endpoints](#9-notifications-api)
   - [Activity Log Endpoints](#10-activity-api)
8. [Real-time Socket.IO Events](#real-time-socketio-events)
9. [Connecting Your React Frontend](#connecting-your-react-frontend)

---

## Tech Stack & Architecture
- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js 4.x
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma ORM 6.x (`prisma/schema.prisma`)
- **Authentication:** JWT (`jsonwebtoken`) & password hashing with `bcryptjs`
- **Email / OTP:** Nodemailer (SMTP)
- **Real-Time:** Socket.IO
- **Validation:** Zod schemas
- **Security:** Rate limiting (`express-rate-limit`), CORS, input sanitization

---

## Project Structure
```text
taskflow-backend/
├── prisma/
│   └── schema.prisma           # Prisma database schema with all models & relations
├── src/
│   ├── config/
│   │   ├── env.ts              # Environment variable parser & config
│   │   └── prisma.ts           # PrismaClient instance & connection pooling
│   ├── controllers/
│   │   ├── activity.controller.ts
│   │   ├── auth.controller.ts
│   │   ├── calendar.controller.ts
│   │   ├── channel.controller.ts
│   │   ├── message.controller.ts
│   │   ├── notification.controller.ts
│   │   ├── project.controller.ts
│   │   ├── task.controller.ts
│   │   ├── team.controller.ts
│   │   └── user.controller.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts       # JWT Bearer token verification
│   │   ├── errorHandler.middleware.ts # Centralized error handler
│   │   ├── rateLimiter.middleware.ts  # Rate limiting on auth routes
│   │   ├── role.middleware.ts       # Role & permission enforcement
│   │   └── validate.middleware.ts   # Zod request body validation
│   ├── models/
│   │   └── types.ts            # TypeScript interfaces, enums, & DTOs
│   ├── routes/
│   │   ├── activity.routes.ts
│   │   ├── auth.routes.ts
│   │   ├── calendar.routes.ts
│   │   ├── channel.routes.ts
│   │   ├── index.ts            # Master /api router
│   │   ├── message.routes.ts
│   │   ├── notification.routes.ts
│   │   ├── project.routes.ts
│   │   ├── task.routes.ts
│   │   ├── team.routes.ts
│   │   └── user.routes.ts
│   ├── services/
│   │   ├── db.service.ts       # Unified data access layer (Prisma + fallback)
│   │   └── socket.service.ts   # Socket.IO rooms and real-time broadcast
│   ├── utils/
│   │   ├── hash.ts             # bcrypt hashing & comparison
│   │   ├── jwt.ts              # JWT signing & verification
│   │   ├── mailer.ts           # Nodemailer SMTP transporter & templates
│   │   ├── otp.ts              # Cryptographic 6-digit OTP generator
│   │   └── response.ts         # Uniform API JSON formatter
│   ├── validators/
│   │   ├── auth.validator.ts
│   │   ├── channel.validator.ts
│   │   ├── project.validator.ts
│   │   ├── task.validator.ts
│   │   └── team.validator.ts
│   └── app.ts                  # Express app setup, CORS, and middleware
├── .env.example
├── package.json
├── server.ts                   # Main server entry point
├── tsconfig.json
└── README.md
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
# Database: PostgreSQL connection string
DATABASE_URL="postgresql://postgres:password@localhost:5432/taskflow?schema=public"

# Authentication: JWT secret key & expiration
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Email: Nodemailer SMTP configuration for 6-digit OTP password resets
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT=587
SMTP_USER=""
SMTP_PASSWORD=""

# Client & Server
CLIENT_URL="http://localhost:5173"
PORT=3000
```

---

## Database Setup & Prisma Migrations

When running with a local or hosted PostgreSQL instance:

1. **Generate Prisma Client:**
   ```bash
   npm run prisma:generate
   ```

2. **Push schema to database (development):**
   ```bash
   npx prisma db push
   ```
   or create migrations:
   ```bash
   npm run prisma:migrate
   ```

*Note:* If `DATABASE_URL` is not yet configured, the server operates seamlessly with an in-memory data store for immediate offline development and testing.

---

## Authentication & Security
- **Passwords:** Hashed with `bcryptjs` (salt rounds: 10). Plaintext passwords are never stored.
- **JWT Authorization:** Passed in the HTTP Header:
  ```http
  Authorization: Bearer <access_token>
  ```
- **Password Reset Flow:**
  1. `POST /api/auth/forgot-password` generates a cryptographically random 6-digit OTP.
  2. The hashed OTP is stored in the database with a strict 5-minute TTL.
  3. The OTP is emailed to the user via Nodemailer.
  4. `POST /api/auth/verify-otp` confirms the code before allowing the user to submit a new password.
  5. `POST /api/auth/reset-password` updates the password and immediately invalidates the OTP.
- **Rate Limiting:** Auth routes are guarded by rate limiters preventing credential stuffing and brute-force attacks.
- **Roles & Permissions:**
  - **Owner:** Full system access (can delete projects, manage all roles).
  - **Admin:** Manage projects, manage tasks, manage team members, manage channels.
  - **Member:** Manage own tasks, participate in channels, view projects and team.

---

## API Response Format

All endpoints follow a unified response structure.

### Success Response:
```json
{
  "success": true,
  "message": "Success message",
  "data": { ... }
}
```

### Error Response:
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## API Endpoint Documentation

Base URL: `http://localhost:3000/api`

### 1. Authentication API

#### Register Account
- **Method:** `POST`
- **URL:** `/api/auth/register`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "SecurePassword123!",
    "confirmPassword": "SecurePassword123!"
  }
  ```
- **Response Example (201 Created):**
  ```json
  {
    "success": true,
    "message": "Account created successfully",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "c1f76d49-43bf-4f24-9b3c-6232b7f7e911",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "avatar": null,
        "role": "Owner",
        "createdAt": "2026-09-19T02:40:00.000Z",
        "updatedAt": "2026-09-19T02:40:00.000Z"
      }
    }
  }
  ```

#### Login
- **Method:** `POST`
- **URL:** `/api/auth/login`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "email": "jane@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "c1f76d49-43bf-4f24-9b3c-6232b7f7e911",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "avatar": null,
        "role": "Owner",
        "createdAt": "2026-09-19T02:40:00.000Z",
        "updatedAt": "2026-09-19T02:40:00.000Z"
      }
    }
  }
  ```

#### Forgot Password (Request OTP)
- **Method:** `POST`
- **URL:** `/api/auth/forgot-password`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "email": "jane@example.com"
  }
  ```
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "A 6-digit verification code has been sent to your email.",
    "data": {
      "email": "jane@example.com",
      "expiresInMinutes": 5
    }
  }
  ```

#### Verify OTP
- **Method:** `POST`
- **URL:** `/api/auth/verify-otp`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "email": "jane@example.com",
    "otp": "481920"
  }
  ```
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "Verification code confirmed. You can now reset your password.",
    "data": {
      "verified": true,
      "email": "jane@example.com",
      "otpId": "38b97d10-df98-4c27-a068-08d172088f1d"
    }
  }
  ```

#### Reset Password
- **Method:** `POST`
- **URL:** `/api/auth/reset-password`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "email": "jane@example.com",
    "otp": "481920",
    "newPassword": "NewSecurePassword456!",
    "confirmPassword": "NewSecurePassword456!"
  }
  ```
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "Password has been reset successfully. You can now log in with your new password."
  }
  ```

---

### 2. User API

All User endpoints require the `Authorization: Bearer <token>` header.

#### Get Current User Profile
- **Method:** `GET`
- **URL:** `/api/users/me`
- **Headers:** `Authorization: Bearer <token>`
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "User profile retrieved",
    "data": {
      "id": "c1f76d49-43bf-4f24-9b3c-6232b7f7e911",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "avatar": "https://example.com/avatar.jpg",
      "role": "Owner",
      "createdAt": "2026-09-19T02:40:00.000Z",
      "updatedAt": "2026-09-19T02:45:00.000Z"
    }
  }
  ```

#### Update Profile
- **Method:** `PUT`
- **URL:** `/api/users/profile`
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "name": "Jane A. Doe",
    "avatar": "https://example.com/jane-new.png"
  }
  ```
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "Profile updated successfully",
    "data": {
      "id": "c1f76d49-43bf-4f24-9b3c-6232b7f7e911",
      "name": "Jane A. Doe",
      "email": "jane@example.com",
      "avatar": "https://example.com/jane-new.png",
      "role": "Owner",
      "createdAt": "2026-09-19T02:40:00.000Z",
      "updatedAt": "2026-09-19T02:46:00.000Z"
    }
  }
  ```

#### Change Email
- **Method:** `PUT`
- **URL:** `/api/users/email`
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "newEmail": "jane.doe@work.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "Email changed successfully",
    "data": {
      "id": "c1f76d49-43bf-4f24-9b3c-6232b7f7e911",
      "name": "Jane A. Doe",
      "email": "jane.doe@work.com",
      "avatar": "https://example.com/jane-new.png",
      "role": "Owner",
      "updatedAt": "2026-09-19T02:47:00.000Z"
    }
  }
  ```

#### Change Password (Logged In)
- **Method:** `PUT`
- **URL:** `/api/users/password`
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "currentPassword": "SecurePassword123!",
    "newPassword": "BrandNewPassword789!",
    "confirmPassword": "BrandNewPassword789!"
  }
  ```
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "Password changed successfully"
  }
  ```

#### Update Avatar
- **Method:** `PUT`
- **URL:** `/api/users/avatar`
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330"
  }
  ```
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "Avatar updated successfully",
    "data": {
      "id": "c1f76d49-43bf-4f24-9b3c-6232b7f7e911",
      "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330"
    }
  }
  ```

#### Logout
- **Method:** `POST`
- **URL:** `/api/users/logout`
- **Headers:** `Authorization: Bearer <token>`
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

---

### 3. Projects API

Required Header: `Authorization: Bearer <token>`

#### Create Project
- **Method:** `POST`
- **URL:** `/api/projects`
- **Permission:** Owner, Admin
- **Request Body:**
  ```json
  {
    "name": "Taskflow Mobile Client",
    "description": "Cross-platform mobile companion app",
    "status": "PLANNING",
    "priority": "HIGH",
    "progress": 15,
    "dueDate": "2026-12-31T23:59:59.000Z"
  }
  ```
- **Response Example (201 Created):**
  ```json
  {
    "success": true,
    "message": "Project created successfully",
    "data": {
      "id": "7b0a881e-bb36-474e-982a-bc953e5e4aa2",
      "name": "Taskflow Mobile Client",
      "description": "Cross-platform mobile companion app",
      "status": "PLANNING",
      "priority": "HIGH",
      "progress": 15,
      "dueDate": "2026-12-31T23:59:59.000Z",
      "createdBy": "c1f76d49-43bf-4f24-9b3c-6232b7f7e911",
      "createdAt": "2026-09-19T02:48:00.000Z",
      "updatedAt": "2026-09-19T02:48:00.000Z"
    }
  }
  ```

#### Get All Projects
- **Method:** `GET`
- **URL:** `/api/projects`
- **Query Parameters (optional):**
  - `status`: `PLANNING` | `IN_PROGRESS` | `COMPLETED` | `ON_HOLD`
  - `priority`: `LOW` | `MEDIUM` | `HIGH` | `URGENT`
  - `search`: string
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "Projects retrieved successfully",
    "data": [
      {
        "id": "7b0a881e-bb36-474e-982a-bc953e5e4aa2",
        "name": "Taskflow Mobile Client",
        "description": "Cross-platform mobile companion app",
        "status": "PLANNING",
        "priority": "HIGH",
        "progress": 15,
        "dueDate": "2026-12-31T23:59:59.000Z",
        "createdBy": "c1f76d49-43bf-4f24-9b3c-6232b7f7e911",
        "tasksCount": 4,
        "createdAt": "2026-09-19T02:48:00.000Z",
        "updatedAt": "2026-09-19T02:48:00.000Z"
      }
    ]
  }
  ```

#### Get Project by ID
- **Method:** `GET`
- **URL:** `/api/projects/:id`
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "Project retrieved successfully",
    "data": {
      "id": "7b0a881e-bb36-474e-982a-bc953e5e4aa2",
      "name": "Taskflow Mobile Client",
      "status": "PLANNING",
      "priority": "HIGH",
      "progress": 15,
      "tasks": []
    }
  }
  ```

#### Update Project
- **Method:** `PUT`
- **URL:** `/api/projects/:id`
- **Permission:** Owner, Admin
- **Request Body:**
  ```json
  {
    "progress": 40,
    "status": "IN_PROGRESS"
  }
  ```
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "Project updated successfully",
    "data": {
      "id": "7b0a881e-bb36-474e-982a-bc953e5e4aa2",
      "progress": 40,
      "status": "IN_PROGRESS",
      "updatedAt": "2026-09-19T02:49:00.000Z"
    }
  }
  ```

#### Delete Project
- **Method:** `DELETE`
- **URL:** `/api/projects/:id`
- **Permission:** Owner, Admin
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "Project deleted successfully"
  }
  ```

---

### 4. Tasks API

Required Header: `Authorization: Bearer <token>`

#### Create Task
- **Method:** `POST`
- **URL:** `/api/tasks`
- **Request Body:**
  ```json
  {
    "title": "Build Push Notification Service",
    "description": "Integrate APNs and FCM web notifications",
    "status": "TODO",
    "priority": "URGENT",
    "dueDate": "2026-10-15T18:00:00.000Z",
    "projectId": "7b0a881e-bb36-474e-982a-bc953e5e4aa2",
    "assignedTo": "c1f76d49-43bf-4f24-9b3c-6232b7f7e911"
  }
  ```
- **Response Example (201 Created):**
  ```json
  {
    "success": true,
    "message": "Task created successfully",
    "data": {
      "id": "19b882da-92da-4b82-990a-1158a5e0192e",
      "title": "Build Push Notification Service",
      "description": "Integrate APNs and FCM web notifications",
      "status": "TODO",
      "priority": "URGENT",
      "dueDate": "2026-10-15T18:00:00.000Z",
      "projectId": "7b0a881e-bb36-474e-982a-bc953e5e4aa2",
      "assignedTo": "c1f76d49-43bf-4f24-9b3c-6232b7f7e911",
      "createdBy": "c1f76d49-43bf-4f24-9b3c-6232b7f7e911",
      "createdAt": "2026-09-19T02:50:00.000Z",
      "updatedAt": "2026-09-19T02:50:00.000Z"
    }
  }
  ```

#### Get All Tasks
- **Method:** `GET`
- **URL:** `/api/tasks`
- **Query Parameters (filtering & searching):**
  - `status`: `TODO` | `IN_PROGRESS` | `IN_REVIEW` | `DONE`
  - `priority`: `LOW` | `MEDIUM` | `HIGH` | `URGENT`
  - `projectId`: string (filter by project)
  - `assignedTo`: string (filter by assignee)
  - `createdBy`: string (filter by creator)
  - `search`: string (searches title and description)
  - `dueDate`: string (`YYYY-MM-DD`)
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "Tasks retrieved successfully",
    "data": [
      {
        "id": "19b882da-92da-4b82-990a-1158a5e0192e",
        "title": "Build Push Notification Service",
        "status": "TODO",
        "priority": "URGENT",
        "dueDate": "2026-10-15T18:00:00.000Z",
        "assignedTo": "c1f76d49-43bf-4f24-9b3c-6232b7f7e911"
      }
    ]
  }
  ```

#### Get Task by ID
- **Method:** `GET`
- **URL:** `/api/tasks/:id`
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "Task retrieved successfully",
    "data": {
      "id": "19b882da-92da-4b82-990a-1158a5e0192e",
      "title": "Build Push Notification Service",
      "status": "TODO",
      "priority": "URGENT"
    }
  }
  ```

#### Update Task
- **Method:** `PUT`
- **URL:** `/api/tasks/:id`
- **Request Body:**
  ```json
  {
    "title": "Build Push Notification Service v2",
    "priority": "HIGH"
  }
  ```

#### Complete Task
- **Method:** `PUT`
- **URL:** `/api/tasks/:id/complete`
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "Task marked as completed",
    "data": {
      "id": "19b882da-92da-4b82-990a-1158a5e0192e",
      "status": "DONE"
    }
  }
  ```

#### Change Task Status
- **Method:** `PUT`
- **URL:** `/api/tasks/:id/status`
- **Request Body:**
  ```json
  {
    "status": "IN_PROGRESS"
  }
  ```

#### Change Task Priority
- **Method:** `PUT`
- **URL:** `/api/tasks/:id/priority`
- **Request Body:**
  ```json
  {
    "priority": "URGENT"
  }
  ```

#### Assign Task
- **Method:** `PUT`
- **URL:** `/api/tasks/:id/assign`
- **Request Body:**
  ```json
  {
    "assignedTo": "user-uuid-here"
  }
  ```

#### Delete Task
- **Method:** `DELETE`
- **URL:** `/api/tasks/:id`
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "Task deleted successfully"
  }
  ```

---

### 5. Calendar API

Required Header: `Authorization: Bearer <token>`

#### Get Tasks by Day
- **Method:** `GET`
- **URL:** `/api/calendar/day?date=2026-09-19`
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "Tasks for day retrieved successfully",
    "data": {
      "date": "2026-09-19",
      "count": 3,
      "tasks": [ ... ]
    }
  }
  ```

#### Get Tasks by Week
- **Method:** `GET`
- **URL:** `/api/calendar/week?date=2026-09-19`
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "Tasks for week retrieved successfully",
    "data": {
      "startDate": "2026-09-14",
      "endDate": "2026-09-20",
      "count": 7,
      "tasks": [ ... ]
    }
  }
  ```

#### Get Tasks by Month
- **Method:** `GET`
- **URL:** `/api/calendar/month?year=2026&month=9`
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "Tasks for month retrieved successfully",
    "data": {
      "year": 2026,
      "month": 9,
      "startDate": "2026-09-01",
      "endDate": "2026-09-30",
      "count": 14,
      "tasks": [ ... ]
    }
  }
  ```

#### Get Tasks by Due Date
- **Method:** `GET`
- **URL:** `/api/calendar/due-date?date=2026-10-15`
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "Tasks for due date retrieved successfully",
    "data": {
      "dueDate": "2026-10-15",
      "count": 2,
      "tasks": [ ... ]
    }
  }
  ```

---

### 6. Channels API

Required Header: `Authorization: Bearer <token>`

#### Create Channel
- **Method:** `POST`
- **URL:** `/api/channels`
- **Permission:** Owner, Admin
- **Request Body:**
  ```json
  {
    "name": "design-team",
    "description": "Design system & mockups discussion"
  }
  ```
- **Response Example (201 Created):**
  ```json
  {
    "success": true,
    "message": "Channel created successfully",
    "data": {
      "id": "218b82e1-4567-4a89-9b1c-992a718293aa",
      "name": "design-team",
      "description": "Design system & mockups discussion",
      "isDefault": false,
      "createdAt": "2026-09-19T02:51:00.000Z",
      "updatedAt": "2026-09-19T02:51:00.000Z"
    }
  }
  ```

#### Get Channels
- **Method:** `GET`
- **URL:** `/api/channels`
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "Channels retrieved successfully",
    "data": [
      {
        "id": "general-channel-id",
        "name": "General",
        "description": "Default organization channel for all team members",
        "isDefault": true,
        "membersCount": 12
      },
      {
        "id": "218b82e1-4567-4a89-9b1c-992a718293aa",
        "name": "design-team",
        "description": "Design system & mockups discussion",
        "isDefault": false,
        "membersCount": 4
      }
    ]
  }
  ```

#### Get Channel by ID
- **Method:** `GET`
- **URL:** `/api/channels/:id`

#### Add Member to Channel
- **Method:** `POST`
- **URL:** `/api/channels/:id/members`
- **Request Body:**
  ```json
  {
    "userId": "c1f76d49-43bf-4f24-9b3c-6232b7f7e911"
  }
  ```

#### Remove Member from Channel
- **Method:** `DELETE`
- **URL:** `/api/channels/:id/members/:userId`

---

### 7. Messages API

Required Header: `Authorization: Bearer <token>`

#### Send Message
- **Method:** `POST`
- **URL:** `/api/channels/:channelId/messages`
- **Request Body:**
  ```json
  {
    "message": "Welcome to the new Taskflow channel! Let's get started."
  }
  ```
- **Response Example (201 Created):**
  ```json
  {
    "success": true,
    "message": "Message sent successfully",
    "data": {
      "id": "98127391-da21-419b-a01b-c1287e0912ab",
      "channelId": "general-channel-id",
      "userId": "c1f76d49-43bf-4f24-9b3c-6232b7f7e911",
      "message": "Welcome to the new Taskflow channel! Let's get started.",
      "createdAt": "2026-09-19T02:52:00.000Z"
    }
  }
  ```
*(Note: Emits real-time `new_message` event to all Socket.IO subscribers)*

#### Get Channel Messages
- **Method:** `GET`
- **URL:** `/api/channels/:channelId/messages?limit=50`
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "Messages retrieved successfully",
    "data": [
      {
        "id": "98127391-da21-419b-a01b-c1287e0912ab",
        "channelId": "general-channel-id",
        "userId": "c1f76d49-43bf-4f24-9b3c-6232b7f7e911",
        "message": "Welcome to the new Taskflow channel! Let's get started.",
        "createdAt": "2026-09-19T02:52:00.000Z",
        "user": {
          "id": "c1f76d49-43bf-4f24-9b3c-6232b7f7e911",
          "name": "Jane Doe",
          "avatar": null
        }
      }
    ]
  }
  ```

#### Delete Own Message
- **Method:** `DELETE`
- **URL:** `/api/messages/:id`
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "Message deleted successfully"
  }
  ```

---

### 8. Team API

Required Header: `Authorization: Bearer <token>`

#### Get Team Members
- **Method:** `GET`
- **URL:** `/api/team/members`
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "Team members retrieved successfully",
    "data": [
      {
        "id": "c1f76d49-43bf-4f24-9b3c-6232b7f7e911",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "avatar": null,
        "role": "Owner",
        "createdAt": "2026-09-19T02:40:00.000Z"
      }
    ]
  }
  ```

#### Add Team Member
- **Method:** `POST`
- **URL:** `/api/team/members`
- **Permission:** Owner, Admin
- **Request Body:**
  ```json
  {
    "name": "Alex Smith",
    "email": "alex@example.com",
    "role": "Member",
    "password": "TemporaryPass123!"
  }
  ```
- **Response Example (201 Created):**
  ```json
  {
    "success": true,
    "message": "Team member added successfully",
    "data": {
      "member": {
        "id": "a98b12f4-e018-4721-a1b9-812e91209cb1",
        "name": "Alex Smith",
        "email": "alex@example.com",
        "role": "Member"
      },
      "temporaryPassword": "TemporaryPass123!"
    }
  }
  ```

#### Remove Team Member
- **Method:** `DELETE`
- **URL:** `/api/team/members/:id`
- **Permission:** Owner, Admin

#### Change Member Role
- **Method:** `PUT`
- **URL:** `/api/team/members/:id/role`
- **Permission:** Owner, Admin
- **Request Body:**
  ```json
  {
    "role": "Admin"
  }
  ```
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "Member role updated successfully",
    "data": {
      "id": "a98b12f4-e018-4721-a1b9-812e91209cb1",
      "role": "Admin"
    }
  }
  ```

---

### 9. Notifications API

Required Header: `Authorization: Bearer <token>`

#### Get Notifications
- **Method:** `GET`
- **URL:** `/api/notifications`
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "Notifications retrieved successfully",
    "data": [
      {
        "id": "81273918-bb12-4019-912a-bc9182910283",
        "userId": "c1f76d49-43bf-4f24-9b3c-6232b7f7e911",
        "title": "New Task Assigned",
        "message": "Alex Smith assigned task \"Build Push Notification Service\" to you.",
        "type": "task_assigned",
        "read": false,
        "createdAt": "2026-09-19T02:50:00.000Z"
      }
    ]
  }
  ```

#### Mark Notification as Read
- **Method:** `PUT`
- **URL:** `/api/notifications/:id/read`

#### Mark All as Read
- **Method:** `PUT`
- **URL:** `/api/notifications/read-all`

#### Delete Notification
- **Method:** `DELETE`
- **URL:** `/api/notifications/:id`

---

### 10. Activity API

Required Header: `Authorization: Bearer <token>`

#### Get Activities
- **Method:** `GET`
- **URL:** `/api/activities`
- **Query Parameters (optional):**
  - `projectId`: string
  - `userId`: string
  - `entityType`: `PROJECT` | `TASK` | `MEMBER` | `MESSAGE` | `USER` | `CHANNEL`
  - `limit`: number (default: 50)
- **Response Example (200 OK):**
  ```json
  {
    "success": true,
    "message": "Activities retrieved successfully",
    "data": [
      {
        "id": "71629381-cc91-491b-a01b-918203918231",
        "action": "Task completed",
        "entityType": "TASK",
        "entityId": "19b882da-92da-4b82-990a-1158a5e0192e",
        "details": "Completed task \"Build Push Notification Service\"",
        "userId": "c1f76d49-43bf-4f24-9b3c-6232b7f7e911",
        "projectId": "7b0a881e-bb36-474e-982a-bc953e5e4aa2",
        "createdAt": "2026-09-19T02:53:00.000Z",
        "user": {
          "id": "c1f76d49-43bf-4f24-9b3c-6232b7f7e911",
          "name": "Jane Doe"
        }
      }
    ]
  }
  ```

---

## Real-Time Socket.IO Events

Connect from your React application with `socket.io-client`:

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: localStorage.getItem('taskflow_token'),
  },
});
```

### Client -> Server Events:
1. **`join_channel`**: Join a channel room
   ```typescript
   socket.emit('join_channel', channelId);
   ```
2. **`leave_channel`**: Leave a channel room
   ```typescript
   socket.emit('leave_channel', channelId);
   ```
3. **`send_message`**: Send a real-time message
   ```typescript
   socket.emit('send_message', {
     channelId: 'general-channel-id',
     message: 'Hello team!',
   });
   ```
4. **`typing`**: Broadcast typing status
   ```typescript
   socket.emit('typing', {
     channelId: 'general-channel-id',
     isTyping: true,
   });
   ```

### Server -> Client Events:
1. **`new_message`**: Fired when a message is posted to the channel
   ```typescript
   socket.on('new_message', (message) => {
     console.log('Received message:', message);
   });
   ```
2. **`user_typing`**: Fired when someone in the channel is typing
   ```typescript
   socket.on('user_typing', ({ userName, isTyping }) => { ... });
   ```
3. **`user_joined_channel`** / **`user_left_channel`**: Presence notifications

---

## Connecting Your React Frontend

Set your React frontend's API base URL:
```typescript
const API_BASE_URL = 'http://localhost:3000/api';

// Example axios setup
import axios from 'axios';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```
