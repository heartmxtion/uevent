import * as React from "react";
import dayjs from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";

import { Container, Box } from "@mui/material";

export default function Calendar() {
  const [value, setValue] = React.useState(dayjs());

  return (
    <Box>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Container>
          <Box label="Controlled calendar">
            <DateCalendar
              value={value}
              onChange={(newValue) => setValue(newValue)}
            />
          </Box>
        </Container>
      </LocalizationProvider>
    </Box>
  );
}
