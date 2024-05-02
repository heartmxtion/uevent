import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Container, Typography, Button, CircularProgress,Paper } from "@mui/material";

function Confirm() {
  const { token } = useParams();
  const [confirmError, setConfirmError] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function getApiInfo(token) {
      try {
        const response = await axios.get(
          `http://localhost:3000/api/auth/confirm/${token}`
        );
        const data = response.data;
        const message = data.message;
        setConfirmMessage(message);
        console.log(message);
      } catch (error) {
        console.error(error);
        setConfirmError(`Error: ${error.response.data.message}`);
      }
    }

    getApiInfo(token);
  }, [token, navigate]);

  return (
    <Container style={{ textAlign: "center", marginTop: "2%" }}>
      <Paper elevation={3} sx={{ padding: "20px", width: '100%', height: '600px'}}>
        {confirmMessage && (
          <Typography variant="h4" gutterBottom sx={{marginTop: '10%'}} >
            {confirmMessage}
          </Typography>
        )}
        {confirmError && (
          <Typography variant="h4" gutterBottom sx={{ color: "red", marginTop: '10%' }}>
            {confirmError}
          </Typography>
        )}
        {!confirmMessage && !confirmError && (
          <Container>
            <CircularProgress />
            <br />
            <br />
          </Container>
        )}
        <Button
          variant="contained"
          color="primary"
          sx={{marginTop: '200px'}}
          onClick={() => navigate("/events")}
        >
          Go back to the main page
        </Button>
      </Paper>
    </Container>
  );
}

export default Confirm;