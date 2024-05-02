import React, { useState } from 'react';
import axios from 'axios';
import { NavLink } from 'react-router-dom';
import { Container, TextField, Button, Alert, Paper } from '@mui/material';

function Recover() {
  const [formData, setFormData] = useState({ email: '' });
  const [authError, setAuthError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post('http://localhost:3000/api/auth/password-reset', {
        email: formData.email
      });

      const data = response.data;
      alert(data.message);

    } catch (error) {
      if (error.response) {
        setAuthError(`Error: ${error.response.data.message}`);
      } else {
        setAuthError('An error occurred while sending the request');
      }
    }
  };

  return (
    <Container maxWidth="xs" style={{ textAlign: 'center', marginTop: '10%', marginBottom: '10%'}}>
      <Paper elevation={3} style={{ padding: '20px'}}>
        <h1>Having difficulties with access?</h1>
        Enter your email address and we will send you a link to restore access to your account.
        <form onSubmit={handleSubmit}>
          <TextField
            label="Email"
            variant="outlined"
            fullWidth
            margin="normal"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
          /><br/>
          {authError && <Alert severity="error">{authError}</Alert>}<br/>
          <Button variant="contained" color="primary" type="submit">
            Get login link
          </Button>
          <br/><br/>
          <NavLink to="/register">Create a new account</NavLink>
          <br/><br/>
        </form>
      </Paper>
      <br/>
    </Container>
  );
}

export default Recover;