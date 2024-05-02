import React, { useEffect, useState } from "react";
import axios from "axios";
import Divider from "@mui/material/Divider";
import { StyledNavLink } from "./Sidebar.styles";
import { jwtDecode } from "jwt-decode";
import { AdminPanelSettings } from "@mui/icons-material";
import {
  Box,
  Paper,
  ListItem,
  List
} from "@mui/material";

function Sidebar() {
  const jwtToken = localStorage.getItem("jwtToken");
  const currentUserRole = jwtToken != null ? jwtDecode(jwtToken).role : "user";

  return (
    <Paper
      elevation={3}
      style={{ width: "14%", padding: 20, height: "100%", position: "fixed" }}
    >
      <List>
        {jwtToken && (
          <Box>
            {currentUserRole === "admin" ? (
              <Box>
                <ListItem>
                  <StyledNavLink
                    to={`/admin`}
                    sx={{
                      width: "175px",
                      marginLeft: "1%",
                      position: "fixed",
                      left: "calc(7% + 20px)",
                      transform: "translateX(-50%)",
                    }}
                  >
                    Admin panel
                    <AdminPanelSettings />
                  </StyledNavLink>
                </ListItem>

                <Divider sx={{ marginTop: "15px" }} component="li" />
              </Box>
            ) : null}
          </Box>
        )}
        <ListItem>
          <StyledNavLink to="/events">All events</StyledNavLink>
        </ListItem>
        <ListItem>
          <StyledNavLink to="/users">Users</StyledNavLink>
        </ListItem>
      </List>
    </Paper>
  );
}

export default Sidebar;
