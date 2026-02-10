# Frontend Dashboard Documentation

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create `.env` file:
```
REACT_APP_API_URL=http://localhost:5000/api
```

### 3. Start Development Server
```bash
npm start
```

Application will be running on `http://localhost:3000`

## Project Structure

```
src/
├── api/              # API client utilities
├── components/       # Reusable components (Sidebar, Header, etc)
├── context/          # React Context (Auth, Protected Routes)
├── pages/            # Page components
├── App.js            # Main app component
└── index.js          # Entry point
```

## Key Components

### Pages
- **LoginPage**: User authentication interface
- **DashboardPage**: Main dashboard with cards and quick stats
- **AttendancePage**: Attendance tracking and leave management
- **TasksPage**: Task assignment and tracking
- **CallersPage**: Caller data management
- **ProfilePage**: User profile (expandable)
- **EmployeesPage**: Employee management (expandable)

### Context
- **AuthContext**: Manages user authentication state
- **ProtectedRoute**: Protects routes that need authentication

### API Client
- Centralized API calls with axios
- Automatic JWT token injection
- Consistent error handling

## Styling

Using Tailwind CSS for rapid UI development:
- Pre-configured with responsive classes
- Color scheme optimized for professional dashboards
- Mobile-first design approach

## Authentication Flow

1. User enters credentials on LoginPage
2. API sends email and password
3. Backend returns JWT token
4. Token stored in localStorage
5. Automatic token injection in subsequent requests
6. ProtectedRoute checks authentication before rendering

## State Management

- **Context API** for global auth state
- **useState** for component-level state
- **localStorage** for token persistence

## Available Scripts

```bash
# Start development server
npm start

# Build for production
npm build

# Run tests
npm test

# Eject configuration (not reversible)
npm eject
```

## UI Features

- Responsive sidebar navigation
- Professional color scheme (Blue/Gray)
- Icon-based navigation
- Dashboard cards with analytics
- Modal/Form components
- Real-time notifications badge

## Customization

### Add New Page
1. Create new file in `src/pages/`
2. Add route in `src/App.js`
3. Add menu item in `src/components/Sidebar.js`

### Add New API Call
1. Add function in `src/api/client.js`
2. Use in components via import

### Styling
- Edit Tailwind config in `tailwind.config.js`
- Custom CSS in component files or `src/index.css`

## Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance Optimizations
- Code splitting via React Router
- Lazy loading of images
- Optimized API calls
- Efficient re-render prevention

## Accessibility
- Semantic HTML
- Keyboard navigation
- ARIA labels where needed
- Color contrast compliance

## Testing
```bash
npm test
```

Create test files alongside components with `.test.js` extension.
