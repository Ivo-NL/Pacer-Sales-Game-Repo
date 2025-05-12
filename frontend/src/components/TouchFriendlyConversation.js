import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Typography, Paper, Avatar, List, ListItem, ListItemAvatar, ListItemText,
  TextField, IconButton, Button, Divider, Drawer, Fab, Card, CardContent,
  useMediaQuery, useTheme, Slide, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import InfoIcon from '@mui/icons-material/Info';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import { useResponsiveBreakpoints, useTouchOptimizedSizes } from '../utils/responsive';
import useBandwidthOptimization from '../hooks/useBandwidthOptimization';

/**
 * A touch-friendly conversation interface for mobile and tablet devices
 * @param {Object} props Component props
 * @param {Array} props.messages Array of message objects
 * @param {Function} props.onSendMessage Function to call when sending a message
 * @param {Object} props.client Client/persona information
 * @param {Object} props.context Conversation context information
 * @param {boolean} props.loading Whether a response is loading
 * @param {Array} props.suggestedResponses Array of suggested responses
 * @returns {JSX.Element} The component
 */
const TouchFriendlyConversation = ({
  messages = [],
  onSendMessage,
  client = {},
  context = {},
  loading = false,
  suggestedResponses = []
}) => {
  const theme = useTheme();
  const { isMobile, isTablet, isTouch } = useResponsiveBreakpoints();
  const touchSizes = useTouchOptimizedSizes();
  const { imageQuality } = useBandwidthOptimization();
  
  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // State
  const [inputValue, setInputValue] = useState('');
  const [infoDrawerOpen, setInfoDrawerOpen] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  
  // Use larger padding and elements for touch devices
  const padding = touchSizes.spacing;
  const avatarSize = isMobile ? 48 : 40;
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Set up scroll listener to show/hide scroll to bottom button
  useEffect(() => {
    const messageContainer = document.getElementById('touch-message-container');
    
    if (messageContainer) {
      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = messageContainer;
        
        // Show button if not scrolled to bottom (with some threshold)
        setShowScrollToBottom(scrollHeight - scrollTop - clientHeight > 100);
      };
      
      messageContainer.addEventListener('scroll', handleScroll);
      
      return () => {
        messageContainer.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);
  
  // Get client avatar URL with appropriate quality
  const getClientAvatarUrl = () => {
    if (!client.avatar) return null;
    
    if (imageQuality.qualityLevel === 'high') {
      return client.avatar;
    } else {
      // Use a smaller image for low bandwidth/quality
      return client.avatarSmall || client.avatar;
    }
  };
  
  // Handle message input change
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };
  
  // Handle message submission
  const handleSubmitMessage = () => {
    if (inputValue.trim() && onSendMessage) {
      onSendMessage(inputValue.trim());
      setInputValue('');
      
      // Focus back on input after sending
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };
  
  // Handle key press in input field
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitMessage();
    }
  };
  
  // Handle suggested response click
  const handleSuggestedResponseClick = (response) => {
    if (onSendMessage) {
      onSendMessage(response);
    }
  };
  
  // Scroll to the bottom of the conversation
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Toggle client info drawer
  const toggleInfoDrawer = () => {
    setInfoDrawerOpen(!infoDrawerOpen);
  };
  
  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      maxHeight: isMobile ? 'calc(100vh - 56px)' : 'calc(100vh - 64px)',
      bgcolor: theme.palette.background.default
    }}>
      {/* Conversation header */}
      <Paper 
        elevation={1}
        sx={{
          px: padding / 4,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 0,
          zIndex: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            src={getClientAvatarUrl()} 
            sx={{ width: avatarSize, height: avatarSize, mr: 1.5 }}
          >
            {client.name ? client.name[0] : <PersonIcon />}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
              {client.name || 'Client'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {client.title} {client.company && `· ${client.company}`}
            </Typography>
          </Box>
        </Box>
        <IconButton 
          onClick={toggleInfoDrawer}
          size={isMobile ? 'large' : 'medium'}
          sx={{ 
            width: touchSizes.iconButtonSize, 
            height: touchSizes.iconButtonSize 
          }}
        >
          <InfoIcon />
        </IconButton>
      </Paper>
      
      {/* Messages list */}
      <Box
        id="touch-message-container"
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          px: padding / 4,
          py: padding / 4,
          bgcolor: theme.palette.background.default
        }}
      >
        <List sx={{ px: 0 }}>
          {messages.map((message, index) => (
            <ListItem
              key={index}
              sx={{ 
                px: 0,
                py: 0.75,
                alignItems: 'flex-start'
              }}
            >
              <ListItemAvatar sx={{ mt: 0 }}>
                <Avatar
                  sx={{ 
                    width: avatarSize, 
                    height: avatarSize,
                    bgcolor: message.sender === 'user' ? 'primary.main' : 'secondary.main'
                  }}
                  src={message.sender === 'client' ? getClientAvatarUrl() : null}
                >
                  {message.sender === 'user' ? 'Y' : (client.name ? client.name[0] : 'C')}
                </Avatar>
              </ListItemAvatar>
              <Box
                sx={{
                  maxWidth: '85%',
                  ml: message.sender === 'user' ? 'auto' : 0
                }}
              >
                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    bgcolor: message.sender === 'user' 
                      ? theme.palette.primary.light
                      : theme.palette.background.paper,
                    color: message.sender === 'user'
                      ? theme.palette.primary.contrastText
                      : theme.palette.text.primary,
                    border: 'none',
                    boxShadow: 1
                  }}
                >
                  <CardContent sx={{ p: padding / 2, '&:last-child': { pb: padding / 2 } }}>
                    <Typography variant="body1">{message.content}</Typography>
                  </CardContent>
                </Card>
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ 
                    display: 'block', 
                    mt: 0.5, 
                    textAlign: message.sender === 'user' ? 'right' : 'left',
                    px: 1
                  }}
                >
                  {formatTime(message.timestamp)}
                </Typography>
              </Box>
            </ListItem>
          ))}
        </List>
        
        {/* Element for scrolling to bottom */}
        <div ref={messagesEndRef} />
        
        {/* Loading indicator */}
        {loading && (
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              px: 2,
              py: 1,
              bgcolor: 'rgba(0, 0, 0, 0.04)',
              borderRadius: 2
            }}>
              <Typography variant="body2" sx={{ ml: 1, fontStyle: 'italic' }}>
                Client is typing...
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
      
      {/* Suggested responses */}
      {suggestedResponses && suggestedResponses.length > 0 && (
        <Box
          sx={{
            p: padding / 4,
            bgcolor: 'background.paper',
            overflowX: 'auto',
            display: 'flex',
            gap: 1,
            borderTop: 1,
            borderColor: 'divider',
            whiteSpace: 'nowrap',
            WebkitOverflowScrolling: 'touch', // For momentum scrolling on iOS
            scrollbarWidth: 'none', // Hide scrollbar in Firefox
            '&::-webkit-scrollbar': { // Hide scrollbar in Chrome/Safari
              display: 'none'
            }
          }}
        >
          {suggestedResponses.map((response, index) => (
            <Button
              key={index}
              variant="outlined"
              size={isMobile ? 'large' : 'medium'}
              sx={{ 
                borderRadius: 6,
                whiteSpace: 'nowrap',
                minHeight: touchSizes.buttonMinHeight,
                px: 2
              }}
              onClick={() => handleSuggestedResponseClick(response)}
            >
              {response}
            </Button>
          ))}
        </Box>
      )}
      
      {/* Message input */}
      <Paper
        elevation={2}
        sx={{
          p: padding / 4,
          display: 'flex',
          alignItems: 'center',
          borderRadius: 0,
          borderTop: 1,
          borderColor: 'divider'
        }}
      >
        <TextField
          inputRef={inputRef}
          fullWidth
          placeholder="Type your message..."
          multiline
          maxRows={4}
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          variant="outlined"
          InputProps={{
            sx: { 
              borderRadius: 6,
              py: 0.5,
              px: 1,
              height: 'auto'
            }
          }}
          sx={{ mr: 1 }}
        />
        <IconButton
          color="primary"
          onClick={handleSubmitMessage}
          disabled={!inputValue.trim()}
          sx={{ 
            width: touchSizes.iconButtonSize, 
            height: touchSizes.iconButtonSize 
          }}
        >
          <SendIcon />
        </IconButton>
      </Paper>
      
      {/* Scroll to bottom button */}
      {showScrollToBottom && (
        <Fab
          color="primary"
          size="small"
          onClick={scrollToBottom}
          sx={{
            position: 'absolute',
            bottom: isMobile ? 80 : 90,
            right: 16,
            opacity: 0.9
          }}
        >
          <KeyboardArrowUpIcon />
        </Fab>
      )}
      
      {/* Client info drawer */}
      <Drawer
        anchor="right"
        open={infoDrawerOpen}
        onClose={toggleInfoDrawer}
        sx={{
          '& .MuiDrawer-paper': {
            width: isMobile ? '100%' : 350,
            p: padding / 2
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Client Information</Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar 
              src={getClientAvatarUrl()} 
              sx={{ width: 64, height: 64, mr: 2 }}
            >
              {client.name ? client.name[0] : <PersonIcon />}
            </Avatar>
            <Box>
              <Typography variant="h6">{client.name || 'Client'}</Typography>
              <Typography variant="body2" color="text.secondary">
                {client.title || 'Unknown Title'}
              </Typography>
            </Box>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          {client.company && (
            <>
              <Typography variant="subtitle1" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                <BusinessIcon sx={{ mr: 1 }} /> Company
              </Typography>
              <Typography variant="body2" paragraph>
                {client.company}
              </Typography>
              
              {client.industry && (
                <Typography variant="body2" color="text.secondary" paragraph>
                  Industry: {client.industry}
                </Typography>
              )}
              
              <Divider sx={{ my: 2 }} />
            </>
          )}
          
          {context.currentPacerStage && (
            <>
              <Typography variant="subtitle1" gutterBottom>Current PACER Stage</Typography>
              <Typography variant="body2" paragraph>
                {context.currentPacerStage}
              </Typography>
              <Divider sx={{ my: 2 }} />
            </>
          )}
          
          {client.notes && (
            <>
              <Typography variant="subtitle1" gutterBottom>Notes</Typography>
              <Typography variant="body2" paragraph>
                {client.notes}
              </Typography>
              <Divider sx={{ my: 2 }} />
            </>
          )}
          
          <Button variant="outlined" fullWidth onClick={toggleInfoDrawer}>
            Close
          </Button>
        </Box>
      </Drawer>
    </Box>
  );
};

export default TouchFriendlyConversation; 