import React from 'react';
import { Box, Container, Typography, Link, Grid, Divider, useTheme } from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';

const Footer = () => {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();
  
  return (
    <Box
      component="footer"
      sx={{
        py: 4,
        mt: 'auto',
        background: `linear-gradient(to right, ${theme.palette.primary.dark}DD, ${theme.palette.primary.main}DD)`,
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)'
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: '-50%',
          right: '-10%',
          width: '300px',
          height: '300px',
          background: `radial-gradient(circle, ${theme.palette.primary.light}22, transparent 70%)`,
          borderRadius: '50%',
          zIndex: 0
        }}
      />
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={2} alignItems="center" justifyContent="space-between">
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box 
                sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.light})`,
                  mr: 2,
                  boxShadow: '0 3px 5px rgba(0, 0, 0, 0.2)'
                }}
              >
                <SchoolIcon sx={{ fontSize: 20, color: theme.palette.secondary.contrastText }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, letterSpacing: 0.5 }}>
                PACER Sales Game
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.9, maxWidth: 400 }}>
              A powerful training platform to help sales professionals master the PACER methodology through interactive practice scenarios.
            </Typography>
          </Grid>
          <Grid item xs={12} md={6} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              © {currentYear} Worldline
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.8 }}>
              Version 1.1 • All rights reserved
            </Typography>
            <Box sx={{ mt: 1.5, display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
              <Link href="#" color="inherit" sx={{ mr: 2, opacity: 0.8, '&:hover': { opacity: 1 } }}>
                Terms
              </Link>
              <Link href="#" color="inherit" sx={{ mr: 2, opacity: 0.8, '&:hover': { opacity: 1 } }}>
                Privacy
              </Link>
              <Link href="#" color="inherit" sx={{ opacity: 0.8, '&:hover': { opacity: 1 } }}>
                Help
              </Link>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Footer; 