import React, { useState } from 'react';
import { DeleteOutline, DeleteForever } from '@mui/icons-material';
import { Button } from '@mui/material';
const HoverTransition = (props) => {
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
        color: hovered ? 'red' : 'inherit',
      }}
    >
      {hovered ? <Button onClick={props.activation} style={{color: hovered ? 'red' : 'inherit'}}>Delete <DeleteForever /></Button> : <Button>Delete <DeleteOutline /></Button>}
    </div>
  );
};

export default HoverTransition;