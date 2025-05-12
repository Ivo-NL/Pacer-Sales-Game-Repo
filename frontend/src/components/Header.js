import React from 'react';
import { AppBar, Toolbar, Typography, Button, Container, Avatar, Menu, MenuItem, Box, IconButton, Badge, useTheme, Divider } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SchoolIcon from '@mui/icons-material/School';
import GroupsIcon from '@mui/icons-material/Groups';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import FlagIcon from '@mui/icons-material/Flag';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import RateReviewIcon from '@mui/icons-material/RateReview';
import NotificationsIcon from '@mui/icons-material/Notifications';

const Header = () => {
  const { user, isAuthenticated, logout, isManager } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [mobileAnchorEl, setMobileAnchorEl] = React.useState(null);
  const theme = useTheme();

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMobileMenu = (event) => {
    setMobileAnchorEl(event.currentTarget);
  };

  const handleMobileClose = () => {
    setMobileAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
    navigate('/login');
  };

  return (
    <AppBar 
      position="static" 
      sx={{ 
        background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      }}
    >
      <Container maxWidth="xl">
        <Toolbar sx={{ py: 1 }}>
          {/* Mobile menu */}
          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={handleMobileMenu}
              sx={{ 
                mr: 2,
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  transform: 'scale(1.05)'
                },
                transition: 'all 0.2s'
              }}
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar-mobile"
              anchorEl={mobileAnchorEl}
              keepMounted
              open={Boolean(mobileAnchorEl)}
              onClose={handleMobileClose}
              sx={{
                '& .MuiPaper-root': {
                  borderRadius: 2,
                  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
                  mt: 1
                }
              }}
            >
              {isAuthenticated ? (
                <>
                  <MenuItem 
                    component={Link} 
                    to="/" 
                    onClick={handleMobileClose}
                  >
                    Dashboard
                  </MenuItem>
                  <MenuItem 
                    component={Link} 
                    to="/sessions" 
                    onClick={handleMobileClose}
                  >
                    Sessions
                  </MenuItem>
                  <MenuItem 
                    component={Link} 
                    to="/scenarios" 
                    onClick={handleMobileClose}
                  >
                    Scenarios
                  </MenuItem>
                  <MenuItem 
                    component={Link} 
                    to="/progress" 
                    onClick={handleMobileClose}
                  >
                    My Progress
                  </MenuItem>
                  <MenuItem 
                    component={Link} 
                    to="/teams" 
                    onClick={handleMobileClose}
                  >
                    <GroupsIcon fontSize="small" sx={{ mr: 1 }} />
                    Teams
                  </MenuItem>
                  <MenuItem 
                    component={Link} 
                    to="/challenges" 
                    onClick={handleMobileClose}
                  >
                    <FlagIcon fontSize="small" sx={{ mr: 1 }} />
                    Challenges
                  </MenuItem>
                  <MenuItem 
                    component={Link} 
                    to="/leaderboard" 
                    onClick={handleMobileClose}
                  >
                    Leaderboard
                  </MenuItem>
                  <MenuItem 
                    component={Link} 
                    to="/peer-comparison" 
                    onClick={handleMobileClose}
                  >
                    <CompareArrowsIcon fontSize="small" sx={{ mr: 1 }} />
                    Peer Comparison
                  </MenuItem>
                  <MenuItem 
                    component={Link} 
                    to="/recordings" 
                    onClick={handleMobileClose}
                  >
                    <VideoLibraryIcon fontSize="small" sx={{ mr: 1 }} />
                    Recordings
                  </MenuItem>
                  {isManager && (
                    <MenuItem 
                      component={Link} 
                      to="/review-dashboard" 
                      onClick={handleMobileClose}
                    >
                      <RateReviewIcon fontSize="small" sx={{ mr: 1 }} />
                      Review Dashboard
                    </MenuItem>
                  )}
                  <MenuItem 
                    component={Link} 
                    to="/profile" 
                    onClick={handleMobileClose}
                  >
                    Profile
                  </MenuItem>
                </>
              ) : (
                <>
                  <MenuItem 
                    component={Link} 
                    to="/login" 
                    onClick={handleMobileClose}
                  >
                    Login
                  </MenuItem>
                  <MenuItem 
                    component={Link} 
                    to="/register" 
                    onClick={handleMobileClose}
                  >
                    Register
                  </MenuItem>
                </>
              )}
            </Menu>
          </Box>

          {/* Logo & Brand */}
          <Typography 
            variant="h6" 
            component={Link} 
            to="/" 
            sx={{ 
              textDecoration: 'none', 
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              fontWeight: 700,
              letterSpacing: 0.5,
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              '&:hover': {
                transform: 'scale(1.02)',
              },
              transition: 'transform 0.2s'
            }}
          >
            <Box 
              component="span" 
              sx={{ 
                background: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.light})`,
                p: 1,
                borderRadius: 1.5,
                mr: 1.5,
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <SchoolIcon sx={{ mr: 0.5 }} />
            </Box>
            PACER Sales Game
          </Typography>

          {/* Desktop Navigation */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, justifyContent: 'center', ml: 4 }}>
            {isAuthenticated && (
              <>
                <Button 
                  color="inherit" 
                  component={Link} 
                  to="/dashboard"
                  sx={{ 
                    mx: 1, 
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.15)',
                      transform: 'translateY(-2px)'
                    },
                    transition: 'all 0.2s'
                  }}
                  startIcon={<AssessmentIcon />}
                >
                  Dashboard
                </Button>
                <Button 
                  color="inherit" 
                  component={Link} 
                  to="/sessions" 
                  sx={{ 
                    mx: 1, 
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.15)',
                      transform: 'translateY(-2px)'
                    },
                    transition: 'all 0.2s'
                  }}
                  startIcon={<CompareArrowsIcon />}
                >
                  Sessions
                </Button>
                <Button 
                  color="inherit" 
                  component={Link} 
                  to="/scenarios" 
                  sx={{ 
                    mx: 1, 
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.15)',
                      transform: 'translateY(-2px)'
                    },
                    transition: 'all 0.2s'
                  }}
                  startIcon={<FlagIcon />}
                >
                  Scenarios
                </Button>
                <Button 
                  color="inherit" 
                  component={Link} 
                  to="/progress" 
                  sx={{ 
                    mx: 1, 
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.15)',
                      transform: 'translateY(-2px)'
                    },
                    transition: 'all 0.2s'
                  }}
                  startIcon={<EmojiEventsIcon />}
                >
                  Progress
                </Button>
                <Button 
                  color="inherit" 
                  component={Link} 
                  to="/teams" 
                  sx={{ 
                    mx: 1, 
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.15)',
                      transform: 'translateY(-2px)'
                    },
                    transition: 'all 0.2s'
                  }}
                  startIcon={<GroupsIcon />}
                >
                  Teams
                </Button>
                <Button 
                  color="inherit" 
                  component={Link} 
                  to="/recordings" 
                  sx={{ 
                    mx: 1, 
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.15)',
                      transform: 'translateY(-2px)'
                    },
                    transition: 'all 0.2s'
                  }}
                  startIcon={<VideoLibraryIcon />}
                >
                  Recordings
                </Button>
                {isManager && (
                  <Button 
                    color="inherit" 
                    component={Link} 
                    to="/review" 
                    sx={{ 
                      mx: 1, 
                      borderRadius: 2,
                      px: 2,
                      py: 1,
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.15)',
                        transform: 'translateY(-2px)'
                      },
                      transition: 'all 0.2s'
                    }}
                    startIcon={<RateReviewIcon />}
                  >
                    Review
                  </Button>
                )}
              </>
            )}
          </Box>

          {/* User Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {isAuthenticated ? (
              <>
                <IconButton 
                  color="inherit"
                  sx={{ 
                    mr: 2,
                    background: 'rgba(255, 255, 255, 0.1)',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.2)',
                    }
                  }}
                >
                  <Badge badgeContent={2} color="secondary">
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
                <Box 
                  onClick={handleMenu}
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 2,
                    px: 2,
                    py: 0.5,
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.2)',
                    },
                    transition: 'all 0.2s'
                  }}
                >
                  <Avatar
                    sx={{ 
                      width: 36, 
                      height: 36, 
                      bgcolor: theme.palette.secondary.main,
                      color: theme.palette.secondary.contrastText,
                      mr: 1,
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                    }}
                  >
                    {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                  </Avatar>
                  <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 500 }}>
                    {user?.username || 'User'}
                  </Typography>
                </Box>
                <Menu
                  id="menu-appbar"
                  anchorEl={anchorEl}
                  keepMounted
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                  sx={{
                    '& .MuiPaper-root': {
                      borderRadius: 2,
                      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
                      mt: 1
                    }
                  }}
                >
                  <MenuItem 
                    onClick={() => {
                      handleClose();
                      navigate('/profile');
                    }}
                    sx={{
                      py: 1.5,
                      '&:hover': {
                        bgcolor: 'rgba(0, 102, 178, 0.1)'
                      }
                    }}
                  >
                    <AccountCircleIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                    Profile
                  </MenuItem>
                  <Divider />
                  <MenuItem 
                    onClick={handleLogout}
                    sx={{
                      py: 1.5,
                      color: theme.palette.error.main,
                      '&:hover': {
                        bgcolor: 'rgba(244, 67, 54, 0.1)'
                      }
                    }}
                  >
                    <ExitToAppIcon sx={{ mr: 1 }} />
                    Logout
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <>
                <Button 
                  color="inherit" 
                  component={Link} 
                  to="/login"
                >
                  Login
                </Button>
                <Button 
                  color="inherit" 
                  component={Link} 
                  to="/register"
                >
                  Register
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Header; 