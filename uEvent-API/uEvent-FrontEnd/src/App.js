import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Box from '@mui/material/Box'

import Layout from './components/Layout';
import Register from './components/Main/Auth/Register';
import Auth from './components/Main/Auth/Auth';
import Recover from './components/Main/Auth/Recover';
import RecoverForm from './components/Main/Auth/RecoverForm';
import Confirm from './components/Main/Auth/Confirm';
import CompanyConfirm from './components/Main/Auth/CompanyConfirm';
import UserProfile from './components/Main/User/UserProfile';
import ErrorPage from './components/Main/ErrorPage';
import EventCreationPage from "./components/Main/Calendar/EventCreationPage";
import AdminPanel from "./components/Main/AdminPanel";
import AllEvents from './components/Main/Event/AllEvents';
import Event from './components/Main/Event/Event';
import Users from './components/Main/User/Users';

function App() {
  return (
    <Router>
      <Box>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Auth />}/>
            <Route path="/register" element={<Register />}/>
            <Route path="/recover" element={<Recover />}/>
            <Route path="/confirm/:token" element={<Confirm />} />
            <Route path="/companyConfirm/:token" element={<CompanyConfirm />} />
            <Route path="/reset-password/:token" element={<RecoverForm />} />
            <Route path="/profile/:userId" element={<UserProfile />} />
            <Route path="/users" element={<Users />} />
            <Route path="/profile/0" element={<Auth />} />
            <Route path="/create-event/:userId" element={<EventCreationPage />} />
            <Route path="/events" element={<AllEvents />} />
            <Route path="/events/event/:eventId" element={<Event />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="*" element={<ErrorPage />}/>
          </Route>
        </Routes>
      </Box>
    </Router>
  );
}

export default App;
