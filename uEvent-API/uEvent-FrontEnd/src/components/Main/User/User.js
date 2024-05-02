import React from 'react';
import { NavLink } from 'react-router-dom';
import { Paper, Avatar } from '@mui/material';

function User(props) {
  return (
    <NavLink to={`/profile/${props.userData.user_id}`}>
      <Paper elevation={3} style={{ width: '100px', height: '100px', borderRadius: '50%' }}>
        <Avatar src={`http://localhost:3000/${props.userData.avatar}`} sx={{ width: 100, height: 100 }} />
      </Paper>
    </NavLink>
  );
}

export default User;