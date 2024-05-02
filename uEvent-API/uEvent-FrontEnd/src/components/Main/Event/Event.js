import React, { useState, useEffect } from "react";
import { useParams, useNavigate, NavLink } from "react-router-dom";
import {
  Paper,
  Typography,
  Box,
  Container,
  List,
  TextField,
  Button,
  CircularProgress,
  Autocomplete,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Grid,
  Avatar,
} from "@mui/material";
import MaskedInput from "react-text-mask";
import { Checkbox, FormControlLabel } from "@mui/material";
import {
  ThumbUpAlt,
  ThumbUpOffAlt,
  ThumbDownAlt,
  ThumbDownOffAlt,
} from "@mui/icons-material";
import axios from "axios";
import Comment from "../Comment";
import { useInView } from "react-intersection-observer";
import { jwtDecode } from "jwt-decode";
import EventMap from "./EventMap";

function Event() {
  const { eventId } = useParams();
  const [postData, setPostData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [formats, setFormats] = useState([]);
  const [topics, setTopics] = useState([]);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState([]);
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [userDisliked, setUserDisliked] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPostData, setEditedPostData] = useState(null);
  const [selectedFormats, setSelectedFormats] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isUserListOpen, setUsersListOpen] = useState(false);
  const [isParticipant, setIsParticipant] = useState(true);
  const [userList, setUserList] = useState([]);
  const [isCompanyOpen, setCompanyOpen] = useState(false);
  const [companyInfo, setCompanyInfo] = useState([]);
  const [files, setFiles] = useState([]);
  const navigate = useNavigate();
  const [showStatusChange, setShowStatusChange] = useState(false);
  const [showName, setShowName] = useState(false);
  const [promo, setPromo] = useState("");

  const jwtToken = localStorage.getItem("jwtToken");
  const headers = {
    Authorization: `Bearer ${jwtToken}`,
  };
  const [ref, inView] = useInView({
    triggerOnce: true,
  });
  useEffect(() => {
    if (inView) {
      loadMoreComments();
    }
    // eslint-disable-next-line
  }, [inView]);

  const handlePostEdit = () => {
    setIsEditing(true);
    setEditedPostData(postData);
  };

  const [allFormats, setAllFormats] = useState([]);
  const [allTopics, setAllTopics] = useState([]);
  const userId = jwtToken != null ? jwtDecode(jwtToken).userId : null;
  useEffect(() => {
    async function fetchFormats() {
      try {
        const response = await axios.get("http://localhost:3000/api/formats");
        setAllFormats(
          response.data.map((category) => ({
            id: category.format_id,
            title: category.format_name,
          }))
        );
      } catch (error) {
        console.error("Ошибка при получении категорий:", error);
      }
    }

    fetchFormats();
  }, []);
  useEffect(() => {
    async function fetchTopics() {
      try {
        const response = await axios.get("http://localhost:3000/api/topics");
        setAllTopics(
          response.data.map((category) => ({
            id: category.theme_id,
            title: category.theme_name,
          }))
        );
      } catch (error) {
        console.error("Ошибка при получении категорий:", error);
      }
    }

    fetchTopics();
  }, []);

  async function loadMoreComments() {
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const response = await axios.get(
        `http://localhost:3000/api/events/${eventId}/comments?page=${nextPage}`,
        { headers: headers }
      );
      const newComments = response.data;
      setComments((prevComments) => [...prevComments, ...newComments]);
      setCurrentPage(nextPage);
    } catch (error) {
      console.error(
        "Ошибка при загрузке следующей порции комментариев:",
        error
      );
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    async function fetchPostFiles() {
      try {
        const response = await axios.get(
          `http://localhost:3000/api/events/${eventId}/files`
        );
        const files = response.data;

        console.log(response.data);
        setFiles(files);
      } catch (error) {
        console.error("Ошибка при получении файлов: ", error);
      }
    }
    fetchPostFiles();
  }, [eventId]);

  useEffect(() => {
    async function fetchReactions() {
      try {
        axios
          .get(`http://localhost:3000/api/like/events/${eventId}`)
          .then((response) => {
            const data = response.data;
            const likes = data.likes;
            const dislikes = data.dislikes;
            setLikes(likes.length);
            setDislikes(dislikes.length);
            const liked = likes.some((like) => like.user_id === userId);
            const disliked = dislikes.some(
              (dislike) => dislike.user_id === userId
            );
            if (liked === true) {
              setUserLiked(!userLiked);
            }
            if (disliked === true) {
              setUserDisliked(!userDisliked);
            }
          })
          .catch((error) => {
            console.error("Ошибка при получении реакций: ", error);
          });
      } catch (error) {
        console.error("Ошибка при получении реакций: ", error);
      }
    }
    fetchReactions();
    // eslint-disable-next-line
  }, [eventId, jwtToken]);

  function extractCoordinates(location) {
    try {
      const { lat, lng } = JSON.parse(location);
      return { lat, lng };
    } catch (error) {
      console.error("Ошибка при извлечении координат: ", error);
      return { lat: 0, lng: 0 };
    }
  }

  function handleLike() {
    if (userLiked === false) {
      axios
        .post(
          `http://localhost:3000/api/like/events/${eventId}`,
          { type: "like" },
          { headers: headers }
        )
        .then((response) => {
          setUserLiked(!userLiked);
          setUserDisliked(false);
          setLikes(likes + 1);
        })
        .catch((error) => {
          console.error("Ошибка при сохранении лайка:", error);
          if (error.response.status === 401) {
            localStorage.removeItem("jwtToken");
            navigate("/");
            alert("Token expired");
            window.location.reload();
          }
        });
    } else {
      axios
        .delete(`http://localhost:3000/api/like/events/${eventId}`, {
          headers: headers,
        })
        .then((response) => {
          setUserLiked(!userLiked);
          setLikes(likes - 1);
        })
        .catch((error) => {
          console.error("Ошибка при сохранении лайка:", error);
          if (error.response.status === 401) {
            localStorage.removeItem("jwtToken");
            navigate("/");
            alert("Token expired");
            window.location.reload();
          }
        });
    }
    if (userDisliked === true) {
      setDislikes(dislikes - 1);
    }
  }

  function handleDislike() {
    if (userDisliked === false) {
      axios
        .post(
          `http://localhost:3000/api/like/events/${eventId}`,
          { type: "dislike" },
          { headers: headers }
        )
        .then((response) => {
          setUserDisliked(!userDisliked);
          setUserLiked(false);
          setDislikes(dislikes + 1);
        })
        .catch((error) => {
          console.error("Ошибка при сохранении лайка:", error);
          if (error.response.status === 401) {
            localStorage.removeItem("jwtToken");
            navigate("/");
            alert("Token expired");
            window.location.reload();
          }
        });
    } else {
      axios
        .delete(`http://localhost:3000/api/like/events/${eventId}`, {
          headers: headers,
        })
        .then((response) => {
          setUserDisliked(!userDisliked);
          setDislikes(dislikes - 1);
        })
        .catch((error) => {
          console.error("Ошибка при сохранении лайка:", error);
          if (error.response.status === 401) {
            localStorage.removeItem("jwtToken");
            navigate("/");
            alert("Token expired");
            window.location.reload();
          }
        });
    }
    if (userLiked === true) {
      setLikes(likes - 1);
    }
  }

  const updateComments = async () => {
    try {
      const response = await axios.get(
        `http://localhost:3000/api/events/${eventId}/comments`
      );
      const updatedComments = response.data;
      setCurrentPage(0);
      setComments(updatedComments);
    } catch (error) {
      console.error("Ошибка при загрузке комментариев:", error);
    }
  };

  const handleFileUpload = (e) => {
    const files = e.target.files;
    setUploadPostFile([...uploadPostFile, ...files]);
  };

  useEffect(() => {
    async function fetchPostFormats() {
      try {
        const response = await axios.get(
          `http://localhost:3000/api/${eventId}/formats`
        );
        const format = response.data;
        setFormats(format[0].format_name);
        setSelectedFormats(
          format.map((category) => ({
            id: category.format_id,
            title: category.format_name,
          }))
        );
      } catch (error) {
        console.error("Ошибка при получении категорий: ", error);
      }
    }

    async function fetchPostTopics() {
      try {
        const response = await axios.get(
          `http://localhost:3000/api/${eventId}/topics`
        );
        const topicsPost = response.data;
        setTopics(topicsPost);
        setSelectedTopics(
          topicsPost.map((category) => ({
            id: category.theme_id,
            title: category.theme_name,
          }))
        );
      } catch (error) {
        console.error("Ошибка при получении категорий: ", error);
      }
    }

    async function fetchPostData() {
      try {
        const response = await axios.get(
          `http://localhost:3000/api/events/${eventId}`
        );
        const post = response.data;
        setPostData(post);
      } catch (error) {
        console.error("Ошибка при получении поста: ", error);
      }
    }

    async function fetchUserData() {
      try {
        const userId = jwtToken != null ? jwtDecode(jwtToken).userId : null;
        
        if (userId != null) {
          const response = await axios.get(
            `http://localhost:3000/api/users/${userId}`
          );
          const user = response.data;
          setUserData(user);
        }
      } catch (error) {
        console.error("Ошибка при получении данных пользователя:", error);
      }
    }

    fetchPostFormats();
    fetchPostTopics();
    fetchPostData();
    fetchUserData();
  }, [eventId, formats]);

  function formatDate(dateString) {
    const options = {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }

  function handleCommentChange(event) {
    setComment(event.target.value);
  }

  async function handleCommentSubmit() {
    const userId = jwtToken != null ? jwtDecode(jwtToken).userId : null;

    if (!userId) {
      console.error("Ошибка: Пользователь не авторизован");
      alert("Пожалуйста, сперва авторизуйтесь!");
      navigate("/");
      return;
    }
    if (comment === "") {
      return;
    }
    try {
      await axios
        .post(
          `http://localhost:3000/api/events/${eventId}/comments`,
          {
            parentId: 0,
            content: comment,
          },
          { headers: headers }
        )
        .then((response) => {
          const newComment = response.data;
          comments.unshift(newComment);
          setComment("");
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
      console.error("Ошибка при добавлении комментария:", error);
    }
  }
  async function handleDownload(filePath) {
    try {
      const file = filePath.split("/").pop();
      const response = await axios.get(
        `http://localhost:3000/api/files/${file}`,
        {
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filePath);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Ошибка при скачивании файла: ", error);
    }
  }

  const handleCategoryChange = (event, newValue) => {
    setSelectedFormats(newValue);
  };
  const handleTopicChange = (event, newValue) => {
    setSelectedTopics(newValue);
    console.log(newValue);
  };

  const [uploadPostFile, setUploadPostFile] = useState([]);
  const handleSaveChanges = () => {
    try {
      const postData = new FormData();
      const selectedFormatsIds = selectedFormats.map(
        (format) => format.id
      );
      const selectedTopicsIds = selectedTopics.map(
        (topic) => topic.id
      );
      postData.append("event_name", editedPostData.event_name);
      postData.append("description", editedPostData.description);
      postData.append("number_of_tickets", editedPostData.number_of_tickets);
      postData.append("ticket_price", editedPostData.ticket_price);
      postData.append('formats', selectedFormatsIds.join(","));
      postData.append('themes', selectedTopicsIds.join(","))
      postData.append("currentUserId", userId)
      uploadPostFile.forEach((file) => {
        postData.append("files", file);
      });
      axios
        .patch(`http://localhost:3000/api/events/${eventId}`, postData, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${jwtToken}`,
          },
        })
        .then((response) => {
          setIsEditing(false);
          window.location.reload();
        })
        .catch((error) => {
          console.error("Ошибка при редактировании публикации", error);
          if (error.response.status === 401) {
            localStorage.removeItem("jwtToken");
            navigate("/");
            alert("Token expired");
            window.location.reload();
          }
        });
    } catch (error) {
      console.error("Ошибка при сохранении изменений публикации: ", error);
    }
  };

  const handleOpenStatusChange = () => {
    setShowStatusChange(true);
  };

  const handleCloseStatusChange = () => {
    setShowStatusChange(false);
  };

  const handleStatusChangeConfirm = () => {
    axios
      .patch(
        `http://localhost:3000/api/status/events/${eventId}`,
        {},
        {
          headers: headers,
        }
      )
      .then((response) => {
        window.location.reload();
      })
      .catch((error) => {
        if (error.response) {
          if (error.response.status === 400) {
            alert("Cannot change status of completed event");
          } else if (error.response.status === 401) {
            localStorage.removeItem("jwtToken");
            navigate("/");
            alert("Token expired");
            window.location.reload();
          }
        }
      });
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCVC, setCardCVC] = useState("");
  const [isCardNumberValid, setIsCardNumberValid] = useState(false);
  const [isCardExpiryValid, setIsCardExpiryValid] = useState(false);
  const [isCardCVCValid, setIsCardCVCValid] = useState(false);
  const [cardHolderName, setCardHolderName] = useState("");
  const [cardHolderLastName, setCardHolderLastName] = useState("");

  const handleBuyTicketClick = () => {
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
  };

  const handleConfirmBuyTicket = () => {
    const data = {
      cardNumber: cardNumber.replace(/\s/g, ""),
      cardExpiry,
      cardCVC,
      cardHolderName,
      cardHolderLastName,
      eventId,
      promo,
      showName,
    };

    axios
      .post(`http://localhost:3000/api/payment`, data, {
        headers: headers,
      })
      .then((response) => {
        alert("Payment successful!");
        handleDialogClose();
        window.location.reload();
      })
      .catch((error) => {
        if (error.response) {
          if (error.response.status === 401) {
            localStorage.removeItem("jwtToken");
            navigate("/");
            alert("Token expired");
            window.location.reload();
          }
        }
      });
  };

  const validateCardNumber = (cardNumber) => {
    const cardNumberWithoutSpaces = cardNumber.replace(/\s/g, "");

    if (!/^\d{16}$/.test(cardNumberWithoutSpaces)) {
      return false;
    }

    let sum = 0;
    let doubleUp = false;
    for (let i = cardNumberWithoutSpaces.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumberWithoutSpaces.charAt(i));
      if (doubleUp) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      sum += digit;
      doubleUp = !doubleUp;
    }
    return sum % 10 === 0;
  };

  const handleCardNumberChange = (e) => {
    const value = e.target.value;
    setCardNumber(value);
    const isValid = validateCardNumber(value);
    setIsCardNumberValid(isValid);
  };

  const handleExpiryChange = (e) => {
    let value = e.target.value;
    const [month, year] = value.split("/").map((item) => parseInt(item, 10));
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;
    if (month > 12) {
      value = `01${year}`;
    }

    const isFutureDate =
      year > currentYear || (year === currentYear && month >= currentMonth);
    setIsCardExpiryValid(isFutureDate);
    setCardExpiry(value);
  };

  const checkFullValid = () => {
    const isTicketsAvailable = postData && postData?.number_of_tickets > 0;
    let isEventNotExpired = false;
    if (postData?.status === "active") {
      isEventNotExpired = true;
    }

    return (
      isCardExpiryValid &&
      isCardNumberValid &&
      isCardCVCValid &&
      cardHolderName &&
      cardHolderLastName &&
      isTicketsAvailable &&
      isEventNotExpired
    );
  };

  const checkSemiValid = () => {
    const isTicketsAvailable = postData && postData?.number_of_tickets > 0;
    let isEventNotExpired = false;
    if (postData?.status === "active") {
      isEventNotExpired = true;
    }

    return isTicketsAvailable && isEventNotExpired;
  };

  const handleCVCChange = (e) => {
    const value = e.target.value;
    const truncatedValue = value.slice(0, 4);
    setCardCVC(truncatedValue);
    if (truncatedValue.length === 4 || truncatedValue.length === 3) {
      setIsCardCVCValid(true);
    } else setIsCardCVCValid(false);
  };

  async function fetchUsers() {
    try {
      const response = await axios.get(
        `http://localhost:3000/api/${eventId}/userslist`,
        { headers: headers }
      );

      setUserList(response.data.users);
    } catch (error) {
      console.error("Ошибка при получении списка пользователей: ", error);
      if (
        error.response &&
        error.response.status === 403 &&
        error.response.data.error === "Not a participant"
      ) {
        setIsParticipant(false);
      }
    }
  }

  async function fetchCompany() {
    try {
      const response = await axios.get(
        `http://localhost:3000/api/${eventId}/company/info`
      );

      console.log(response.data);
      setCompanyInfo(response.data);
    } catch (error) {
      console.error("Error while getting company info: ", error);
    }
  }

  const handleOpenUserList = () => {
    fetchUsers();
    setUsersListOpen(true);
  };

  const handleCloseUserList = () => {
    setUsersListOpen(false);
  };

  const handleOpenCompany = () => {
    fetchCompany();
    setCompanyOpen(true);
  };

  const handleCloseCompany = () => {
    setCompanyOpen(false);
  };

  const handleShowUserName = (event) => {
    setShowName(event.target.checked);
  };

  return (
    <Container style={{ marginTop: "2rem", paddingBottom: "80px" }}>
      <Box>
        {postData && postData.banner && (
          <img
            src={`http://localhost:3000/post_files/${postData.banner}`}
            alt="Banner"
            style={{
              width: "100%",
              height: "200px",
              objectFit: "cover",
              objectPosition: "center",
            }}
          />
        )}
      </Box>
      {isEditing ? (
        <Box>
          <Paper
            elevation={3}
            style={{ padding: "20px", marginBottom: "10px" }}
          >
            <Typography variant="h5" gutterBottom>
              Editing
            </Typography>
            <TextField
              label="Title"
              variant="outlined"
              fullWidth
              margin="normal"
              name="title"
              value={editedPostData ? editedPostData.event_name : ""}
              onChange={(e) =>
                setEditedPostData({
                  ...editedPostData,
                  event_name: e.target.value,
                })
              }
              required
            />
            <TextField
              label="Description"
              variant="outlined"
              fullWidth
              margin="normal"
              name="description"
              value={editedPostData ? editedPostData.description : ""}
              onChange={(e) =>
                setEditedPostData({
                  ...editedPostData,
                  description: e.target.value,
                })
              }
              required
            />
            {topics && (
              <Autocomplete
                multiple
                id="topics"
                options={allTopics}
                getOptionLabel={(option) => option.title}
                value={selectedTopics}
                onChange={handleTopicChange}
                renderInput={(params) => (
                  <TextField {...params} variant="outlined" label="Topics" />
                )}
              />
            )}
            {formats && (
              <Autocomplete
                multiple
                id="formats"
                options={allFormats}
                value={selectedFormats}
                onChange={handleCategoryChange}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                getOptionLabel={(option) => option.title}
                renderInput={(params) => (
                  <TextField {...params} variant="outlined" label="Formats" />
                )}
              />
            )}
            <TextField
              label="Number of tickets"
              variant="outlined"
              fullWidth
              margin="normal"
              name="number"
              type="number"
              value={editedPostData ? editedPostData.number_of_tickets : ""}
              onChange={(e) =>
                setEditedPostData({
                ...editedPostData,
                number_of_tickets: e.target.value,
              })}
              required
            />
            <TextField
              label="Ticket price in ₴"
              variant="outlined"
              fullWidth
              margin="normal"
              name="price"
              type="number"
              value={editedPostData ? editedPostData.ticket_price : ""}
              onChange={(e) =>
                setEditedPostData({
                ...editedPostData,
                ticket_price: e.target.value,
              })}
            />
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
            />
            <br />
            <br />
            <Alert severity="warning">
            Warning! Uploaded files are not detected when editing. Make sure that
            you downloaded banner again.
            </Alert>
            <br />
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Box>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveChanges}
                >
                  Save changes
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  style={{ marginLeft: "8px" }}
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          </Paper>
        </Box>
      ) : (
        <Box>
          <Paper
            elevation={3}
            style={{ padding: "20px", marginBottom: "10px" }}
          >
            <Box>
              <Box style={{ display: "flex", marginBottom: "20px" }}>
                <Box
                  style={{
                    marginLeft: "10px",
                    marginTop: "5px",
                    display: "flex",
                  }}
                >
                  <Dialog
                    open={isUserListOpen}
                    onClose={handleCloseUserList}
                    fullWidth
                    maxWidth="sm"
                  >
                    <DialogTitle>Visitors list</DialogTitle>
                    <DialogContent>
                      {userList.length > 0 ? (
                        userList.map((user) => (
                          <NavLink
                            to={`/profile/${user.user_id}`}
                            key={user.user_id}
                            style={{ textDecoration: "none", color: "inherit" }}
                          >
                            <Paper
                              elevation={3}
                              style={{
                                padding: "10px",
                                margin: "10px",
                                display: "flex",
                                alignItems: "center",
                                cursor: "pointer",
                              }}
                            >
                              <Avatar
                                src={
                                  `http://localhost:3000/${user.avatar}` || ""
                                }
                                alt="Avatar"
                                sx={{
                                  width: 50,
                                  height: 50,
                                  borderRadius: "50%",
                                  marginRight: "10px",
                                }}
                              />
                              <div>
                                <Typography variant="subtitle1">
                                  {user.login}
                                </Typography>
                                <Typography variant="body2">
                                  {user.full_name || ""}
                                </Typography>
                              </div>
                            </Paper>
                          </NavLink>
                        ))
                      ) : (
                        <Typography variant="body1">
                          {isParticipant
                            ? "No one has bought tickets for this event yet. Be the first one!"
                            : "The user list for this event is only visible to event guests."}
                        </Typography>
                      )}
                      {loadingMore && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            margin: "20px",
                          }}
                        >
                          <CircularProgress />
                        </div>
                      )}
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={handleCloseUserList} color="primary">
                        Close
                      </Button>
                    </DialogActions>
                  </Dialog>
                  <Dialog
                    open={showStatusChange}
                    onClose={handleCloseStatusChange}
                  >
                    <DialogTitle>Changing status</DialogTitle>
                    <DialogContent>
                      <DialogContentText>
                        Are you sure you want to change the status of this event?
                        If the publication status is active, other users can see
                        and comment on it, otherwise this is not possible.
                      </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={handleCloseStatusChange} color="primary">
                        Cancel
                      </Button>
                      <Button onClick={handleStatusChangeConfirm} color="error">
                        Change status
                      </Button>
                    </DialogActions>
                  </Dialog>
                  <Dialog open={isCompanyOpen} onClose={handleCloseCompany}>
                    <DialogTitle>Organizer Info</DialogTitle>
                    <DialogContent>
                      <Typography variant="subtitle1" gutterBottom>
                        Company name: {companyInfo.company_name}
                      </Typography>
                      <Typography variant="subtitle1" gutterBottom>
                        Email: {companyInfo.email}
                      </Typography>
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={handleCloseCompany} color="primary">
                        Close
                      </Button>
                    </DialogActions>
                  </Dialog>
                  <Box style={{ width: "950px" }}>
                    <Typography
                      variant="h6"
                      gutterBottom
                      style={{ fontWeight: "bold" }}
                    >
                      {postData ? postData.event_name : ""}
                    </Typography>
                    <Typography variant="subtitle1" gutterBottom>
                      Topics:{" "}
                      {topics.map((topic) => topic.theme_name).join(", ")}
                    </Typography>
                    <Typography variant="subtitle1" gutterBottom>
                      Description: {postData ? postData.description : ""}
                    </Typography>

                    {postData && (
                      <EventMap {...extractCoordinates(postData.locationOf)} />
                    )}
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Date: {formatDate(postData?.event_start_date)}
                    </Typography>
                    <Typography variant="subtitle1" gutterBottom>
                      Format: {formats}
                    </Typography>
                    <Typography variant="subtitle1" gutterBottom>
                      Status: {postData?.status}
                    </Typography>
                    <Paper sx={{ padding: "5px" }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Number of tickets: {postData?.number_of_tickets}
                      </Typography>
                      <Typography variant="subtitle1" gutterBottom>
                        Ticket price: {postData?.ticket_price}₴
                      </Typography>
                      <Button
                        onClick={handleBuyTicketClick}
                        disabled={!checkSemiValid()}
                      >
                        Buy ticket
                      </Button>
                      <Dialog open={isDialogOpen} onClose={handleDialogClose}>
                        <DialogTitle>Buy Ticket</DialogTitle>
                        <DialogContent>
                          <Grid container spacing={2}>
                            <Grid item xs={12}>
                              <MaskedInput
                                mask={[
                                  /\d/,
                                  /\d/,
                                  /\d/,
                                  /\d/,
                                  " ",
                                  /\d/,
                                  /\d/,
                                  /\d/,
                                  /\d/,
                                  " ",
                                  /\d/,
                                  /\d/,
                                  /\d/,
                                  /\d/,
                                  " ",
                                  /\d/,
                                  /\d/,
                                  /\d/,
                                  /\d/,
                                ]}
                                guide={false}
                                value={cardNumber}
                                onChange={handleCardNumberChange}
                                render={(ref, props) => (
                                  <TextField
                                    {...props}
                                    inputRef={ref}
                                    label="Card Number"
                                    fullWidth
                                  />
                                )}
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <MaskedInput
                                mask={[/\d/, /\d/, "/", /\d/, /\d/]}
                                value={cardExpiry}
                                onChange={handleExpiryChange}
                                render={(ref, props) => (
                                  <TextField
                                    {...props}
                                    inputRef={ref}
                                    label="Expiry Date"
                                    fullWidth
                                  />
                                )}
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <TextField
                                label="CVV"
                                type="password"
                                inputProps={{ maxLength: 4 }}
                                value={cardCVC}
                                onChange={handleCVCChange}
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <TextField
                                label="Card Holder's First Name"
                                value={cardHolderName}
                                onChange={(e) =>
                                  setCardHolderName(e.target.value)
                                }
                                fullWidth
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <TextField
                                label="Card Holder's Last Name"
                                value={cardHolderLastName}
                                onChange={(e) =>
                                  setCardHolderLastName(e.target.value)
                                }
                                fullWidth
                              />
                            </Grid>
                          </Grid>
                          <Box sx={{ marginTop: "15px" }}>
                            <TextField
                              label="Promocode"
                              value={promo}
                              onChange={(e) => setPromo(e.target.value)}
                              fullWidth
                            />
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={showName}
                                  onChange={handleShowUserName}
                                />
                              }
                              label="
                            Don't show me in the list of event participants"
                            />
                          </Box>
                        </DialogContent>
                        <DialogActions>
                          <Button onClick={handleDialogClose} color="primary">
                            Cancel
                          </Button>
                          <Button
                            onClick={handleConfirmBuyTicket}
                            color="primary"
                            disabled={!checkFullValid()}
                          >
                            Confirm
                          </Button>
                        </DialogActions>
                      </Dialog>
                    </Paper>
                  </Box>
                </Box>
              </Box>

              <Box style={{ display: "flex" }}>
                <Box style={{ width: "900px" }}>
                  {jwtToken != null && (
                    <>
                      <Button onClick={handleOpenUserList}>Show users</Button>
                      <Button onClick={handleOpenCompany}>
                        Show company info
                      </Button>
                    </>
                  )}
                  {("admin" === (jwtToken != null ? jwtDecode(jwtToken).role : "") || postData?.company_id === userData?.companyId) && (
                    <>
                      <Button onClick={handlePostEdit}>Edit</Button>
                      <Button onClick={handleOpenStatusChange}>Change status</Button>
                    </>
                  )}
                </Box>
                <Box>
                  <Button variant={"text"} color="primary" onClick={handleLike}>
                    {userLiked ? <ThumbUpAlt /> : <ThumbUpOffAlt />}
                    {likes}
                  </Button>
                  <Button
                    variant={"text"}
                    color="secondary"
                    onClick={handleDislike}
                  >
                    {userDisliked ? <ThumbDownAlt /> : <ThumbDownOffAlt />}
                    {dislikes}
                  </Button>
                </Box>
              </Box>
            </Box>
          </Paper>
          {postData ? (
            <Paper
              elevation={3}
              style={{ padding: "20px", marginBottom: "40px" }}
            >
              <Typography variant="h6" gutterBottom>
                Comments:
              </Typography>
              {postData.status === "active" ? (
                <>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    variant="outlined"
                    label="Write a comment"
                    value={comment}
                    onChange={handleCommentChange}
                    margin="normal"
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleCommentSubmit}
                  >
                    Send a comment
                  </Button>
                </>
              ) : null}
              <List>
                {comments.map((comment) => (
                  <Box key={comment.id}>
                    <Comment
                      comment={comment}
                      updateComments={updateComments}
                      postData={postData}
                    />
                  </Box>
                ))}
              </List>
              {loadingMore && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    margin: "20px",
                  }}
                >
                  <CircularProgress />
                </div>
              )}
              <div style={{ height: "10px" }} ref={loadingMore ? null : ref} />
            </Paper>
          ) : null}
        </Box>
      )}
    </Container>
  );
}

export default Event;