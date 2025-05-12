import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Create a custom theme with My Company-inspired colors based on their intranet
const theme = createTheme({
  palette: {
    primary: {
      main: '#1ab394', // My Company teal/green
      light: '#4cd6b7',
      dark: '#128370',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FFC72C', // Vibrant yellow
      light: '#FFD75E',
      dark: '#E5A800',
      contrastText: '#000000',
    },
    info: {
      main: '#3ecabc', // Lighter teal
      light: '#7bdfd5',
      dark: '#0e9a8c',
    },
    success: {
      main: '#4CAF50',
      light: '#81C784',
      dark: '#388E3C',
    },
    warning: {
      main: '#FF9800',
      light: '#FFB74D',
      dark: '#F57C00',
    },
    error: {
      main: '#F44336',
      light: '#E57373',
      dark: '#D32F2F',
    },
    background: {
      default: '#F5F7FA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#2A3642',
      secondary: '#546E7A',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(0, 0, 0, 0.05)',
    '0px 4px 6px rgba(0, 0, 0, 0.07)',
    '0px 6px 8px rgba(0, 0, 0, 0.08)',
    '0px 8px 10px rgba(0, 0, 0, 0.10)',  // Level 4
    '0px 10px 12px rgba(0, 0, 0, 0.12)',
    '0px 12px 14px rgba(0, 0, 0, 0.14)',
    '0px 14px 16px rgba(0, 0, 0, 0.16)',
    '0px 16px 18px rgba(0, 0, 0, 0.18)',  // Level 8
    '0px 18px 20px rgba(0, 0, 0, 0.20)',
    '0px 20px 22px rgba(0, 0, 0, 0.22)',
    '0px 22px 24px rgba(0, 0, 0, 0.24)',
    '0px 24px 26px rgba(0, 0, 0, 0.26)',
    '0px 26px 28px rgba(0, 0, 0, 0.28)',
    '0px 28px 30px rgba(0, 0, 0, 0.30)',
    '0px 30px 32px rgba(0, 0, 0, 0.32)',
    '0px 32px 34px rgba(0, 0, 0, 0.34)',
    '0px 34px 36px rgba(0, 0, 0, 0.36)',
    '0px 36px 38px rgba(0, 0, 0, 0.38)',
    '0px 38px 40px rgba(0, 0, 0, 0.40)',
    '0px 40px 42px rgba(0, 0, 0, 0.42)',
    '0px 42px 44px rgba(0, 0, 0, 0.44)',
    '0px 44px 46px rgba(0, 0, 0, 0.46)',
    '0px 46px 48px rgba(0, 0, 0, 0.48)',
    '0px 48px 50px rgba(0, 0, 0, 0.50)',
  ],
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
          },
        },
        containedPrimary: {
          boxShadow: '0 2px 5px rgba(0, 102, 178, 0.3)',
        },
        containedSecondary: {
          boxShadow: '0 2px 5px rgba(255, 199, 44, 0.3)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
          transition: 'transform 0.3s, box-shadow 0.3s',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 12px 20px rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          fontWeight: 500,
        },
      },
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(); 