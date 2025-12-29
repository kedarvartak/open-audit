import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import TaskDetails from './pages/TaskDetails';
import MyTasks from './pages/MyTasks';
import TaskReview from './pages/TaskReview';
import { WorkVerification } from './pages/WorkVerification';
import Calendar from './pages/Calendar';
import Workspaces from './pages/Workspaces';
import { requestForToken, onMessageListener } from './lib/firebase';
import { authAPI } from './services/api';
import toast from 'react-hot-toast';

function App() {
  const isAuthenticated = !!localStorage.getItem('token');

  useEffect(() => {
    if (isAuthenticated) {
      const initFirebase = async () => {
        try {
          const token = await requestForToken();
          if (token) {
            await authAPI.updateFcmToken(token);
            console.log('FCM Token updated');
          }
        } catch (error) {
          console.error('Error initializing Firebase:', error);
        }
      };

      initFirebase();

      onMessageListener()
        .then((payload: any) => {
          toast.success(
            <div>
              <p className="font-bold">{payload?.notification?.title}</p>
              <p className="text-sm">{payload?.notification?.body}</p>
            </div>,
            { duration: 5000 }
          );
        })
        .catch((err) => console.log('failed: ', err));
    }
  }, [isAuthenticated]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
        />

        <Route
          path="/my-tasks"
          element={isAuthenticated ? <MyTasks /> : <Navigate to="/login" />}
        />

        <Route
          path="/calendar"
          element={isAuthenticated ? <Calendar /> : <Navigate to="/login" />}
        />

        <Route
          path="/workspaces"
          element={isAuthenticated ? <Workspaces /> : <Navigate to="/login" />}
        />

        <Route
          path="/tasks/:id"
          element={isAuthenticated ? <TaskDetails /> : <Navigate to="/login" />}
        />

        <Route
          path="/tasks/:id/review"
          element={isAuthenticated ? <TaskReview /> : <Navigate to="/login" />}
        />

        <Route
          path="/tasks/:id/verify"
          element={isAuthenticated ? <WorkVerification /> : <Navigate to="/login" />}
        />

        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;
