import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import type { ReactNode } from 'react';

const theme = createTheme({
  palette: {
    primary: { main: '#147A78', dark: '#0F6261' },
    text: { primary: '#2A2C31', secondary: '#6B7280' },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: 'Quicksand_500Medium, Quicksand, sans-serif',
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
        },
      },
    },
  },
});

export function MuiPickerProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        {children}
      </LocalizationProvider>
    </ThemeProvider>
  );
}
