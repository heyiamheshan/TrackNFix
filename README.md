# Vehra - TrackNFix 2.0

A modern vehicle service record management system for Jayakody Auto Electrical Automobile Workshop, built with MERN stack (MySQL instead of MongoDB) and featuring a beautiful glassmorphism-inspired UI design.

## Features

### Employee Dashboard
- Create service/repair/accident recovery jobs
- Upload initial vehicle images (all sides)
- Upload after-service images with parts replaced
- Add special notes about services done and parts replaced
- Submit jobs to admin for review
- View personal job history

### Admin Dashboard
- Review employee job requests
- View all images and job details
- Create quotations with vehicle details
- Auto-fill vehicle information if vehicle exists
- Edit and send quotations to manager
- Search vehicle records by vehicle number or telephone
- Send notifications to customers
- View notifications from manager

### Manager Dashboard
- Review quotations sent by admin
- Add prices to each job/part
- Set labor costs
- Generate PDF quotations
- Approve quotations and notify admin
- Search vehicle records
- Download complete service record PDFs

## Tech Stack

- **Frontend**: React 18, React Router, Axios, React Toastify, React Icons
- **Backend**: Node.js, Express.js, MySQL2
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **PDF Generation**: PDFKit
- **Styling**: Custom CSS with Glassmorphism design

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm or yarn

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd TrackNFix2.0
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=tracknfix

PORT=5000

JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
```

### 3. Database Setup

Create the MySQL database and run the schema:

```bash
mysql -u root -p < ../database/schema.sql
```

Or manually:
1. Open MySQL command line or MySQL Workbench
2. Run the SQL file: `database/schema.sql`

### 4. Frontend Setup

```bash
cd ../frontend
npm install
```

## Running the Application

### Start Backend Server

```bash
cd backend
npm start
# or for development with auto-reload
npm run dev
```

The backend server will run on `http://localhost:5000`

### Start Frontend Development Server

```bash
cd frontend
npm start
```

The frontend will run on `http://localhost:3000`

## Initial Setup

### User Registration

1. **First, register 2 Admins:**
   - Go to `/signup`
   - Select role: "Admin"
   - Register first admin
   - Register second admin

2. **Then, register 2 Managers:**
   - Go to `/signup`
   - Select role: "Manager"
   - Register first manager
   - Register second manager

3. **After 2 admins and 2 managers are registered:**
   - Only "Employee" role will be available for new signups
   - Admins and managers can still sign in

## Usage Flow

### Employee Workflow
1. Employee logs in
2. Creates a new job (selects job type: Monthly Service, Repair, or Accident Recovery)
3. Enters or selects vehicle number
4. Uploads initial vehicle images (all sides)
5. Performs service/repair
6. Uploads after-service images (parts replaced, vehicle sides)
7. Adds special notes (parts replaced, services done)
8. Submits to admin

### Admin Workflow
1. Admin logs in
2. Views employee requests in "Employee Requests" tab
3. Clicks "Review" on a job
4. Views all images and job details
5. Clicks "Proceed to Quotation"
6. Fills in vehicle details (auto-filled if vehicle exists)
7. Adds jobs done (one per line)
8. Creates quotation
9. Sends quotation to manager

### Manager Workflow
1. Manager logs in
2. Views quotations in "Request Quotations" tab
3. Clicks "Edit" on a quotation
4. Adds prices for each job/part
5. Sets labor cost
6. Generates PDF quotation
7. Approves and notifies admin
8. Admin receives notification and can send message to customer

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/signin` - Login user
- `GET /api/auth/me` - Get current user

### Jobs
- `POST /api/jobs` - Create job (Employee)
- `GET /api/jobs/pending` - Get pending jobs (Admin)
- `GET /api/jobs/:id` - Get single job
- `PUT /api/jobs/:id/review` - Review job (Admin)
- `GET /api/jobs/employee/my-jobs` - Get employee's jobs

### Vehicles
- `GET /api/vehicles/search` - Search vehicles
- `GET /api/vehicles/:vehicleNumber` - Get vehicle by number
- `GET /api/vehicles/:vehicleNumber/history` - Get vehicle history
- `POST /api/vehicles` - Create/update vehicle
- `POST /api/vehicles/:vehicleNumber/service-record-pdf` - Generate service record PDF (Manager)

### Quotations
- `POST /api/quotations` - Create quotation (Admin)
- `GET /api/quotations` - Get quotations
- `GET /api/quotations/pending-manager` - Get pending quotations (Manager)
- `GET /api/quotations/:id` - Get single quotation
- `PUT /api/quotations/:id` - Update quotation
- `PUT /api/quotations/:id/send-to-manager` - Send to manager (Admin)
- `POST /api/quotations/:id/generate-pdf` - Generate PDF (Manager)
- `POST /api/quotations/:id/approve` - Approve quotation (Manager)

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `POST /api/notifications/send-to-customer` - Send to customer (Admin)

## Project Structure

```
TrackNFix2.0/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── jobs.js
│   │   ├── vehicles.js
│   │   ├── quotations.js
│   │   └── notifications.js
│   ├── utils/
│   │   ├── generateToken.js
│   │   └── upload.js
│   ├── uploads/
│   └── server.js
├── database/
│   └── schema.sql
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       │   ├── Auth/
│       │   └── Dashboards/
│       ├── App.js
│       ├── index.js
│       └── index.css
└── package.json
```

## Design

The application features a modern **glassmorphism-inspired UI** (iOS 26 style) with:
- Frosted glass effect cards
- Smooth gradients
- Blur effects
- Modern typography (SF Pro / Inter)
- Responsive design
- Beautiful color scheme

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Protected API routes
- File upload validation

## Notes

- Image uploads are stored in `backend/uploads/`
- PDFs are generated on-the-fly and downloaded directly
- Job numbers auto-increment (JOB-000001, JOB-000002, etc.)
- Quotation numbers auto-increment (QUO-000001, QUO-000002, etc.)
- Maximum 2 admins and 2 managers can be registered

## Troubleshooting

### Database Connection Issues
- Ensure MySQL is running
- Check `.env` file has correct database credentials
- Verify database `tracknfix` exists

### Image Upload Issues
- Ensure `backend/uploads/` directory exists and is writable
- Check file size limits (default: 10MB per file)

### PDF Generation Issues
- Ensure PDFKit is installed: `npm install pdfkit`
- Check browser allows downloads

## License

This project is developed for Jayakody Auto Electrical Automobile Workshop.

## Support

For issues or questions, please contact the development team.
