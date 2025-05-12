import React, { useState, useEffect } from 'react';
import {
  Container, Grid, Typography, Box, Button, CircularProgress,
  Card, CardContent, CardActions, Chip, FormControl, InputLabel, Select,
  MenuItem, TextField, InputAdornment, Divider, Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FilterListIcon from '@mui/icons-material/FilterList';
import apiService from '../services/api';

const ScenarioList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [scenarios, setScenarios] = useState([]);
  const [filteredScenarios, setFilteredScenarios] = useState([]);
  const [error, setError] = useState('');
  
  // Filter states
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [pacerFilter, setPacerFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');
  
  // Start game session
  const [startingScenario, setStartingScenario] = useState(null);
  
  // Add new state for difficulty selection dialog
  const [difficultyDialogOpen, setDifficultyDialogOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(2); // Default to intermediate
  
  // Define the time limits for each difficulty level
  const difficultyTimeLimits = {
    1: 5 * 60, // Easy: 5 minutes
    2: 4 * 60, // Intermediate: 4 minutes
    3: 3 * 60  // Advanced: 3 minutes
  };

  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        setLoading(true);
        
        // Fetch real scenarios from the API
        const response = await apiService.scenarios.getAll();
        const scenariosData = response.data;
        
        setScenarios(scenariosData);
        setFilteredScenarios(scenariosData);
      } catch (err) {
        console.error('Error fetching scenarios:', err);
        setError('Failed to load scenarios. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchScenarios();
  }, []);

  // Apply filters when any filter value changes
  useEffect(() => {
    if (scenarios.length === 0) return;
    
    let result = [...scenarios];
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(scenario => 
        scenario.title.toLowerCase().includes(searchLower) || 
        scenario.description.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply difficulty filter
    if (difficultyFilter !== 'all') {
      result = result.filter(scenario => 
        scenario.difficulty === parseInt(difficultyFilter)
      );
    }
    
    // Apply PACER stage filter
    if (pacerFilter !== 'all') {
      result = result.filter(scenario => 
        scenario.pacer_stage.includes(pacerFilter)
      );
    }
    
    // Apply product filter
    if (productFilter !== 'all') {
      result = result.filter(scenario => 
        scenario.product_type === productFilter
      );
    }
    
    // Apply industry filter
    if (industryFilter !== 'all') {
      result = result.filter(scenario => 
        scenario.industry === industryFilter
      );
    }
    
    setFilteredScenarios(result);
  }, [scenarios, search, difficultyFilter, pacerFilter, productFilter, industryFilter]);

  const handleStartScenario = async (scenarioId) => {
    // Open the difficulty selection dialog instead of immediately starting
    setSelectedScenario(scenarioId);
    setDifficultyDialogOpen(true);
  };
  
  // New function to actually start the session after difficulty is selected
  const handleStartWithDifficulty = async () => {
    try {
      setStartingScenario(selectedScenario);
      setError('');
      setDifficultyDialogOpen(false);
      
      // Create a game session via API with the selected difficulty
      const sessionData = {
        scenario_id: selectedScenario,
        is_timed: true,
        time_limit_seconds: difficultyTimeLimits[selectedDifficulty],
        difficulty: selectedDifficulty
      };
      
      console.log('Creating session with data:', sessionData);
      
      const response = await apiService.sessions.create(sessionData);
      console.log('Session created successfully:', response.data);
      
      // Navigate to the game session with the returned session ID
      navigate(`/game/${response.data.id}`);
    } catch (err) {
      console.error('Error starting scenario:', err);
      setError('Failed to start scenario. Please try again: ' + (err.response?.data?.detail || err.message));
      setStartingScenario(null);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setDifficultyFilter('all');
    setPacerFilter('all');
    setProductFilter('all');
    setIndustryFilter('all');
  };

  // Extract unique values for filter dropdowns
  const productTypes = [...new Set(scenarios.map(s => s.product_type))];
  const industries = [...new Set(scenarios.map(s => s.industry))];

  if (loading) {
    return (
      <Container sx={{ my: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Sales Scenarios
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Choose a scenario to practice different aspects of the PACER sales methodology. Each scenario simulates 
        realistic customer interactions tailored to My Company's payment solutions.
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Search and Filters */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search Scenarios"
              variant="outlined"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="difficulty-filter-label">Difficulty</InputLabel>
                  <Select
                    labelId="difficulty-filter-label"
                    value={difficultyFilter}
                    label="Difficulty"
                    onChange={(e) => setDifficultyFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Levels</MenuItem>
                    <MenuItem value="1">Beginner</MenuItem>
                    <MenuItem value="2">Intermediate</MenuItem>
                    <MenuItem value="3">Advanced</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="pacer-filter-label">PACER Stage</InputLabel>
                  <Select
                    labelId="pacer-filter-label"
                    value={pacerFilter}
                    label="PACER Stage"
                    onChange={(e) => setPacerFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Stages</MenuItem>
                    <MenuItem value="P">Prospect</MenuItem>
                    <MenuItem value="A">Assess</MenuItem>
                    <MenuItem value="C">Challenge</MenuItem>
                    <MenuItem value="E">Execute</MenuItem>
                    <MenuItem value="R">Retain</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="product-filter-label">Product</InputLabel>
                  <Select
                    labelId="product-filter-label"
                    value={productFilter}
                    label="Product"
                    onChange={(e) => setProductFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Products</MenuItem>
                    {productTypes.map(type => (
                      <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="industry-filter-label">Industry</InputLabel>
                  <Select
                    labelId="industry-filter-label"
                    value={industryFilter}
                    label="Industry"
                    onChange={(e) => setIndustryFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Industries</MenuItem>
                    {industries.map(industry => (
                      <MenuItem key={industry} value={industry}>{industry}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        
        {/* Filter summary and reset */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {filteredScenarios.length} of {scenarios.length} scenarios
          </Typography>
          <Button 
            startIcon={<FilterListIcon />} 
            size="small" 
            onClick={resetFilters}
            disabled={!search && difficultyFilter === 'all' && pacerFilter === 'all' && 
                    productFilter === 'all' && industryFilter === 'all'}
          >
            Reset Filters
          </Button>
        </Box>
      </Box>
      
      <Divider sx={{ mb: 4 }} />
      
      {/* Scenarios Grid */}
      {filteredScenarios.length > 0 ? (
        <Grid container spacing={3}>
          {filteredScenarios.map((scenario) => (
            <Grid item xs={12} sm={6} md={4} key={scenario.id}>
              <Card 
                className="scenario-card" 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  position: 'relative'
                }}
              >
                <Box 
                  sx={{ 
                    position: 'absolute', 
                    top: 10, 
                    right: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: 1
                  }}
                >
                  <Chip 
                    label={`Level ${scenario.difficulty}`} 
                    size="small"
                    className={`difficulty-badge difficulty-${scenario.difficulty}`}
                  />
                  <Chip
                    label={scenario.pacer_stage}
                    size="small" 
                    className={`pacer-badge pacer-${scenario.pacer_stage}`}
                  />
                </Box>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h6" component="h2">
                    {scenario.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {scenario.description}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Product:</strong> {scenario.product_type}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Industry:</strong> {scenario.industry}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button 
                    startIcon={<PlayArrowIcon />}
                    variant="contained" 
                    fullWidth
                    onClick={() => handleStartScenario(scenario.id)}
                    disabled={startingScenario === scenario.id}
                  >
                    {startingScenario === scenario.id ? 'Starting...' : 'Start Scenario'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <Typography variant="h6" gutterBottom>
            No scenarios match your filters
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your filters to see more scenarios
          </Typography>
          <Button 
            variant="outlined" 
            sx={{ mt: 2 }}
            onClick={resetFilters}
          >
            Reset All Filters
          </Button>
        </Box>
      )}
      
      {/* Add the difficulty selection dialog */}
      <Dialog
        open={difficultyDialogOpen}
        onClose={() => setDifficultyDialogOpen(false)}
        aria-labelledby="difficulty-dialog-title"
      >
        <DialogTitle id="difficulty-dialog-title">Select Session Difficulty</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Choose a difficulty level for this session. This will determine the time limit.
          </DialogContentText>
          <Box sx={{ mt: 3 }}>
            <FormControl component="fieldset">
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Button
                    variant={selectedDifficulty === 1 ? "contained" : "outlined"}
                    color="success"
                    fullWidth
                    onClick={() => setSelectedDifficulty(1)}
                    sx={{ justifyContent: "flex-start", py: 1 }}
                  >
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%" }}>
                      <Typography variant="subtitle1">Easy (5 minutes)</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Recommended for beginners or simple scenarios
                      </Typography>
                    </Box>
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant={selectedDifficulty === 2 ? "contained" : "outlined"}
                    color="primary"
                    fullWidth
                    onClick={() => setSelectedDifficulty(2)}
                    sx={{ justifyContent: "flex-start", py: 1 }}
                  >
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%" }}>
                      <Typography variant="subtitle1">Intermediate (4 minutes)</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Balanced challenge for most users
                      </Typography>
                    </Box>
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant={selectedDifficulty === 3 ? "contained" : "outlined"}
                    color="error"
                    fullWidth
                    onClick={() => setSelectedDifficulty(3)}
                    sx={{ justifyContent: "flex-start", py: 1 }}
                  >
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%" }}>
                      <Typography variant="subtitle1">Advanced (3 minutes)</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Time pressure for experienced sales professionals
                      </Typography>
                    </Box>
                  </Button>
                </Grid>
              </Grid>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDifficultyDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleStartWithDifficulty} 
            variant="contained" 
            startIcon={<PlayArrowIcon />}
          >
            Start Session
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ScenarioList; 