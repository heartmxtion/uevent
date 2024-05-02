import axios from "axios";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, NavLink } from "react-router-dom";
import {
  Paper,
  Typography,
  Box,
  ListItem,
  Button,
  TextField,
  Avatar
} from "@mui/material";
import {
  ThumbUpAlt,
  ThumbUpOffAlt,
  ThumbDownAlt,
  ThumbDownOffAlt,
} from "@mui/icons-material";
import { jwtDecode } from "jwt-decode";
import HoverTransition from "./HoverTransition";

function Comment({ comment, updateComments, postData }) {
  const { postId } = useParams();
  const [user, setUser] = useState(null);
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [userDisliked, setUserDisliked] = useState(false);
  const [parentCommentUser, setParentCommentUser] = useState(null);
  const [parentComment, setParentComment] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const navigate = useNavigate();
  const jwtToken = localStorage.getItem("jwtToken");
  const headers = {
    Authorization: `Bearer ${jwtToken}`,
  };

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await axios.get(
          `http://localhost:3000/api/users/${comment.user_id}`
        );
        setUser(response.data);
      } catch (error) {
        console.error("Ошибка при получении данных пользователя:", error);
      }
    }
    fetchUser();
  }, [comment.user_id]);

  function formatDate(dateString) {
    const options = {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric"
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }

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

  useEffect(() => {
    async function fetchReactions() {
      const userId = jwtToken != null ? jwtDecode(jwtToken).userId : null;
      try {
        axios
          .get(`http://localhost:3000/api/like/comments/${comment.comment_id}`)
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
          });
      } catch (error) {
        console.error("Ошибка при получении реакций: ", error);
      }
    }
    fetchReactions();
    // eslint-disable-next-line
  }, [postId, jwtToken]);

  function handleLike() {
    if (userLiked === false) {
      axios
        .post(
          `http://localhost:3000/api/like/comments/${comment.comment_id}`,
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
        .delete(`http://localhost:3000/api/like/comments/${comment.comment_id}`, {
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
          `http://localhost:3000/api/like/comments/${comment.comment_id}`,
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
        .delete(`http://localhost:3000/api/like/comments/${comment.comment_id}`, {
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

  const handleCommentEdit = () => {
    setEditing(true);
    setEditedContent(comment.content);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditedContent(comment.content);
  };

  const handleSaveEdit = async () => {
    try {
      await axios.patch(
        `http://localhost:3000/api/comments/${comment.comment_id}`,
        {
          content: editedContent,
        },
        { headers: headers }
      );
      setEditing(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.addEventListener("scroll", () => {
        if (window.scrollY === 0) {
          window.removeEventListener("scroll", () => {});
          updateComments();
        }
      });
    } catch (error) {
      if (error.response.status === 401) {
        localStorage.removeItem("jwtToken");
        navigate("/");
        alert("Token expired");
        window.location.reload();
      }
      console.error(
        "Ошибка при сохранении редактированного комментария:",
        error
      );
    }
  };

  const handleDelete = async () => {
    try {
      await axios
        .delete(`http://localhost:3000/api/comments/${comment.comment_id}`, {
          headers: headers,
        })
        .then((response) => {
          window.scrollTo({ top: 0, behavior: "smooth" });
          setEditing(false);
          window.addEventListener("scroll", () => {
            if (window.scrollY === 0) {
              window.removeEventListener("scroll", () => {});
              updateComments();
            }
          });
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
      console.error("Ошибка при удалении комментария:", error);
    }
  };

  return (
    <ListItem sx={{ margin: "2px" }}>
      <Paper elevation={3} sx={{ padding: "15px" }}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {user && (
            <Box>
              <Box sx={{ display: "flex" }}>
                <NavLink to={`/profile/${user.user_id}`}>
                  <Avatar
                    src={`http://localhost:3000/${user.avatar}`}
                    style={{
                      borderRadius: "50%",
                      width: 70,
                      height: 70,
                      marginRight: 8,
                    }}
                  />
                </NavLink>
                <Box sx={{ width: "400px" }}>
                  <Typography variant="subtitle1">
                    {truncateText(user.login, 15)}{" "}
                    {parentComment && parentCommentUser
                      ? "Answer to: " +
                        truncateText(parentCommentUser.login, 10)
                      : null}{" "}
                  </Typography>
                  {editing ? (
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      variant="outlined"
                      label="Edit your comment"
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      margin="normal"
                    />
                  ) : (
                    <Typography>{comment.content}</Typography>
                  )}
                </Box>

                <Box sx={{ marginLeft: "430px" }}>
                  <Typography variant="caption">
                    Publicated: {formatDate(comment.publish_date)}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ marginLeft: "60px", display: "flex" }}>
                <Box
                  sx={{
                    display: "flex",
                    width: "100%",
                    justifyContent: "space-between",
                  }}
                >
                  <Box sx={{ justifyContent: "left" }}>
                    {!editing ? (
                      <>
                        {postData.status === "active" ? (
                          <>
                            {comment.user_id ===
                            (jwtToken != null
                              ? jwtDecode(jwtToken).userId
                              : "") ? (
                              <Button
                                sx={{ left: "-8px" }}
                                onClick={handleCommentEdit}
                              >
                                Edit
                              </Button>
                            ) : null}
                          </>
                        ) : null}
                        <Button
                          variant={"text"}
                          color="primary"
                          onClick={handleLike}
                        >
                          {userLiked ? <ThumbUpAlt /> : <ThumbUpOffAlt />}
                          {likes}
                        </Button>
                        <Button
                          variant={"text"}
                          color="secondary"
                          onClick={handleDislike}
                        >
                          {userDisliked ? (
                            <ThumbDownAlt />
                          ) : (
                            <ThumbDownOffAlt />
                          )}
                          {dislikes}
                        </Button>
                      </>
                    ) : (
                      <Box sx={{ display: "flex" }}>
                        <Box>
                          <Button onClick={handleSaveEdit}>Save</Button>
                          <Button onClick={handleCancelEdit}>Cancel</Button>
                        </Box>
                        <HoverTransition activation={handleDelete} />
                      </Box>
                    )}
                  </Box>
                  <Box sx={{width: '220px'}}>
                    <Box sx={{display: 'flex', alignItems: 'center'}}></Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>
    </ListItem>
  );
}

export default Comment;