import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import TaskDetails from './pages/TaskDetails';
import MyTasks from './pages/MyTasks';
import TaskWorkspace from './pages/TaskWorkspace';
import TaskReview from './pages/TaskReview';

function App() {
  const isAuthenticated = !!localStorage.getItem('token');

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
          path="/tasks/:id"
          element={isAuthenticated ? <TaskDetails /> : <Navigate to="/login" />}
        />

        <Route
          path="/tasks/:id/work"
          element={isAuthenticated ? <TaskWorkspace /> : <Navigate to="/login" />}
        />

        <Route
          path="/tasks/:id/review"
          element={isAuthenticated ? <TaskReview /> : <Navigate to="/login" />}
        />

        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;
