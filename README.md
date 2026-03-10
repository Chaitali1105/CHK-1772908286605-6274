# BookMyCampus - Campus Facility Booking Platform 🎓

<div align="center">
  <h1>📚 BookMyCampus</h1>
  <p><strong>Complete Campus Facility Booking & Management System</strong></p>
  <p>A comprehensive web application for students, faculty, and administrators to book and manage campus resources</p>
</div>

---

## 🌟 Features

### 🔐 Authentication System
- User registration with role selection (Student, Faculty, Admin)
- Secure login with bcrypt password hashing
- Session-based authentication
- Role-based access control (RBAC)

### 📅 Resource Booking System
- Book campus facilities (labs, classrooms, auditoriums, sports grounds, workshops, meeting rooms)
- Real-time availability checking
- **ACID-compliant transactions** to prevent double bookings
- Time slot conflict detection with database row-level locking
- Role-based booking permissions
- Purpose and location tracking

### 🏢 Resource Management
- View all available and occupied resources
- Filter resources by type (classroom, lab, auditorium, sports, workshop, meeting room)
- Real-time status updates (Available/Occupied/Maintenance)
- Capacity and location information

### 📋 Booking Management
- View personal booking history
- Track booking status (Pending/Approved/Rejected)
- Detailed booking information (date, time, location, purpose)

### 🔔 Notification System
- Real-time approval/rejection notifications
- Booking confirmation alerts
- Auto-refresh every 30 seconds
- Unread notification badges

### 📊 Analytics & Statistics
- Visual statistics using Chart.js
- Horizontal bar charts showing most-used resources
- Booking trends and patterns
- Top 10 most booked resources

### ⚙️ Admin Panel
**Tab 1: Manage Bookings**
- View all booking requests from students and faculty
- Approve or reject bookings with one click
- Delete bookings
- Complete booking oversight

**Tab 2: Manage Resources**
- **Add** new campus resources
- **Edit** existing resource details (name, type, location, capacity, status)
- **Delete** resources (with booking validation)
- Full CRUD operations for resource management

---

## 🛠️ Tech Stack

**Frontend:**
- HTML5
- CSS3
- Vanilla JavaScript

**Backend:**
- Node.js
- Express.js

**Database:**
- MySQL

**Security:**
- bcrypt for password hashing
- **ACID transactions** for booking integrity
- Row-level database locking to prevent race conditions
- SQL injection prevention using parameterized queries
- Role-based authorization
- Session management

---

## 🔒 ACID Properties Implementation

The booking system implements full ACID properties to prevent double bookings:

- **Atomicity**: All booking operations are wrapped in database transactions. If any step fails, all changes are rolled back.
- **Consistency**: Database constraints and validation ensure data integrity. No conflicting bookings can exist.
- **Isolation**: Row-level locking (`FOR UPDATE`) prevents concurrent users from booking the same resource simultaneously.
- **Durability**: Once a booking is confirmed (committed), it persists even if the system crashes.

**Transaction Flow:**
```sql
BEGIN TRANSACTION
  SELECT * FROM resources WHERE id = ? FOR UPDATE  -- Lock the resource
  SELECT * FROM bookings WHERE ... FOR UPDATE      -- Lock conflicting bookings
  -- Validate and check conflicts
  INSERT INTO bookings (...)                       -- Create booking
  INSERT INTO notifications (...)                  -- Create notification
COMMIT  -- Make changes permanent
```

This ensures **zero possibility of double bookings** even under high concurrent load.

## 📁 Project Structure

```
BookMyCampus/
│
├── backend/
│   ├── server.js          # Main Express server
│   ├── db.js              # MySQL connection pool
│   ├── routes/
│   │   ├── auth.js        # Authentication routes
│   │   └── bookings.js    # Booking & resource management routes
│   ├── package.json       # Dependencies
│   └── .env               # Environment variables
│
├── frontend/
│   ├── login.html         # Login page
│   ├── signup.html        # Signup page
│   ├── dashboard.html     # Main dashboard
│   ├── style.css          # Auth pages styling
│   ├── dashboard.css      # Dashboard styling
│   ├── script.js          # Auth logic
│   └── dashboard.js       # Dashboard functionality
│
└── database/
    ├── schema.sql         # Users table creation
    └── bookings_schema.sql # Resources, bookings, notifications tables

Total: 17 Pre-loaded Sample Resources
```

---

## 🎯 Key Highlights

✅ **Zero Double Bookings** - ACID transactions with row-level locking  
✅ **Role-Based Access** - Students, Faculty, and Admin with different permissions  
✅ **Complete CRUD** - Full create, read, update, delete for resources (admin)  
✅ **Real-Time Updates** - Auto-refresh notifications and availability  
✅ **Modern UI/UX** - Gradient theme, smooth animations, responsive design  
✅ **Chart Analytics** - Visual statistics with Chart.js  
✅ **Admin Controls** - Complete oversight and management capabilities  
✅ **Secure** - Password hashing, SQL injection prevention, session management  

---

## 🛠️ Setup Instructions

### 1. Database Setup

```sql
# Login to MySQL
mysql -u root -p

# Create database and table
source database/schema.sql
```

Or manually run the SQL commands from `database/schema.sql`

### 2. Backend Setup

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Update db.js with your MySQL credentials if needed

# Start the server
npm start
```

The server will run on `http://localhost:5000`

### 3. Frontend Setup

Open the frontend files in your browser:

- `frontend/signup.html` - For registration
- `frontend/login.html` - For authentication

Or use a simple HTTP server:

```bash
# Using Python
cd frontend
python -m http.server 8000

# Using Node.js (http-server)
npx http-server frontend -p 8000
```

Then visit:
- http://localhost:8000/signup.html
- http://localhost:8000/login.html

## 🔌 API Endpoints

### POST /register

Register a new user

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepass123",
  "role": "student"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful"
}
```

### POST /login

Authenticate a user

**Request:**
```json
{
  "email": "john@example.com",
  "password": "securepass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student"
  }
}
```

## 👥 User Roles

- **Admin** - System administrators
- **Student** - Students booking facilities
- **Faculty** - Faculty members

## 🔒 Security Features

- Password hashing using bcrypt
- Input validation on both frontend and backend
- Email uniqueness enforcement
- SQL injection prevention using parameterized queries
- CORS enabled for API access

## 🎨 UI Features

- **Custom SVG Logo** - Professional gradient logo on all pages with floating animation
- **Modern gradient background** - Purple gradient theme across all pages
- **Centered card layout** - Clean, focused design
- **Rounded input fields** - Smooth, modern form elements
- **Smooth animations** - Professional transitions and hover effects
- **Mobile responsive design** - Works perfectly on all devices
- **Real-time form validation** - Instant feedback on user input
- **Success/error message display** - Clear user communication
- **Chart.js integration** - Beautiful horizontal bar charts for analytics

## 📝 Database Schema

**users table:**
- `id` - Auto-increment primary key
- `name` - User's full name (VARCHAR 100)
- `email` - Unique email address (VARCHAR 100)
- `password_hash` - Hashed password (TEXT)
- `role` - User role (VARCHAR 20): admin, student, faculty
- `created_at` - Timestamp of registration

## 🧪 Testing

1. Start MySQL server
2. Run the backend server
3. Open signup page and create an account
4. Try logging in with the credentials
5. Check MySQL database to verify user creation

## 📦 Dependencies

```json
{
  "express": "^4.18.2",
  "mysql2": "^3.6.0",
  "bcrypt": "^5.1.1",
  "cors": "^2.8.5"
}
```

## 🚨 Important Notes

- Update MySQL credentials in `backend/db.js` before running
- Ensure MySQL server is running before starting the backend
- **Double bookings are IMPOSSIBLE** - System uses ACID transactions with row-level locking
- **Concurrent booking attempts are handled safely** - First request wins, others get conflict error
- Password must be at least 6 characters long
- Email must be unique across all users
- Resources with existing bookings cannot be deleted (maintains data integrity)
- All booking operations are atomic and isolated

## 🎯 Next Steps

This authentication and booking system can be extended with:
- JWT token-based authentication
- Password reset functionality
- Email verification
- Payment integration for paid facilities
- QR code generation for bookings
- Mobile app integration
- Calendar view for bookings
- Recurring booking support
- Push notifications
- Resource availability calendar
- Booking history export (PDF/Excel)
- Multi-language support

---

## 🏆 Perfect for Hackathons & Academic Projects!

This system demonstrates:
- ✅ Full-stack development (Frontend + Backend + Database)
- ✅ ACID transaction implementation
- ✅ Race condition prevention
- ✅ Role-based access control
- ✅ RESTful API design
- ✅ Modern UI/UX principles
- ✅ Data visualization with charts
- ✅ Security best practices
- ✅ Scalable architecture
- ✅ Complete CRUD operations

---

## 📞 Support

For issues or questions:
1. Check the [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed instructions
2. Verify all dependencies are installed
3. Ensure MySQL is running and credentials are correct
4. Check browser console for frontend errors
5. Check terminal for backend errors

---

## 📄 License

MIT License - Free to use for hackathons, learning, and academic purposes!

---

## 💡 Key Technical Achievements

### 🔐 Preventing Double Bookings
The system uses MySQL transactions with `FOR UPDATE` row locking:
```javascript
// Pseudo-code flow
BEGIN TRANSACTION
  Lock resource row → Check conflicts → Lock booking rows
  If conflict exists: ROLLBACK
  Else: INSERT booking → COMMIT
END TRANSACTION
```
**Result**: Even if 1000 users try to book the same time slot simultaneously, only 1 succeeds.

### 🎨 Logo Design
Custom SVG logo featuring:
- Gradient book icon matching the purple theme
- Floating animation effect
- Responsive sizing across devices
- Drop shadow for depth

### 🏗️ Architecture
- **Frontend**: Vanilla JavaScript (no frameworks needed)
- **Backend**: Node.js + Express (RESTful API)
- **Database**: MySQL with InnoDB engine (supports transactions)
- **Security**: bcrypt hashing + parameterized queries
- **Real-time**: Auto-refresh with setInterval

---

<div align=\"center\">
  <p><strong>Built with ❤️ for Campus Communities</strong></p>
  <p>🎓 Making campus resource booking simple and efficient</p>
  <br>
  <p><em>Zero Double Bookings. Maximum Efficiency.</em></p>
</div>
