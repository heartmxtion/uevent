import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";

import {
  Box,
  TextField,
  Typography,
  Button,
  Autocomplete,
  FormControlLabel,
  Checkbox
} from "@mui/material";
import "leaflet/dist/leaflet.css";
import LeafletMap from "../LeafletMapCreation";

function EventCreationPage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const jwtToken = localStorage.getItem("jwtToken");
  const [uploadPostFile, setUploadPostFile] = useState("");
  const [newPostData, setNewPostData] = useState({
    title: "",
    content: "",
    startDate: dayjs(),
    endDate: dayjs(),
    date: dayjs(),
    type: "",
    files: "",
    filenames: "",
    markerPosition: "",
    numberTickets: "",
    ticketPrice: "",
    promo: "",
    sale: 0,
    uses: 0,
    format: "",
    topics: [],
    notifications: 0,
    non_participant: 0
  });

  const [selectedEvents, setSelectedEvents] = useState("");
  const [topics, setTopics] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [formats, setFormats] = useState([]);
  const [selectedFormats, setSelectedFormats] = useState(null);
  const [selectedEventType, setSelectedEventType] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [hasPromoCode, setHasPromoCode] = useState(false);
  const [formValid, setFormValid] = useState(true);
  const [showUserList, setShowUserList] = useState(0);
  const [notifyNewVisitors, setNotifyNewVisitors] = useState(0);

  const [events, setEvents] = useState([
    { title: "Arrangement" },
    { title: "No fixed duration" },
  ]);

  useEffect(() => {
    async function fetchUserData() {
      try {
        const response = await axios.get("http://localhost:3000/api/userData", {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
        });
        const userData = response.data;
        if (userData.role === 'admin' || userData.company_id) {
          navigate(`/create-event/${userId}`);
        } else {
          navigate("/events");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    }
  
    fetchUserData();
  }, []);

  useEffect(() => {
    async function fetchTopics() {
      try {
        const response = await axios.get("http://localhost:3000/api/topics", {
          headers: {
            authorization: `Bearer ${jwtToken}`,
          },
        });
        const topicData = response.data;
        setTopics(topicData);
      } catch (error) {
        console.error("Error while receiving topics:", error);
      }
    }
    async function fetchFormats() {
      try {
        const response = await axios.get("http://localhost:3000/api/formats", {
          headers: {
            authorization: `Bearer ${jwtToken}`,
          },
        });
        const formatData = response.data;
        setFormats(formatData);
      } catch (error) {
        console.error("Error while receiving formats:", error);
      }
    }

    fetchTopics();
    fetchFormats();
  }, []);

  const handleUserListChange = (event) => {
    setShowUserList(event.target.checked ? 1 : 0);
  };
  
  const handleNotifyVisitorsChange = (event) => {
    setNotifyNewVisitors(event.target.checked ? 1 : 0);
  };

  const handleFileUpload = (e) => {
    const files = e.target.files;
    setUploadPostFile(files);
  };

  const handleEventTypeChange = (event, newValue) => {
    setSelectedEventType(newValue);
    setSelectedEvents(newValue);
  };

  const handleTopicChange = (event, newValue) => {
    setSelectedTopics(newValue);
  };

  const handleFormatChange = (event, newValue) => {
    setSelectedFormats(newValue);
  };

  const handleNewPostChange = (e) => {
    const { name, value } = e.target;
    setNewPostData({
      ...newPostData,
      [name]: value,
    });
    if (name === "promo") {
      setHasPromoCode(!!value);
    }
  };

 const handleDateChange = (date) => {
    const currentDate = dayjs();
    const selectedDate = dayjs(date);
  
    if (selectedDate.isBefore(currentDate)) {
      alert("Please select a date in the future.");
      return;
    }
  
    setNewPostData({
      ...newPostData,
      date: date,
    });
  };

  const handlePostDateChange = (newValue) => {
    const selectedDate = new Date(newValue);
    const currentDate = new Date();

    if (selectedDate < currentDate) {
      setNewPostData({ ...newPostData, postDate: currentDate });
    } else {
      setNewPostData({ ...newPostData, postDate: selectedDate });
    }
  };

  const handleStartDateChange = (startDate) => {
    const currentDate = dayjs();
    const selectedDate = dayjs(startDate);
  
    if (selectedDate.isBefore(currentDate)) {
      alert("Please select a date in the future.");
      return;
    }
    setNewPostData({
      ...newPostData,
      startDate: startDate,
    });
  };

  const handleEndDateChange = (endDate) => {
    setNewPostData({
      ...newPostData,
      endDate: endDate,
    });
    setFormValid(dayjs(newPostData.startDate).isBefore(dayjs(endDate)));
  };

  const handleCancel = () => {
    navigate(`/profile/${userId}`);
  };

  const handleMapClick = (coordinates) => {
    setSelectedLocation(coordinates);
    setNewPostData((prevData) => ({
      ...prevData,
      markerPosition: coordinates,
    }));
  };
  
  const handleCreateNewPost = async (event) => {
    event.preventDefault();

    const requiredFields = ["title", "content"];

    if (!selectedLocation) {
      alert("Please select a location on the map.");
      return;
    }

    for (const field of requiredFields) {
      if (!newPostData[field]) {
        alert(`The ${field} field is required`);
        return;
      }
    }

    try {
      const timestamp = newPostData.date;
      const postData = new FormData();
      postData.append("title", newPostData.title);
      postData.append("content", newPostData.content);
      if (selectedEventType.title === "Arrangement") {
        postData.append(
          "startDate",
          dayjs(newPostData.startDate).format("YYYY-MM-DD HH:mm:ss.SSS")
        );
        postData.append(
          "endDate",
          dayjs(newPostData.endDate).format("YYYY-MM-DD HH:mm:ss.SSS")
        );
      }
      
      postData.append("date", timestamp);
      postData.append("startDate",  dayjs(timestamp).format("YYYY-MM-DD HH:mm:ss.SSS"));
      postData.append("type", selectedEvents.type);
      postData.append("numberTickets", newPostData.number || 0);
      postData.append("ticketPrice", newPostData.price || 0);
      postData.append("markerPosition", JSON.stringify(newPostData.markerPosition));
      postData.append("promo", newPostData.promo);
      postData.append("sale", newPostData.sale);
      postData.append("uses", newPostData.uses);
      postData.append("format", selectedFormats.format_name);
      postData.append("non_participant", showUserList);
      postData.append("notifications", notifyNewVisitors);
      selectedTopics.forEach((topic) => {
        postData.append("topics[]", topic.theme_name);
      });
      
      if (uploadPostFile) {
        for (const file of uploadPostFile) {
          postData.append("files", file);
          postData.append("filenames", file.name);
        }
      }
      const response = await axios.post(
        `http://localhost:3000/api/events`,
        postData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${jwtToken}`,
          },
        }
      );

      setNewPostData({
        title: "",
        content: "",
        startDate: dayjs(),
        endDate: dayjs(),
        date: dayjs(),
        type: "",
        files: "",
        filenames: "",
        markerPosition: "",
        numberTickets: 0,
        ticketPrice: 0,
        promo: "",
        format: "",
        topics: [],
      });
      setSelectedEvents("");
      navigate(`/profile/${userId}`);
    } catch (error) {
      console.error("Error while creating event:", error);
      if (error.response.status === 401) {
        localStorage.removeItem("jwtToken");
        navigate("/");
        alert("Token expired");
        window.location.reload();
      }
    }
  };

  return (
    <Box
      style={{
        marginLeft: "30%",
        border: "2px solid grey",
        padding: "20px",
        borderRadius: "20px",
        marginTop: "1%",
        textAlign: "center",
        width: "50%"
      }}
    >
      <Typography variant="h4" gutterBottom>
        Create New Event
      </Typography>
      <form onSubmit={handleCreateNewPost}>
        <Box sx={{ display: "flex" }}>
          <Box style={{ maxWidth: "500px", width: "100%" }}>
            <TextField
              label="Title"
              variant="outlined"
              fullWidth
              margin="normal"
              name="title"
              value={newPostData.title}
              onChange={handleNewPostChange}
              required
              style={{ marginTop: "-5px" }}
            />
            <TextField
              label="Content"
              variant="outlined"
              fullWidth
              margin="normal"
              name="content"
              value={newPostData.content}
              onChange={handleNewPostChange}
              required
            /><br/>
            <Autocomplete
              required
              id="type"
              name="type"
              options={events}
              getOptionLabel={(option) => option.title}
              value={selectedEventType}
              onChange={handleEventTypeChange}
              renderInput={(params) => (
                <TextField {...params} variant="outlined" label="Event Type" />
              )}
            />
            <TextField
              label="Number of tickets"
              variant="outlined"
              fullWidth
              margin="normal"
              name="number"
              type="number"
              value={newPostData.number}
              onChange={handleNewPostChange}
              required
            />
            <TextField
              label="Ticket price in ₴"
              variant="outlined"
              fullWidth
              margin="normal"
              name="price"
              type="number"
              value={newPostData.price}
              onChange={handleNewPostChange}
            />

            {selectedEventType && selectedEventType.title === "Arrangement" && (
              <Box>
                <TextField
                  label="Start date"
                  type="datetime-local"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  name="startDate"
                  value={dayjs(newPostData.startDate).format(
                    "YYYY-MM-DDTHH:mm"
                  )}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  required
                  disabled={
                    !selectedEventType ||
                    selectedEventType.title !== "Arrangement"
                  }
                />
                <TextField
                  label="End date"
                  type="datetime-local"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  name="endDate"
                  value={dayjs(newPostData.endDate).format("YYYY-MM-DDTHH:mm")}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  required
                  disabled={
                    !selectedEventType ||
                    selectedEventType.title !== "Arrangement"
                  }
                  helperText={
                    dayjs(newPostData.endDate).isBefore(dayjs(newPostData.startDate))
                      ? "The end time of the event must be later than the start time"
                      : ""
                  }
                />
              </Box>
            )}
            {selectedEventType &&
              selectedEventType.title === "No fixed duration" && (
                <TextField
                  label="Date and Time"
                  type="datetime-local"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  name="date"
                  value={dayjs(newPostData.date).format("YYYY-MM-DDTHH:mm")}
                  onChange={(e) => handleDateChange(e.target.value)}
                  required
                  disabled={
                    !selectedEventType ||
                    selectedEventType.title === "Arrangement"
                  }
                />
              )}<br/><br/>
            {topics && (
              <Autocomplete
                multiple
                id="topics"
                options={topics}
                getOptionLabel={(option) => option.theme_name}
                value={selectedTopics}
                onChange={handleTopicChange}
                renderInput={(params) => (
                  <TextField {...params} variant="outlined" label="Topics" />
                )}
              />
            )}<br/>
            {formats && (
              <Autocomplete
                id="formats"
                name="format"
                options={formats}
                getOptionLabel={(option) => option.format_name}
                value={selectedFormats}
                onChange={handleFormatChange}
                renderInput={(params) => (
                  <TextField {...params} variant="outlined" label="Format" />
                )}
              />
            )}
            <TextField
              label="Date of publication"
              type="datetime-local"
              variant="outlined"
              fullWidth
              margin="normal"
              name="date"
              value={dayjs(newPostData.postDate).format("YYYY-MM-DDTHH:mm")}
              onChange={(e) => handlePostDateChange(e.target.value)}
              required
            />
            <TextField
              label="Promo"
              variant="outlined"
              fullWidth
              margin="normal"
              name="promo"
              value={newPostData.promo}
              onChange={handleNewPostChange}
            />
            {hasPromoCode && (
              <>
                <TextField
                  label="Sale with promo in ₴"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  name="sale"
                  value={newPostData.sale}
                  onChange={handleNewPostChange}
                />
                <TextField
                  label="Number of uses"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  name="uses"
                  value={newPostData.uses}
                  onChange={handleNewPostChange}
                />
              </>
            )}
          </Box>

          <Box style={{ maxWidth: "500px", width: "100%" }}>
            <LeafletMap onMapClickEv={handleMapClick} />
            <FormControlLabel
              control={
                <Checkbox
                  checked={showUserList}
                  onChange={handleUserListChange}
                  value={showUserList ? 1 : 0}
                />
              }
              label="Show a list of users at the event for non-event participants"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={notifyNewVisitors}
                  onChange={handleNotifyVisitorsChange}
                  value={notifyNewVisitors ? 1 : 0}
                />
              }
              label="Receive notifications about new visitors"
            />
            
          </Box>
        </Box>

        <div style={{ textAlign: "center" }}>
          <>Banner: </>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            style={{
              marginTop: "10px",
              marginBottom: "10px",
              textAlign: "left",
            }}
          />
        </div>

        <Button
          type="button"
          variant="contained"
          onClick={handleCancel}
          style={{ marginRight: "25%" }}
        >
          Cancel
        </Button>
        <Button type="submit" variant="contained" color="primary"  disabled={!formValid}> 
          Create Event
        </Button>
      </form>
    </Box>
  );
}

export default EventCreationPage;