import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { NavLink, useNavigate } from "react-router-dom";
import { Container, TextField, Button, Alert, Paper } from '@mui/material';

function Auth() {
  const [formData, setFormData] = useState({ username: '', password: '', '2faToken': '' });
  const [authError, setAuthError] = useState(null);
  const [requires2FA, setRequires2FA] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === '2faToken') {
      const formattedValue = value.replace(/\s+/g, '').replace(/(\d{3})(?=\d)/g, '$1 ');
      setFormData({
        ...formData,
        [name]: formattedValue
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (blocked) {
      setAuthError("Too many login attempts. Please try again later.");
      return;
    }
    const tokenWithoutSpaces = formData['2faToken'].replace(/\s/g, '');
    const requestData = {
      ...formData,
      '2faToken': tokenWithoutSpaces
    };
    axios.post('http://localhost:3000/api/auth/login', requestData)
      .then(response => {
        console.log('Результат:', response.data.message);
  
        if (response.data.requires2FA) {
          setRequires2FA(true);
        } else {
          const jwtToken = response.data.user.jwtToken;
          const userId = response.data.user.userId;
          localStorage.setItem('jwtToken', jwtToken);
          navigate(`/profile/${userId}`);
          window.location.reload();
        }
      })
      .catch(error => {
        setAuthError(`Ошибка: ${error.response.data.message}`);
        setLoginAttempts(loginAttempts + 1);
        if (loginAttempts + 1 >= 5) {
          setBlocked(true);
        }
      });
  };

  useEffect(() => {
    const blockedTime = localStorage.getItem('blockedTime');
    if (blockedTime) {
      const currentTime = Date.now();
      const timeDiff = currentTime - blockedTime;
      if (timeDiff < 300000) {
        setBlocked(true);
      } else {
        setBlocked(false);
        localStorage.removeItem('blockedTime');
        setLoginAttempts(0);
      }
    }
  }, []);

  return (
    <Container maxWidth="xs" style={{ textAlign: 'center', marginTop: '8%', marginBottom: '10%' }}>
      <Paper elevation={3} style={{ padding: '20px'}}>
      <h1>Authorization</h1>

      <form onSubmit={handleSubmit}>
        <TextField
          label="Email or login"
          variant="outlined"
          fullWidth
          margin="normal"
          name="username"
          value={formData.username}
          onChange={handleChange}
        />
        <TextField
          label="Password"
          variant="outlined"
          fullWidth
          margin="normal"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
        />
        {requires2FA && (
          <TextField
            label="Two-factor authentication token"
            variant="outlined"
            fullWidth
            margin="normal"
            name="2faToken"
            inputProps={{
              maxLength: 7,
              pattern: "[0-9\\s]*", 
            }}
            value={formData["2faToken"]}
            onChange={handleChange}
          />
        )}<br/>
        {authError && <Alert severity="error">{authError}</Alert>}<br/>
        <Button variant="contained" color="primary" type="submit" disabled={blocked}>
          Login
        </Button>
        <br/><br/>
        <NavLink to="/recover">Forgot the password?</NavLink>
      </form>
      </Paper>
      <br/>
      <Paper elevation={3} style={{ padding: '20px' }}>
        Don't have an account yet? <NavLink to="/register">Registration</NavLink>
      </Paper>
      <br/>
    </Container>
  );
}

export default Auth;
