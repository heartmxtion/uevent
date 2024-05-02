import React, { useState, useEffect } from "react";
import axios from "axios";
import { NavLink } from "react-router-dom";
import { Typography, Paper, Box, CircularProgress } from "@mui/material";
import { useInView } from "react-intersection-observer";
import { Avatar } from '@mui/material';

function Events({ config, sortBy, startDate, endDate, selectedStatus }) {
  const [events, setEvents] = useState([]);
  const [formats, setFormats] = useState([]);
  const [topics, setTopics] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const jwtToken = localStorage.getItem("jwtToken");
  const [ref, inView] = useInView({
    triggerOnce: true,
  });

  useEffect(() => {
    if (inView) {
      loadMoreEvents();
    }
    // eslint-disable-next-line
  }, [inView]);
  
  async function loadMoreEvents() {
    setLoadingMore(true);
    
    let endpoint = `${config}?`;
    if (sortBy) {
      endpoint += `sortBy=${sortBy}`;
    }
    if (startDate) {
      endpoint += `&startDate=${startDate}`;
    }
    if (endDate) {
      endpoint += `&endDate=${endDate}`;
    }
    if (selectedStatus) {
      endpoint += `&selectedStatus=${selectedStatus}&`;
    }
    endpoint += `page=${currentPage}`;

    try {
      const response = await axios.get(endpoint);
      const newEvents = response.data.filter(newEvent => !events.some(event => event.event_id === newEvent.event_id));
      setEvents((prevEvents) => [...prevEvents, ...newEvents]);
      setCurrentPage((prevPage) => prevPage + 1);
    
      fetchEventsFormats(newEvents);
      fetchEventsTopics(newEvents);
    } catch (error) {
      console.error("Error loading more Events:", error);
    } finally {
      setLoadingMore(false);
    }    
  }
  
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
    return new Date(dateString).toLocaleDateString(undefined, options);
  }

  return (
    <Box>
      {events.map((event) => (
        <Paper
          elevation={3}
          style={{ padding: "15px", margin: "10px" }}
          key={event.event_id}
        >
          <NavLink
            to={`/events/event/${event.event_id}`}
            style={{
              display: "flex",
              textDecoration: "none",
              color: "inherit",
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
            <Box style={{ width: "750px" }}>
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
            <Box style={{ textAlign: "right" }}>
              {formatDate(event.event_start_date)}
              <br /><br /><br /><br /><br />
              Status: {event.status}
            </Box>
          </NavLink>
        </Paper>
      ))}
      {loadingMore && (
        <div
          style={{ display: "flex", justifyContent: "center", margin: "20px" }}
        >
          <CircularProgress />
        </div>
      )}
      <div style={{ height: "10px" }} ref={loadingMore ? null : ref} />
    </Box>
  );
}

export default Events;