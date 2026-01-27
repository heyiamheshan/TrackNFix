import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';

// Components
import SignIn from './components/Auth/SignIn';
import SignUp from './components/Auth/SignUp';
import EmployeeDashboard from './components/Dashboards/EmployeeDashboard';
import AdminDashboard from './components/Dashboards/AdminDashboard';
import ManagerDashboard from './components/Dashboards/ManagerDashboard';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import ForgotPassword from './components/Auth/ForgotPassword';

// Set axios default base URL
axios.defaults.baseURL = 'http://localhost:5001/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="glass-card">
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/signin" 
            element={
              user ? <Navigate to={`/${user.role}-dashboard`} /> : 
              <SignIn onLogin={handleLogin} />
            } 
          />
          <Route 
            path="/signup" 
            element={
              user ? <Navigate to={`/${user.role}-dashboard`} /> : 
              <SignUp onLogin={handleLogin} />
            } 
          />
          <Route
            path="/employee-dashboard"
            element={
              <ProtectedRoute user={user} requiredRole="employee">
                <EmployeeDashboard user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute user={user} requiredRole="admin">
                <AdminDashboard user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager-dashboard"
            element={
              <ProtectedRoute user={user} requiredRole="manager">
                <ManagerDashboard user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/forgot-password" 
            element={<ForgotPassword />} 
          />
          <Route 
            path="/" 
            element={
              user ? <Navigate to={`/${user.role}-dashboard`} /> : 
              <Navigate to="/signin" />
            } 
          />
        </Routes>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </div>
    </Router>
  );
}

export default App;
