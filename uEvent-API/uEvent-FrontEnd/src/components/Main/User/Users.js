import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Typography, Paper, Box } from '@mui/material';
import User from './User';

function Users() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await axios.get('http://localhost:3000/api/users');
        setUsers(response.data);
      } catch (error) {
        console.error('Ошибка при получении пользователей:', error);
      }
    }

    fetchUsers();
  }, []);

  return (
    <Container style={{ marginTop: "2rem", marginBottom: "2rem" }}>
      <Paper elevation={3} style={{ padding: "20px"}}>
        <Typography variant="h4" gutterBottom>
          List of users
        </Typography>
        <Box style={{ display: 'flex', gap: '20px' }}>
          {users.map(user => (
            <User key={user.user_id} userData={user} />
          ))}
        </Box>
      </Paper>
    </Container>
  );  
}

export default Users;