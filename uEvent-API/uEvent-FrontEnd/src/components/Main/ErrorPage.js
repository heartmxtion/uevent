import React from 'react';
import { Container, Typography, Button } from '@mui/material';
import { NavLink } from 'react-router-dom';

function ErrorPage() {
  return (
    <Container maxWidth="md" style={{ textAlign: 'center', marginTop: '10%' }}>
      <Typography variant="h1" gutterBottom>
        404 - Page not found
      </Typography>
      <Typography variant="body1" paragraph>
        The page you requested does not exist.
      </Typography>
      <Button component={NavLink} to="/" variant="contained" color="primary">
        Go back to the main page
      </Button>
    </Container>
  );
};

export default ErrorPage;