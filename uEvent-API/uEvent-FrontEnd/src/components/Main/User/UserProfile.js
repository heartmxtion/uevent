import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams, useNavigate, NavLink } from "react-router-dom";
import IconButton from "@mui/material/IconButton";
import SettingsIcon from "@mui/icons-material/Settings";
import LeafletMap from "../LeafletMapCreation";

import {
  Container,
  Typography,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Grid,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import Calendar from "../Calendar/Calendar";
import { Avatar } from "@mui/material";
import { jwtDecode } from "jwt-decode";

function UserProfile() {
  const { userId } = useParams();
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState({ name: "", login: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [events, setProfileEvents] = useState([]);
  const [createdEvents, setCreatedEvents] = useState([]);
  const jwtToken = localStorage.getItem("jwtToken");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [config, setConfig] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(0);
  const [formats, setFormats] = useState([]);
  const [topics, setTopics] = useState([]);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [showUserNamePopup, setShowUserNamePopup] = useState(false);
  const navigate = useNavigate();
  const headers = {
    Authorization: `Bearer ${jwtToken}`,
  };
  const [isEditing, setIsEditing] = useState(false);
  const [is2faOpen, setIs2faOpen] = useState(false);
  const [pass2fa, set2faPass] = useState("");
  const [displayedPass2fa, setDisplayedPass2fa] = useState("");
  const inputRef = useRef(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [newCompanyData, setNewCompanyData] = useState({
    companyName: "",
    companyEmail: "",
    markerPosition: ""
  });

  async function fetchUserData() {
    try {
      const response = await axios.get(
        `http://localhost:3000/api/users/${userId}`
      );
      const data = response.data;
      setUserData(data);
      setConfig(`http://localhost:3000/api/posts/user/${userId}`);
    } catch (error) {
      console.error("Ошибка при получении данных пользователя:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUserData();
    fetchEvents();
  }, [userId]);

  async function fetchEventsFormats(events) {
    const formatsPromises = events.map(async (event) => {
      try {
        const response = await axios.get(
          `http://localhost:3000/api/${event.event_id}/formats`
        );
        const format = response.data;
        return { eventId: event.event_id, format };
      } catch (error) {
        console.error("Error fetching formats: ", error);
        return { eventId: event.event_id, format: "No format" };
      }
    });
  
    Promise.all(formatsPromises).then((formatsData) => {
      const flattenedFormatsData = formatsData.map(item => ({
        eventId: item.eventId,
        format: item.format[0] || "No format"
      }));
      setFormats((prevFormatsData) => [
        ...prevFormatsData,
        ...flattenedFormatsData,
      ]);
    });     
  }  

  async function fetchEventsTopics(events) {
    const topicsPromises = events.map(async (event) => {
      try {
        const response = await axios.get(
          `http://localhost:3000/api/${event.event_id}/topics`
        );
        const topics = response.data;
        return { eventId: event.event_id, topics };
      } catch (error) {
        console.error("Error fetching topics: ", error);
        return { eventId: event.event_id, topics: [] };
      }
    });
  
    Promise.all(topicsPromises).then((topicsData) => {
      setTopics((prevTopicsData) => [...prevTopicsData, ...topicsData]);
    });
  }  

  const fetchEvents = async () => {
    try {
      const profileEventsResponse = await axios.get(`http://localhost:3000/api/profilevents/${userId}`, {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      });
  
      const createdEventsResponse = await axios.get(`http://localhost:3000/api/events/company/${userId}`, {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      });
  
      const profileEvents = profileEventsResponse.data;
      const createdEvents = createdEventsResponse.data;
  
      setProfileEvents(profileEvents);
      setCreatedEvents(createdEvents);
  
      fetchEventsFormats(createdEvents.concat(profileEvents));
      fetchEventsTopics(createdEvents.concat(profileEvents));
    } catch (error) {
      console.error("Error fetching events from database:", error);
    }
  };  

  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.full_name || "",
        login: userData.login || "",
        email: userData.email || "",
      });
    }
  }, [userData, config]);
  if (loading) {
    return (
      <Container style={{ textAlign: "center", marginTop: "10%" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!userData) {
    return (
      <Container style={{ textAlign: "center", marginTop: "10%" }}>
        <Typography variant="h5" gutterBottom>
          Failed to load user data.
        </Typography>
      </Container>
    );
  }

  const handleOpenPopup = (eventId) => {
    setSelectedEvent(eventId);
    setShowUserNamePopup(true);
  };
  
  const handleClosePopup = () => {
    setShowUserNamePopup(false);
  };

  const handleSaveUserNamePreference = async (showUserName, eventId) => {
    try {
      const userId = jwtDecode(jwtToken).userId;
      const response = await axios.patch(
        `http://localhost:3000/api/users/${userId}/preferences`,
        { showUserName },
        { 
          headers: {
            ...headers,
            "Event-ID": eventId 
          }
        }
      );
      setShowUserNamePopup(false);
    } catch (error) {
      console.error("Error saving user name preference for event:", eventId, error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSaveChanges = (e) => {
    e.preventDefault();
    try {
      axios
        .patch(
          `http://localhost:3000/api/users/${userId}`,
          {
            userId: userId,
            fullName: formData.name,
            email: formData.email,
            login: formData.login,
          },
          { headers: headers }
        )
        .then((response) => {
          setIsEditing(false);
          window.location.reload();
        })
        .catch((error) => {
          if (error.response.status === 401) {
            localStorage.removeItem("jwtToken");
            navigate("/");
            alert("Token expired");
            window.location.reload();
          }
        });
    } catch (error) {
      console.error("Ошибка при отправке изменённых данных:", error);
    }
  };

  const handleEditProfile = (e) => {
    e.preventDefault();
    axios
      .post(
        "http://localhost:3000/api/users/edit",
        {
          userId: userId,
        },
        { headers: headers }
      )
      .then((response) => {
        setIsEditing(true);
      })
      .catch((error) => {
        if (error.response.status === 401) {
          localStorage.removeItem("jwtToken");
          navigate("/");
          alert("Token expired");
          window.location.reload();
        }
      });
  };

  const handleCancelEdit = (e) => {
    e.preventDefault();
    setIsEditing(false);
  };

  const get2faQrCode = () => {
    axios.get(`http://localhost:3000/api/2fa/create/${userId}`, { headers: headers })
      .then((response) => {
        setQrCodeUrl(response.data.qrCodeUrl);
      })
      .catch((error) => {
        if (error.response.status === 401) {
          localStorage.removeItem("jwtToken");
          navigate("/");
          alert("Token expired");
          window.location.reload();
        }
        console.error("Ошибка при получении QR кода для двухфакторной аутентификации:", error);
      });
  };  

  const handleOpen2FA = () => {
    get2faQrCode();
    setIs2faOpen(true);
  };

  const handleCancel2FA = () => {
    setIs2faOpen(false);
  };

  const handlePass2faChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    let formattedValue = value.replace(/\s+/g, '').replace(/(\d{3})(?=\d)/g, '$1 ');

    setDisplayedPass2fa(formattedValue);
    set2faPass(value);
  };

  const handleActivate2FA = () => {
    axios
      .post(`http://localhost:3000/api/2fa/activate/${userId}`, { token: pass2fa }, { headers: headers })
      .then((response) => {
        alert('Two-factor authentication successfully activated.');
        handleCancel2FA();
        fetchUserData();
      })
      .catch((error) => {
        if (error.response) {
          if (error.response.status === 400) {
            alert("Invalid one-time password. Please try again.");
          } else if (error.response.status === 401) {
            localStorage.removeItem("jwtToken");
            navigate("/");
            alert("Token expired. Please log in again.");
            window.location.reload();
          } else {
            alert("An error occurred while activating two-factor authentication. Please try again later.");
          }
        } else {
          alert("An error occurred while processing your request. Please try again later.");
        }
        console.error(error);
      });
  };  

  const handleLogout = (e) => {
    e.preventDefault();
    axios
      .post("http://localhost:3000/api/auth/logout", {}, { headers: headers })
      .then((response) => {
        localStorage.removeItem("jwtToken");
        navigate("/");
        window.location.reload();
      })
      .catch((error) => {
        if (error.response.status === 401) {
          localStorage.removeItem("jwtToken");
          navigate("/");
          alert("Token expired");
          window.location.reload();
        }
        console.error(error);
      });
  };

  const handleOpenDeleteConfirmation = () => {
    setShowDeleteConfirmation(true);
  };
  const handleCloseDeleteConfirmation = () => {
    setShowDeleteConfirmation(false);
  };

  const handleDeleteProfile = () => {
    axios
      .delete(`http://localhost:3000/api/users/${userId}`, { headers: headers })
      .then((response) => {
        if ("admin" !== (jwtToken != null ? jwtDecode(jwtToken).role : "")) {
          localStorage.removeItem("jwtToken");
          navigate("/");
        } else {
          window.location.reload();
        }
      })
      .catch((error) => {
        if (error.response.status === 401) {
          localStorage.removeItem("jwtToken");
          navigate("/");
          alert("Token expired");
          window.location.reload();
        }
        console.error("Ошибка при удалении профиля:", error);
      });

    setShowDeleteConfirmation(false);
  };

  const handleAvatarChange = () => {
    inputRef.current.click();
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const userAvatar = new FormData();
      userAvatar.append("avatar", file);
      await axios
        .patch(`http://localhost:3000/api/users/update/avatar`, userAvatar, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${jwtToken}`,
            target: userId,
          },
        })
        .then((response) => {
          const data = response.data;
          window.location.reload();
        })
        .catch((error) => {
          console.error("Ошибка при загрузке аватара:", error);
          if (error.response.status === 401) {
            localStorage.removeItem("jwtToken");
            navigate("/");
            alert("Token expired");
            window.location.reload();
          }
        });
    }
  };

  function truncateText(text, maxLength) {
    if (text.length <= maxLength) {
      return text;
    } else {
      let truncatedText = text.substring(0, maxLength);
      while (truncatedText.charAt(truncatedText.length - 1) === " ") {
        truncatedText = truncatedText.slice(0, -1);
      }
      return truncatedText + "...";
    }
  }

  function formatDate(dateString) {
    const options = {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric"
    };
    return new Date(dateString).toLocaleString(undefined, options);
  }  

  const handleCreatePostPageNavigation = () => {
    navigate(`/create-event/${userId}`);
  };

  const handleOpenApplyDialog = () => {
    setShowApplyDialog(true);
  };
  
  const handleCloseApplyDialog = () => {
    setShowApplyDialog(false);
  };  

  const handleMapClick = (coordinates) => {
    setSelectedLocation(coordinates);
    setNewCompanyData((prevData) => ({
      ...prevData,
      markerPosition: coordinates,
    }));
  };

  const handleNewCompanyChange = (e) => {
    const { name, value } = e.target;
    setNewCompanyData({
      ...newCompanyData,
      [name]: value,
    });
  };

  const handleCreateNewCompany = async (event) => {
    event.preventDefault();

    const requiredFields = ["companyName", "companyEmail"];

    if (!selectedLocation) {
      alert("Please select a location on the map.");
      return;
    }

    for (const field of requiredFields) {
      if (!newCompanyData[field]) {
        alert(`The ${field} field is required`);
        return;
      }
    }

    try {
      const postData = new FormData();
      postData.append("companyName", newCompanyData.companyName);
      postData.append("companyEmail", newCompanyData.companyEmail);
      postData.append("markerPosition", JSON.stringify(newCompanyData.markerPosition));

      const response = await axios.post(
        `http://localhost:3000/api/companies`,
        postData,
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
        }
      );

      setNewCompanyData({
        companyName: "",
        companyEmail: "",
        markerPosition: ""
      });

      alert("Application has been successfully submitted.");
      setShowApplyDialog(false);
    } catch (error) {
      console.error("Error while applying form:", error);
      if (error.response) {
          if (error.response.status === 400) {
              alert(error.response.data.message);
          } else if (error.response.status === 401) {
              localStorage.removeItem("jwtToken");
              navigate("/");
              alert("Token expired");
              window.location.reload();
          } else {
              alert("An error occurred while processing your request.");
          }
      } else {
          alert("An error occurred while processing your request.");
      }
    }
  };

  return (
    <Box style={{ width: "81%", marginLeft: "16%" }}>
      <Box
        style={{ marginLeft: "10px", paddingBottom: "130px", width: "100%" }}
      >
        <Box>
          <Paper
            elevation={3}
            style={{ marginTop: "10px", padding: "20px", width: "100%" }}
          >
            <Box style={{ display: "flex", width: "100%" }}>
              <Box>
                <Typography variant="h4" gutterBottom>
                  User's profile
                </Typography>
                <Avatar
                  src={`http://localhost:3000/${userData.avatar}`}
                  sx={{ width: 100, height: 100, marginBottom: 2 }}
                  onClick={handleAvatarChange}
                />
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleAvatarUpload}
                  ref={inputRef}
                />
                {isEditing ? (
                  <form onSubmit={handleSaveChanges}>
                    <TextField
                      label="Name"
                      variant="outlined"
                      fullWidth
                      margin="normal"
                      name="name"
                      value={formData.name !== null ? formData.name : undefined}
                      onChange={handleChange}
                    />
                    <TextField
                      label="Login"
                      variant="outlined"
                      fullWidth
                      margin="normal"
                      name="login"
                      value={formData.login}
                      onChange={handleChange}
                    />
                    <TextField
                      label="Email"
                      variant="outlined"
                      fullWidth
                      margin="normal"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                    />
                    <Grid container justifyContent="space-between">
                      <Box>
                        <Button
                          variant="contained"
                          color="primary"
                          type="submit"
                        >
                          Save changes
                        </Button>
                        {userData && !userData["2fa_active"] && (
                          <Button
                            style={{ marginLeft: "8px" }}
                            variant="contained"
                            color="primary"
                            onClick={handleOpen2FA}
                          >
                            Activate 2FA
                          </Button>
                        )}
                        <Button
                          style={{ marginLeft: "8px" }}
                          variant="contained"
                          color="inherit"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                      </Box>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={handleOpenDeleteConfirmation}
                      >
                        Delete account
                      </Button>
                    </Grid>
                    <Dialog
                      open={is2faOpen}
                      onClose={handleCancel2FA}
                    >
                      <DialogTitle>Two-Factor Authentication</DialogTitle>
                      <DialogContent>
                        <DialogContentText>
                          Please scan the QR code using Google Authenticator and then write password form app to enable two-factor authentication.
                        </DialogContentText>
                        <div style={{ paddingBottom: '10px', textAlign: 'center' }}>
                          <img src={qrCodeUrl} alt="QR Code" style={{ maxWidth: '200px', height: 'auto' }} />
                        </div>
                        <TextField
                          autoFocus
                          margin="dense"
                          id="password"
                          label="Password"
                          type="text"
                          inputProps={{
                            maxLength: 7,
                            pattern: "[0-9]*",
                          }}
                          fullWidth
                          value={displayedPass2fa}
                          onChange={handlePass2faChange}
                        />
                      </DialogContent>
                      <DialogActions>
                        <Button
                          onClick={handleCancel2FA}
                          color="primary"
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleActivate2FA} color="primary">
                          Activate 2FA
                        </Button>
                      </DialogActions>
                    </Dialog>
                    <Dialog
                      open={showDeleteConfirmation}
                      onClose={handleCloseDeleteConfirmation}
                    >
                      <DialogTitle>Delete confirmation</DialogTitle>
                      <DialogContent>
                        <DialogContentText>
                          Are you sure you want to delete your account? This
                          action irreversible and will lead to the complete
                          removal of everything associated with your profile
                          including: login, password.
                        </DialogContentText>
                      </DialogContent>
                      <DialogActions>
                        <Button
                          onClick={handleCloseDeleteConfirmation}
                          color="primary"
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleDeleteProfile} color="error">
                          Delete account
                        </Button>
                      </DialogActions>
                    </Dialog>
                  </form>
                ) : (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Name: {userData.full_name}
                    </Typography>
                    <Typography variant="h6" gutterBottom>
                      Login: {userData.login}
                    </Typography>
                    <Typography variant="h6" gutterBottom>
                      Email: {userData.email}
                    </Typography>
                    {userData.user_id ===
                    (jwtToken != null ? jwtDecode(jwtToken).userId : "") ? (
                      <Box>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={handleEditProfile}
                        >
                          Edit profile
                        </Button>
                        {userData.hasCompany ? null : (
                          <Button
                            style={{ marginLeft: "8px" }}
                            variant="contained"
                            color="primary"
                            onClick={handleOpenApplyDialog}
                          >
                            Apply for Company Registration
                          </Button>
                        )}
                        <Button
                          style={{ marginLeft: "8px" }}
                          variant="contained"
                          color="primary"
                          onClick={handleLogout}
                        >
                          Logout
                        </Button>
                      </Box>
                    ) : (
                      <>
                        {"admin" ===
                          (jwtToken != null
                            ? jwtDecode(jwtToken).role
                            : "") && (
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={handleEditProfile}
                          >
                            Edit profile
                          </Button>
                        )}
                      </>
                    )}
                  </Box>
                )}
                <Dialog open={showApplyDialog} onClose={handleCloseApplyDialog}>
                  <DialogTitle>Apply for Company Registration</DialogTitle>
                  <DialogContent>
                    <DialogContentText>
                      Please enter the required information for company registration:
                    </DialogContentText>
                    <TextField
                      autoFocus
                      margin="dense"
                      fullWidth
                      label="Company Name"
                      name="companyName"
                      value={newCompanyData.companyName}
                      onChange={handleNewCompanyChange}
                      required
                    />
                    <TextField
                      margin="dense"
                      fullWidth
                      label="Company Email"
                      name="companyEmail"
                      value={newCompanyData.companyEmail}
                      onChange={handleNewCompanyChange}
                      required
                    />
                    <DialogContentText>
                      Select company location:
                    </DialogContentText>
                    <div style={{ marginLeft: "5%" }}>
                      <LeafletMap onMapClickEv={handleMapClick} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
                    </div>
                    <DialogContentText style={{ marginTop: "30px", width: "100%" }}>
                      After submitting the form, the company details will be verified by the administrators. The result of the check will be sent to your e-mail.
                    </DialogContentText>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={handleCloseApplyDialog} color="primary">
                      Cancel
                    </Button>
                    <Button onClick={handleCreateNewCompany} color="primary">
                      Apply
                    </Button>
                  </DialogActions>
                </Dialog>
              </Box>
              {isEditing ? null : <Calendar />}
            </Box>
          </Paper>
          {userData && userData.user_id === (jwtToken != null ? jwtDecode(jwtToken).userId : "") && (userData.hasCompany || userData.role === 'admin') && !isEditing && (
            <Paper elevation={3} style={{ padding: "20px", marginTop: "10px", width: "100%" }}>
              <Box style={{ display: "flex" }}>
                <Typography variant="h5" gutterBottom>
                  Created events
                </Typography>
                {userData && (userData.hasCompany || userData.role === 'admin') && (
                  <Button
                    variant="outlined"
                    style={{ marginBottom: "5px", marginLeft: "5px" }}
                    onClick={handleCreatePostPageNavigation}
                  >
                    Create
                  </Button>
                )}
              </Box>
              {createdEvents.map((event) => (
                <Paper
                  elevation={3}
                  style={{ padding: "15px", margin: "10px", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  key={event.event_id}
                >
                  <NavLink
                    to={`/events/event/${event.event_id}`}
                    style={{
                      display: "flex",
                      textDecoration: "none",
                      color: "inherit",
                      width: '100%',
                      justifyContent: 'flex-start',
                      alignItems: 'center',
                    }}
                  >
                    <Box style={{ marginRight: "15px" }}>
                      {event.banner && (
                        <Avatar
                          src={`http://localhost:3000/post_files/${event.banner}`}
                          alt="Banner"
                          sx={{ width: 100, height: 100, borderRadius: 0 }}
                        />
                      )}
                    </Box>
                    <Box style={{ width: "100%" }}>
                      <Typography>
                        Format:{" "}
                        {formats.find((data) => data.eventId === event.event_id)?.format.format_name || "No format"}
                      </Typography>
                      <Typography variant="h6">
                        {truncateText(event.event_name, 70)}
                      </Typography>
                      <Typography>{truncateText(event.description, 80)}</Typography>
                      <Typography>
                        Topics:{" "}
                        {topics
                          .find((data) => data.eventId === event.event_id)?.topics.map(topic => topic.theme_name).join(", ") || "No topics"}
                      </Typography>
                    </Box>
                  </NavLink>
                  <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <Typography style={{ whiteSpace: 'nowrap' }}>
                      {formatDate(event.event_start_date)}
                    </Typography>
                    Status: {event.status}
                    <br /><br /><br /><br /><br />
                  </Box>
                </Paper>
              ))}
            </Paper>
          )}
          {userData && userData.user_id === (jwtToken != null ? jwtDecode(jwtToken).userId : "") && !isEditing && (
            <Paper
              elevation={3}
              style={{ padding: "20px", marginTop: "10px", width: "100%" }}
            >
              <Box style={{ display: "flex" }}>
                <Typography variant="h5" gutterBottom>
                  Planned events
                </Typography>
              </Box>
              {events.map((event) => (
                <Paper
                  elevation={3}
                  style={{ padding: "15px", margin: "10px", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  key={event.event_id}
                >
                  <NavLink
                    to={`/events/event/${event.event_id}`}
                    style={{
                      display: "flex",
                      textDecoration: "none",
                      color: "inherit",
                      width: '100%',
                      justifyContent: 'flex-start',
                      alignItems: 'center',
                    }}
                  >
                    <Box style={{ marginRight: "15px" }}>
                      {event.banner && (
                        <Avatar
                          src={`http://localhost:3000/post_files/${event.banner}`}
                          alt="Banner"
                          sx={{ width: 100, height: 100, borderRadius: 0 }}
                        />
                      )}
                    </Box>
                    <Box style={{ width: "100%" }}>
                      <Typography>
                        Format:{" "}
                        {formats.find((data) => data.eventId === event.event_id)?.format.format_name || "No format"}
                      </Typography>
                      <Typography variant="h6">
                        {truncateText(event.event_name, 70)}
                      </Typography>
                      <Typography>{truncateText(event.description, 80)}</Typography>
                      <Typography>
                        Topics:{" "}
                        {topics
                          .find((data) => data.eventId === event.event_id)?.topics.map(topic => topic.theme_name).join(", ") || "No topics"}
                      </Typography>
                    </Box>
                  </NavLink>
                  <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <Typography style={{ whiteSpace: 'nowrap' }}>
                      {formatDate(event.event_start_date)}
                    </Typography>
                    Status: {event.status}
                    <br /><br /><br />
                    <IconButton aria-label="settings" onClick={() => handleOpenPopup(event.event_id)}>
                      <SettingsIcon />
                    </IconButton>
                  </Box>
                </Paper>
              ))}
              <Dialog
                open={showUserNamePopup}
                onClose={handleClosePopup}
              >
                <DialogTitle>Show User Name</DialogTitle>
                <DialogContent>
                  <DialogContentText>
                    Do you want to show your name in the participant list?
                  </DialogContentText>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => handleSaveUserNamePreference(true, selectedEvent)} color="primary">
                    Yes
                  </Button>
                  <Button onClick={() => handleSaveUserNamePreference(false, selectedEvent)} color="primary">
                    No
                  </Button>
                </DialogActions>
              </Dialog>
            </Paper>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default UserProfile;