import { styled } from "@mui/material/styles";

import { NavLink, Link } from "react-router-dom";

export const StyledNavLink = styled(NavLink)({
  color: "inherit",
  fontWeight: "650",
  textDecoration: "none",
  fontSize: "1.3rem",
  transition: "color 0.3s ease",
  "&.active": {
    color: "#5282de",
  },
  "&:hover": {
    color: "#5282de",
    textShadow: "0 0 1em #5282de",
    transition: "color 0.3s ease",
  },
});
