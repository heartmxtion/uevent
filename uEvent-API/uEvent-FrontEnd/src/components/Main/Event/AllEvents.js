import React, { useState, useEffect } from "react";
import Events from "./Events";
import {
  Container,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Box,
  Grid,
} from "@mui/material";

function AllEvents() {
  const config = "http://localhost:3000/api/events";
  const [sortBy, setSortBy] = useState("likes");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [keyChange, setKeyChange] = useState(0);
  const [tempStartDate, setTempStartDate] = useState("");
  const [tempEndDate, setTempEndDate] = useState("");
  const [tempSelectedStatus, setTempSelectedStatus] = useState("active");

  const handleSortChange = (event) => {
    setSortBy(event.target.value);
    setKeyChange(keyChange+1);
  };
  
  const handleStartDateChange = (event) => {
    setTempStartDate(event.target.value);
  };
  
  const handleEndDateChange = (event) => {
    setTempEndDate(event.target.value);
  };
  
  const handleStatusChange = (event) => {
    setTempSelectedStatus(event.target.value);
  };

  const applyFilters = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setSelectedStatus(tempSelectedStatus);
    setKeyChange(keyChange+1);
  };

  const [selectedStatus, setSelectedStatus] = useState("active");
  return (
    <Container style={{ marginTop: "2rem", paddingBottom: "130px" }}>
      <Grid
        sx={{ width: "1525px" }}
        container
        spacing={2}
      >
        <Grid item xs={8}>
          <Paper elevation={3} style={{ padding: "20px" }}>
            <Box>
              <Typography variant="h5" gutterBottom>
                Events:
              </Typography>
              <FormControl sx={{ m: 1, minWidth: 120 }}>
                <InputLabel id="sort-by-label">Sort By</InputLabel>
                <Select
                  labelId="sort-by-label"
                  id="sort-by"
                  value={sortBy}
                  label="Sort By"
                  onChange={handleSortChange}
                >
                  <MenuItem value="likes">Likes</MenuItem>
                  <MenuItem value="date">Date</MenuItem>
                </Select>
              </FormControl>
              <Events
                key={keyChange}
                config={config}
                sortBy={sortBy}
                startDate={startDate}
                endDate={endDate}
                selectedStatus={selectedStatus}
              />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper
            elevation={3}
            sx={{ width: "400px", textAlign: "center", padding: "20px" }}
          >
            <Box style={{ marginBottom: "20px" }}>
              <TextField
                label="Start Date"
                type="date"
                variant="outlined"
                fullWidth
                margin="normal"
                value={tempStartDate}
                onChange={handleStartDateChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
              <TextField
                label="End Date"
                type="date"
                variant="outlined"
                fullWidth
                margin="normal"
                value={tempEndDate}
                onChange={handleEndDateChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
              <FormControl sx={{ minWidth: 120, marginTop: '10px' }}>
              <InputLabel id="statuses-label">Status</InputLabel>
              <Select
                sx={{width: '400px'}}
                labelId="statuses-label"
                id="statuses"
                value={tempSelectedStatus}
                label="Status"
                onChange={handleStatusChange}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="both">Both</MenuItem>
              </Select>
              </FormControl>

              <Button
                sx={{ marginTop: "10px", marginBottom: "-20px" }}
                variant="contained"
                color="primary"
                onClick={applyFilters}
              >
                Apply Filters
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default AllEvents;