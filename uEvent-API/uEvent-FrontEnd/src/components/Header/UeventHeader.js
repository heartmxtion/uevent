import axios from "axios";
import { React, useState, useEffect, useRef } from "react";
import { ListItem, Avatar, Tooltip, Box } from "@mui/material";
import { useLocation } from "react-router-dom";

import IconButton from "@mui/material/IconButton";
import PersonIcon from "@mui/icons-material/Person";
import EventIcon from "@mui/icons-material/Event";

import {
  Header,
  Logo,
  HeaderList,
  Search,
  HeaderContainer,
  StyledNavLink,
  SearchWrapper,
  Searchs,
  SearchInputWrapper,
  SearchResultsContent,
  SearchResultsContentText,
  SearchResultsWrapper,
} from "./UeventHeader.styles";
import { jwtDecode } from "jwt-decode";
import { useParams, useNavigate } from "react-router-dom";

function UeventHeader() {
  const [error, setError] = useState(null);
  const [findedUsers, setFindedUsers] = useState([]);
  const [findedEvents, setFindedEvents] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const inputRef = useRef(null);
  const jwtToken = localStorage.getItem("jwtToken");
  const [userData, setUserData] = useState([]);
  const currentUserId = jwtToken != null ? jwtDecode(jwtToken).userId : 0;
  const navigate = useNavigate();
  const location = useLocation();
  const loginPagePaths = ["/", "/profile/0", "/register"];
  const isLoginPage = loginPagePaths.includes(location.pathname);
  const isConfirmPage = location.pathname.startsWith("/confirm");
  const isRecoverPage = location.pathname.startsWith("/recover");
  const isResetPassPage = location.pathname.startsWith("/reset-password");
  const [isPersonIcon, setIsPersonIcon] = useState(true);

  const handleIconChange = () => {
      setIsPersonIcon(prevState => !prevState);
  };

  async function userSearch(props) {
    try {
      const response = await axios.get(
        `http://localhost:3000/api/search/users?search=${props}`
      );
      const users = response.data;
      const findedUsers = users.list;
      setFindedUsers(findedUsers);
      console.log(findedUsers);
    } catch (error) {
      console.error(error);
      if (error.response.status === 404) {
        searchResetter();
      }
      setError("Failed to fetch searched user");
    }
  }

  async function eventSearch(props) {
    try {
      const response = await axios.get(
        `http://localhost:3000/api/search/events?search=${props}`
      );
      const events = response.data;
      const findedEvents = events.list;
      setFindedEvents(findedEvents);
      console.log(findedEvents);
    } catch (error) {
      console.error(error);
      if (error.response.status === 404) {
        searchResetter();
      }
      if (error.response.status === 401) {
        localStorage.removeItem("jwtToken");
        navigate("/");
        alert("Token expired");
        window.location.reload();
      }
      setError("Failed to fetch searched user");
    }
  }

  useEffect(() => {
    async function fetchUserData() {
      try {
        const response = await axios.get(
          `http://localhost:3000/api/users/${currentUserId}`
        );
        const data = response.data;
        console.log(data);
        setUserData(data);
      } catch (error) {
        console.error("Ошибка при получении данных пользователя:", error);
      }
    }
    if (currentUserId !== 0) {
      fetchUserData();
    }
  }, [currentUserId]);

  function searchHandler(event) {
    const searchValue = event.target.value;
    setSearchValue(searchValue);
    userSearch(searchValue);
    eventSearch(searchValue);
  }

  function searchResetter() {
    setSearchValue("");
    setFindedUsers([]);
    setFindedEvents([]);
  }

  return (
    <Header>
      <HeaderContainer>
        <Logo to={`/profile/${currentUserId}`}>
          <img src={process.env.PUBLIC_URL + "/uevent.PNG"} alt="logo" />
          <h1>Uevent</h1>
        </Logo>
        {!isLoginPage && !isConfirmPage && !isRecoverPage && !isResetPassPage ? (
          <Box sx={{ display: 'flex' }}>
            <Search>
              <IconButton onClick={handleIconChange}>
                {isPersonIcon ? <PersonIcon sx={{ color: 'white' }} /> : <EventIcon sx={{ color: 'white' }} />}
              </IconButton>
              <SearchWrapper>
                <SearchInputWrapper>
                  <Searchs
                    variant="filled"
                    ref={inputRef}
                    value={searchValue}
                    type="search"
                    onChange={searchHandler}
                  />
                </SearchInputWrapper>
                <Box>
                  {isPersonIcon ? (
                    <SearchResultsWrapper>
                      {findedUsers.length > 0
                        ? findedUsers.map((user, index) => (
                          <SearchResultsContent
                            key={index}
                            to={"profile/" + user.user_id}
                            onClick={searchResetter}
                          >
                            <Avatar
                              src={`http://localhost:3000/${user.avatar}`}
                              sx={{ width: 50, height: 50 }}
                            />
                            <SearchResultsContentText>
                              <strong>{user.login}</strong>
                              <br />
                            </SearchResultsContentText>
                          </SearchResultsContent>
                        ))
                        : null}
                    </SearchResultsWrapper>
                  ) : (
                    <SearchResultsWrapper>
                      {findedEvents.length > 0
                        ? findedEvents.map((event, index) => (
                          <SearchResultsContent
                            key={index}
                            to={"events/event/" + event.event_id}
                            onClick={searchResetter}
                          >
                            <Avatar
                              src={`http://localhost:3000/post_files/${event.banner}`}
                              sx={{ width: 50, height: 50 }}
                            />
                            <SearchResultsContentText>
                              <strong>{event.event_name}</strong>
                              <br />
                              <strong>{event.description}</strong>
                              <br />
                            </SearchResultsContentText>
                          </SearchResultsContent>
                        ))
                        : null}
                    </SearchResultsWrapper>
                  )}
                </Box>
              </SearchWrapper>
            </Search>
          </Box>
        ) : null}
        <HeaderList>
          <ListItem>
            {currentUserId !== 0 ? (
              <Tooltip title="Show profile" placement="bottom">
                <StyledNavLink
                  sx={{ display: "flex", paddingRight: "20px", width: "190px" }}
                  to={`/profile/${currentUserId}`}
                >
                  <Avatar
                    src={`http://localhost:3000/${userData.avatar}`}
                    sx={{ width: 55, height: 55, marginRight: "5px" }}
                  />
                  <Box>{userData.login}<br />Role: {userData.role}</Box>
                </StyledNavLink>
              </Tooltip>
            ) : (
              <StyledNavLink to="/">Authorization</StyledNavLink>
            )}
          </ListItem>
        </HeaderList>
      </HeaderContainer>
    </Header>
  );  
}

export default UeventHeader;
