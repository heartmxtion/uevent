import React, { useState } from 'react';
import { Edit } from '@mui/icons-material';
import { Button } from '@mui/material';
const HoverTransitionEdit = (props) => {
  const [hovered, setHovered] = useState(false);

  const handleMouseEnter = () => {
    setHovered(true);
  };

  const handleMouseLeave = () => {
    setHovered(false);
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        display: 'inline-block',
        transition: 'color 0.3s ease',
        color: hovered ? 'green' : 'inherit',
      }}
    >
      {hovered ? <Button onClick={props.activation} style={{color: hovered ? 'green' : 'inherit'}}>Edit <Edit /></Button> : <Button>Edit <Edit /></Button>}
    </div>
  );
};

export default HoverTransitionEdit;