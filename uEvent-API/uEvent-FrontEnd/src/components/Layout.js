import { Outlet, useLocation } from "react-router-dom";
import Footer from "./Footer/Footer";
import UeventHeader from "./Header/UeventHeader";
import React from "react";
import Box from "@mui/material/Box";
import Sidebar from "./Sidebar/Sidebar";

function Layout() {
  const location = useLocation();
  const loginPagePaths = ["/", "/profile/0", "/register"];
  const isLoginPage = loginPagePaths.includes(location.pathname);
  const isConfirmPage = location.pathname.startsWith("/confirm");
  const isRecoverPage = location.pathname.startsWith("/recover");
  const isResetPassPage = location.pathname.startsWith("/reset-password");

  return (
    <div>
        <UeventHeader />
        {isLoginPage || isConfirmPage || isRecoverPage || isResetPassPage ? (
          <Outlet />
        ) : (
          <Box style={{ display: "flex", height: "100%" }}>
            <Sidebar />
            <Outlet />
          </Box>
        )}
        <Footer />
        {!(isLoginPage || isConfirmPage || isRecoverPage || isResetPassPage) && (
          <div style={{ height: "100px" }}></div>
        )}
    </div>
  );
}

export default Layout;
