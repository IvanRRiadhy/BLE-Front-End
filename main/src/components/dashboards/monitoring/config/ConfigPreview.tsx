import { Box, Grid2 as Grid, Typography, Toolbar, styled } from '@mui/material';
import { useTheme } from '@mui/material';
import { AppState, useSelector } from 'src/store/Store';

interface ConfigPreviewProps {
  selectedGrid: number;
  selectedScreen?: number;
  setSelectedScreen: (selectedScreen: string) => void;
}

const ConfigPreview: React.FC<ConfigPreviewProps> = ({
  selectedGrid,
  selectedScreen,
  setSelectedScreen,
}: ConfigPreviewProps) => {
  const theme = useTheme();
  const customizer = useSelector((state: AppState) => state.customizer);
  const renderLayout = () => {
    switch (selectedGrid) {
      case 1:
        return (
          <Grid container>
            <Grid
              size={{ xs: 12 }}
              onClick={() => setSelectedScreen('1')}
              sx={{
                height: '80vh', // Full height for vertical centering
                overflow: 'hidden',
                border: `${selectedScreen === 1 ? '5px' : '2.5px'} solid ${
                  selectedScreen === 1 ? theme.palette.success.dark : 'black'
                }`,
                display: 'flex', // Flexbox for centering
                alignItems: 'center', // Vertical centering
                justifyContent: 'center', // Horizontal centering
                backgroundColor: `${selectedScreen === 1 ? theme.palette.success.light : 'white'}`,
                transition: 'border-color 0.3s, background-color 0.3s',
                '&:hover': {
                  borderColor: theme.palette.success.main, // Change border color on hover
                  backgroundColor: theme.palette.success.light, // Optional: Add background color change
                  '& .hover-typography': {
                    color: theme.palette.success.main, // Change Typography color on hover
                  },
                },
              }}
            >
              <Typography
                variant="h1"
                className="hover-typography"
                sx={{
                  fontSize: '5rem',
                  fontFamily: 'Georgia',
                  color: `${selectedScreen === 1 ? theme.palette.success.dark : 'black'}`,
                  transition: 'color 0.1s',
                }}
                fontStyle="bold"
                fontWeight={900}
              >
                I
              </Typography>
            </Grid>
          </Grid>
        );
      case 2:
        return (
          <Grid container>
            <Grid
              size={{ xs: 12, lg: 6 }}
              onClick={() => setSelectedScreen('1')}
              sx={{
                height: '80vh', // Full height for vertical centering
                overflow: 'hidden',
                border: `${selectedScreen === 1 ? '5px' : '2.5px'} solid ${
                  selectedScreen === 1 ? theme.palette.success.dark : 'black'
                }`,
                display: 'flex', // Flexbox for centering
                alignItems: 'center', // Vertical centering
                justifyContent: 'center', // Horizontal centering
                backgroundColor: `${selectedScreen === 1 ? theme.palette.success.light : 'white'}`,
                transition: 'border-color 0.3s, background-color 0.3s',
                '&:hover': {
                  borderColor: theme.palette.success.main, // Change border color on hover
                  backgroundColor: theme.palette.success.light, // Optional: Add background color change
                  '& .hover-typography': {
                    color: theme.palette.success.main, // Change Typography color on hover
                  },
                },
              }}
            >
              <Typography
                variant="h1"
                className="hover-typography"
                sx={{
                  fontSize: '5rem',
                  fontFamily: 'Georgia',
                  color: `${selectedScreen === 1 ? theme.palette.success.dark : 'black'}`,
                  transition: 'color 0.1s',
                }}
                fontStyle="bold"
                fontWeight={900}
              >
                I
              </Typography>
            </Grid>
            <Grid
              size={{ xs: 12, lg: 6 }}
              onClick={() => setSelectedScreen('2')}
              sx={{
                height: '80vh', // Full height for vertical centering
                overflow: 'hidden',
                border: `${selectedScreen === 2 ? '5px' : '2.5px'} solid ${
                  selectedScreen === 2 ? theme.palette.success.dark : 'black'
                }`,
                display: 'flex', // Flexbox for centering
                alignItems: 'center', // Vertical centering
                justifyContent: 'center', // Horizontal centering
                backgroundColor: `${selectedScreen === 2 ? theme.palette.success.light : 'white'}`,
                transition: 'border-color 0.3s, background-color 0.3s',
                '&:hover': {
                  borderColor: theme.palette.success.main, // Change border color on hover
                  backgroundColor: theme.palette.success.light, // Optional: Add background color change
                  '& .hover-typography': {
                    color: theme.palette.success.main, // Change Typography color on hover
                  },
                },
              }}
            >
              <Typography
                variant="h1"
                className="hover-typography"
                sx={{
                  fontSize: '5rem',
                  fontFamily: 'Georgia',
                  color: `${selectedScreen === 2 ? theme.palette.success.dark : 'black'}`,
                  transition: 'color 0.1s',
                }}
                fontStyle="bold"
                fontWeight={900}
              >
                II
              </Typography>
            </Grid>
          </Grid>
        );
      case 3:
        return (
          <Grid container>
            <Grid
              size={{ xs: 12, lg: 6 }}
              onClick={() => setSelectedScreen('1')}
              sx={{
                height: '80vh', // Full height for vertical centering
                overflow: 'hidden',
                border: `${selectedScreen === 1 ? '5px' : '2.5px'} solid ${
                  selectedScreen === 1 ? theme.palette.success.dark : 'black'
                }`,
                display: 'flex', // Flexbox for centering
                alignItems: 'center', // Vertical centering
                justifyContent: 'center', // Horizontal centering
                backgroundColor: `${selectedScreen === 1 ? theme.palette.success.light : 'white'}`,
                transition: 'border-color 0.3s, background-color 0.3s',
                '&:hover': {
                  borderColor: theme.palette.success.main, // Change border color on hover
                  backgroundColor: theme.palette.success.light, // Optional: Add background color change
                  '& .hover-typography': {
                    color: theme.palette.success.main, // Change Typography color on hover
                  },
                },
              }}
            >
              <Typography
                variant="h1"
                className="hover-typography"
                sx={{
                  fontSize: '5rem',
                  fontFamily: 'Georgia',
                  color: `${selectedScreen === 1 ? theme.palette.success.dark : 'black'}`,
                  transition: 'color 0.1s',
                }}
                fontStyle="bold"
                fontWeight={900}
              >
                I
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, lg: 6 }}>
              <Grid container direction={'column'}>
                <Grid
                  size={{ xs: 12 }}
                  onClick={() => setSelectedScreen('2')}
                  sx={{
                    height: '40vh', // Full height for vertical centering
                    overflow: 'hidden',
                    border: `${selectedScreen === 2 ? '5px' : '2.5px'} solid ${
                      selectedScreen === 2 ? theme.palette.success.dark : 'black'
                    }`,
                    display: 'flex', // Flexbox for centering
                    alignItems: 'center', // Vertical centering
                    justifyContent: 'center', // Horizontal centering
                    backgroundColor: `${
                      selectedScreen === 2 ? theme.palette.success.light : 'white'
                    }`,
                    transition: 'border-color 0.3s, background-color 0.3s',
                    '&:hover': {
                      borderColor: theme.palette.success.main, // Change border color on hover
                      backgroundColor: theme.palette.success.light, // Optional: Add background color change
                      '& .hover-typography': {
                        color: theme.palette.success.main, // Change Typography color on hover
                      },
                    },
                  }}
                >
                  <Typography
                    variant="h1"
                    className="hover-typography"
                    sx={{
                      fontSize: '5rem',
                      fontFamily: 'Georgia',
                      color: `${selectedScreen === 2 ? theme.palette.success.dark : 'black'}`,
                      transition: 'color 0.1s',
                    }}
                    fontStyle="bold"
                    fontWeight={900}
                  >
                    II
                  </Typography>
                </Grid>
                <Grid
                  size={{ xs: 12 }}
                  onClick={() => setSelectedScreen('3')}
                  sx={{
                    height: '40vh', // Full height for vertical centering
                    overflow: 'hidden',
                    border: `${selectedScreen === 3 ? '5px' : '2.5px'} solid ${
                      selectedScreen === 3 ? theme.palette.success.dark : 'black'
                    }`,
                    display: 'flex', // Flexbox for centering
                    alignItems: 'center', // Vertical centering
                    justifyContent: 'center', // Horizontal centering
                    backgroundColor: `${
                      selectedScreen === 3 ? theme.palette.success.light : 'white'
                    }`,
                    transition: 'border-color 0.3s, background-color 0.3s',
                    '&:hover': {
                      borderColor: theme.palette.success.main, // Change border color on hover
                      backgroundColor: theme.palette.success.light, // Optional: Add background color change
                      '& .hover-typography': {
                        color: theme.palette.success.main, // Change Typography color on hover
                      },
                    },
                  }}
                >
                  <Typography
                    variant="h1"
                    className="hover-typography"
                    sx={{
                      fontSize: '5rem',
                      fontFamily: 'Georgia',
                      color: `${selectedScreen === 3 ? theme.palette.success.dark : 'black'}`,
                      transition: 'color 0.1s',
                    }}
                    fontStyle="bold"
                    fontWeight={900}
                  >
                    III
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        );
      case 4:
        return (
          <Grid container>
            <Grid size={{ xs: 12, lg: 6 }}>
              <Grid container direction={'column'}>
                <Grid
                  size={{ xs: 12 }}
                  onClick={() => setSelectedScreen('1')}
                  sx={{
                    height: '40vh', // Full height for vertical centering
                    overflow: 'hidden',
                    border: `${selectedScreen === 1 ? '5px' : '2.5px'} solid ${
                      selectedScreen === 1 ? theme.palette.success.dark : 'black'
                    }`,
                    display: 'flex', // Flexbox for centering
                    alignItems: 'center', // Vertical centering
                    justifyContent: 'center', // Horizontal centering
                    backgroundColor: `${
                      selectedScreen === 1 ? theme.palette.success.light : 'white'
                    }`,
                    transition: 'border-color 0.3s, background-color 0.3s',
                    '&:hover': {
                      borderColor: theme.palette.success.main, // Change border color on hover
                      backgroundColor: theme.palette.success.light, // Optional: Add background color change
                      '& .hover-typography': {
                        color: theme.palette.success.main, // Change Typography color on hover
                      },
                    },
                  }}
                >
                  <Typography
                    variant="h1"
                    className="hover-typography"
                    sx={{
                      fontSize: '5rem',
                      fontFamily: 'Georgia',
                      color: `${selectedScreen === 1 ? theme.palette.success.dark : 'black'}`,
                      transition: 'color 0.1s',
                    }}
                    fontStyle="bold"
                    fontWeight={900}
                  >
                    I
                  </Typography>
                </Grid>
                <Grid
                  size={{ xs: 12 }}
                  onClick={() => setSelectedScreen('3')}
                  sx={{
                    height: '40vh', // Full height for vertical centering
                    overflow: 'hidden',
                    border: `${selectedScreen === 3 ? '5px' : '2.5px'} solid ${
                      selectedScreen === 3 ? theme.palette.success.dark : 'black'
                    }`,
                    display: 'flex', // Flexbox for centering
                    alignItems: 'center', // Vertical centering
                    justifyContent: 'center', // Horizontal centering
                    backgroundColor: `${
                      selectedScreen === 3 ? theme.palette.success.light : 'white'
                    }`,
                    transition: 'border-color 0.3s, background-color 0.3s',
                    '&:hover': {
                      borderColor: theme.palette.success.main, // Change border color on hover
                      backgroundColor: theme.palette.success.light, // Optional: Add background color change
                      '& .hover-typography': {
                        color: theme.palette.success.main, // Change Typography color on hover
                      },
                    },
                  }}
                >
                  <Typography
                    variant="h1"
                    className="hover-typography"
                    sx={{
                      fontSize: '5rem',
                      fontFamily: 'Georgia',
                      color: `${selectedScreen === 3 ? theme.palette.success.dark : 'black'}`,
                      transition: 'color 0.1s',
                    }}
                    fontStyle="bold"
                    fontWeight={900}
                  >
                    III
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
            <Grid size={{ xs: 12, lg: 6 }}>
              <Grid container direction={'column'}>
                <Grid
                  size={{ xs: 12 }}
                  onClick={() => setSelectedScreen('2')}
                  sx={{
                    height: '40vh', // Full height for vertical centering
                    overflow: 'hidden',
                    border: `${selectedScreen === 2 ? '5px' : '2.5px'} solid ${
                      selectedScreen === 2 ? theme.palette.success.dark : 'black'
                    }`,
                    display: 'flex', // Flexbox for centering
                    alignItems: 'center', // Vertical centering
                    justifyContent: 'center', // Horizontal centering
                    backgroundColor: `${
                      selectedScreen === 2 ? theme.palette.success.light : 'white'
                    }`,
                    transition: 'border-color 0.3s, background-color 0.3s',
                    '&:hover': {
                      borderColor: theme.palette.success.main, // Change border color on hover
                      backgroundColor: theme.palette.success.light, // Optional: Add background color change
                      '& .hover-typography': {
                        color: theme.palette.success.main, // Change Typography color on hover
                      },
                    },
                  }}
                >
                  <Typography
                    variant="h1"
                    className="hover-typography"
                    sx={{
                      fontSize: '5rem',
                      fontFamily: 'Georgia',
                      color: `${selectedScreen === 2 ? theme.palette.success.dark : 'black'}`,
                      transition: 'color 0.1s',
                    }}
                    fontStyle="bold"
                    fontWeight={900}
                  >
                    II
                  </Typography>
                </Grid>
                <Grid
                  size={{ xs: 12 }}
                  onClick={() => setSelectedScreen('4')}
                  sx={{
                    height: '40vh', // Full height for vertical centering
                    overflow: 'hidden',
                    border: `${selectedScreen === 4 ? '5px' : '2.5px'} solid ${
                      selectedScreen === 4 ? theme.palette.success.dark : 'black'
                    }`,
                    display: 'flex', // Flexbox for centering
                    alignItems: 'center', // Vertical centering
                    justifyContent: 'center', // Horizontal centering
                    backgroundColor: `${
                      selectedScreen === 4 ? theme.palette.success.light : 'white'
                    }`,
                    transition: 'border-color 0.3s, background-color 0.3s',
                    '&:hover': {
                      borderColor: theme.palette.success.main, // Change border color on hover
                      backgroundColor: theme.palette.success.light, // Optional: Add background color change
                      '& .hover-typography': {
                        color: theme.palette.success.main, // Change Typography color on hover
                      },
                    },
                  }}
                >
                  <Typography
                    variant="h1"
                    className="hover-typography"
                    sx={{
                      fontSize: '5rem',
                      fontFamily: 'Georgia',
                      color: `${selectedScreen === 4 ? theme.palette.success.dark : 'black'}`,
                      transition: 'color 0.1s',
                    }}
                    fontStyle="bold"
                    fontWeight={900}
                  >
                    IV
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        );
      case 5:
        return (
          <Grid container>
            <Grid size={{ xs: 12, lg: 8 }}>
              <Grid container>
                <Grid
                  size={{ xs: 12 }}
                  onClick={() => setSelectedScreen('1')}
                  sx={{
                    height: '53vh', // Full height for vertical centering
                    overflow: 'hidden',
                    border: `${selectedScreen === 1 ? '5px' : '2.5px'} solid ${
                      selectedScreen === 1 ? theme.palette.success.dark : 'black'
                    }`,
                    display: 'flex', // Flexbox for centering
                    alignItems: 'center', // Vertical centering
                    justifyContent: 'center', // Horizontal centering
                    backgroundColor: `${
                      selectedScreen === 1 ? theme.palette.success.light : 'white'
                    }`,
                    transition: 'border-color 0.3s, background-color 0.3s',
                    '&:hover': {
                      borderColor: theme.palette.success.main, // Change border color on hover
                      backgroundColor: theme.palette.success.light, // Optional: Add background color change
                      '& .hover-typography': {
                        color: theme.palette.success.main, // Change Typography color on hover
                      },
                    },
                  }}
                >
                  <Typography
                    variant="h1"
                    className="hover-typography"
                    sx={{
                      fontSize: '5rem',
                      fontFamily: 'Georgia',
                      color: `${selectedScreen === 1 ? theme.palette.success.dark : 'black'}`,
                      transition: 'color 0.1s',
                    }}
                    fontStyle="bold"
                    fontWeight={900}
                  >
                    I
                  </Typography>
                </Grid>
              </Grid>
              <Grid container>
                <Grid
                  size={{ xs: 12, lg: 6 }}
                  onClick={() => setSelectedScreen('3')}
                  sx={{
                    height: '27vh', // Full height for vertical centering
                    overflow: 'hidden',
                    border: `${selectedScreen === 3 ? '5px' : '2.5px'} solid ${
                      selectedScreen === 3 ? theme.palette.success.dark : 'black'
                    }`,
                    display: 'flex', // Flexbox for centering
                    alignItems: 'center', // Vertical centering
                    justifyContent: 'center', // Horizontal centering
                    backgroundColor: `${
                      selectedScreen === 3 ? theme.palette.success.light : 'white'
                    }`,
                    transition: 'border-color 0.3s, background-color 0.3s',
                    '&:hover': {
                      borderColor: theme.palette.success.main, // Change border color on hover
                      backgroundColor: theme.palette.success.light, // Optional: Add background color change
                      '& .hover-typography': {
                        color: theme.palette.success.main, // Change Typography color on hover
                      },
                    },
                  }}
                >
                  <Typography
                    variant="h1"
                    className="hover-typography"
                    sx={{
                      fontSize: '5rem',
                      fontFamily: 'Georgia',
                      color: `${selectedScreen === 3 ? theme.palette.success.dark : 'black'}`,
                      transition: 'color 0.1s',
                    }}
                    fontStyle="bold"
                    fontWeight={900}
                  >
                    III
                  </Typography>
                </Grid>
                <Grid
                  size={{ xs: 12, lg: 6 }}
                  onClick={() => setSelectedScreen('4')}
                  sx={{
                    height: '27vh', // Full height for vertical centering
                    overflow: 'hidden',
                    border: `${selectedScreen === 4 ? '5px' : '2.5px'} solid ${
                      selectedScreen === 4 ? theme.palette.success.dark : 'black'
                    }`,
                    display: 'flex', // Flexbox for centering
                    alignItems: 'center', // Vertical centering
                    justifyContent: 'center', // Horizontal centering
                    backgroundColor: `${
                      selectedScreen === 4 ? theme.palette.success.light : 'white'
                    }`,
                    transition: 'border-color 0.3s, background-color 0.3s',
                    '&:hover': {
                      borderColor: theme.palette.success.main, // Change border color on hover
                      backgroundColor: theme.palette.success.light, // Optional: Add background color change
                      '& .hover-typography': {
                        color: theme.palette.success.main, // Change Typography color on hover
                      },
                    },
                  }}
                >
                  <Typography
                    variant="h1"
                    className="hover-typography"
                    sx={{
                      fontSize: '5rem',
                      fontFamily: 'Georgia',
                      color: `${selectedScreen === 4 ? theme.palette.success.dark : 'black'}`,
                      transition: 'color 0.1s',
                    }}
                    fontStyle="bold"
                    fontWeight={900}
                  >
                    IV
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <Grid container>
                <Grid
                  size={{ xs: 12 }}
                  onClick={() => setSelectedScreen('2')}
                  sx={{
                    height: '40vh', // Full height for vertical centering
                    overflow: 'hidden',
                    border: `${selectedScreen === 2 ? '5px' : '2.5px'} solid ${
                      selectedScreen === 2 ? theme.palette.success.dark : 'black'
                    }`,
                    display: 'flex', // Flexbox for centering
                    alignItems: 'center', // Vertical centering
                    justifyContent: 'center', // Horizontal centering
                    backgroundColor: `${
                      selectedScreen === 2 ? theme.palette.success.light : 'white'
                    }`,
                    transition: 'border-color 0.3s, background-color 0.3s',
                    '&:hover': {
                      borderColor: theme.palette.success.main, // Change border color on hover
                      backgroundColor: theme.palette.success.light, // Optional: Add background color change
                      '& .hover-typography': {
                        color: theme.palette.success.main, // Change Typography color on hover
                      },
                    },
                  }}
                >
                  <Typography
                    variant="h1"
                    className="hover-typography"
                    sx={{
                      fontSize: '5rem',
                      fontFamily: 'Georgia',
                      color: `${selectedScreen === 2 ? theme.palette.success.dark : 'black'}`,
                      transition: 'color 0.1s',
                    }}
                    fontStyle="bold"
                    fontWeight={900}
                  >
                    II
                  </Typography>
                </Grid>
                <Grid
                  size={{ xs: 12 }}
                  onClick={() => setSelectedScreen('5')}
                  sx={{
                    height: '40vh', // Full height for vertical centering
                    overflow: 'hidden',
                    border: `${selectedScreen === 5 ? '5px' : '2.5px'} solid ${
                      selectedScreen === 5 ? theme.palette.success.dark : 'black'
                    }`,
                    display: 'flex', // Flexbox for centering
                    alignItems: 'center', // Vertical centering
                    justifyContent: 'center', // Horizontal centering
                    backgroundColor: `${
                      selectedScreen === 5 ? theme.palette.success.light : 'white'
                    }`,
                    transition: 'border-color 0.3s, background-color 0.3s',
                    '&:hover': {
                      borderColor: theme.palette.success.main, // Change border color on hover
                      backgroundColor: theme.palette.success.light, // Optional: Add background color change
                      '& .hover-typography': {
                        color: theme.palette.success.main, // Change Typography color on hover
                      },
                    },
                  }}
                >
                  <Typography
                    variant="h1"
                    className="hover-typography"
                    sx={{
                      fontSize: '5rem',
                      fontFamily: 'Georgia',
                      color: `${selectedScreen === 5 ? theme.palette.success.dark : 'black'}`,
                      transition: 'color 0.1s',
                    }}
                    fontStyle="bold"
                    fontWeight={900}
                  >
                    V
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        );
      case 6:
        return (
          <Grid container>
            <Grid size={{ xs: 12, lg: 8 }}>
              <Grid container>
                <Grid
                  size={{ xs: 12 }}
                  onClick={() => setSelectedScreen('1')}
                  sx={{
                    height: '53vh', // Full height for vertical centering
                    overflow: 'hidden',
                    border: `${selectedScreen === 1 ? '5px' : '2.5px'} solid ${
                      selectedScreen === 1 ? theme.palette.success.dark : 'black'
                    }`,
                    display: 'flex', // Flexbox for centering
                    alignItems: 'center', // Vertical centering
                    justifyContent: 'center', // Horizontal centering
                    backgroundColor: `${
                      selectedScreen === 1 ? theme.palette.success.light : 'white'
                    }`,
                    transition: 'border-color 0.3s, background-color 0.3s',
                    '&:hover': {
                      borderColor: theme.palette.success.main, // Change border color on hover
                      backgroundColor: theme.palette.success.light, // Optional: Add background color change
                      '& .hover-typography': {
                        color: theme.palette.success.main, // Change Typography color on hover
                      },
                    },
                  }}
                >
                  <Typography
                    variant="h1"
                    className="hover-typography"
                    sx={{
                      fontSize: '5rem',
                      fontFamily: 'Georgia',
                      color: `${selectedScreen === 1 ? theme.palette.success.dark : 'black'}`,
                      transition: 'color 0.1s',
                    }}
                    fontStyle="bold"
                    fontWeight={900}
                  >
                    I
                  </Typography>
                </Grid>
              </Grid>
              <Grid container>
                <Grid
                  size={{ xs: 12, lg: 6 }}
                  onClick={() => setSelectedScreen('4')}
                  sx={{
                    height: '27vh', // Full height for vertical centering
                    overflow: 'hidden',
                    border: `${selectedScreen === 4 ? '5px' : '2.5px'} solid ${
                      selectedScreen === 4 ? theme.palette.success.dark : 'black'
                    }`,
                    display: 'flex', // Flexbox for centering
                    alignItems: 'center', // Vertical centering
                    justifyContent: 'center', // Horizontal centering
                    backgroundColor: `${
                      selectedScreen === 4 ? theme.palette.success.light : 'white'
                    }`,
                    transition: 'border-color 0.3s, background-color 0.3s',
                    '&:hover': {
                      borderColor: theme.palette.success.main, // Change border color on hover
                      backgroundColor: theme.palette.success.light, // Optional: Add background color change
                      '& .hover-typography': {
                        color: theme.palette.success.main, // Change Typography color on hover
                      },
                    },
                  }}
                >
                  <Typography
                    variant="h1"
                    className="hover-typography"
                    sx={{
                      fontSize: '5rem',
                      fontFamily: 'Georgia',
                      color: `${selectedScreen === 4 ? theme.palette.success.dark : 'black'}`,
                      transition: 'color 0.1s',
                    }}
                    fontStyle="bold"
                    fontWeight={900}
                  >
                    IV
                  </Typography>
                </Grid>
                <Grid
                  size={{ xs: 12, lg: 6 }}
                  onClick={() => setSelectedScreen('5')}
                  sx={{
                    height: '27vh', // Full height for vertical centering
                    overflow: 'hidden',
                    border: `${selectedScreen === 5 ? '5px' : '2.5px'} solid ${
                      selectedScreen === 5 ? theme.palette.success.dark : 'black'
                    }`,
                    display: 'flex', // Flexbox for centering
                    alignItems: 'center', // Vertical centering
                    justifyContent: 'center', // Horizontal centering
                    backgroundColor: `${
                      selectedScreen === 5 ? theme.palette.success.light : 'white'
                    }`,
                    transition: 'border-color 0.3s, background-color 0.3s',
                    '&:hover': {
                      borderColor: theme.palette.success.main, // Change border color on hover
                      backgroundColor: theme.palette.success.light, // Optional: Add background color change
                      '& .hover-typography': {
                        color: theme.palette.success.main, // Change Typography color on hover
                      },
                    },
                  }}
                >
                  <Typography
                    variant="h1"
                    className="hover-typography"
                    sx={{
                      fontSize: '5rem',
                      fontFamily: 'Georgia',
                      color: `${selectedScreen === 5 ? theme.palette.success.dark : 'black'}`,
                      transition: 'color 0.1s',
                    }}
                    fontStyle="bold"
                    fontWeight={900}
                  >
                    V
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <Grid container>
                <Grid
                  size={{ xs: 12 }}
                  onClick={() => setSelectedScreen('2')}
                  sx={{
                    height: '27vh', // Full height for vertical centering
                    overflow: 'hidden',
                    border: `${selectedScreen === 2 ? '5px' : '2.5px'} solid ${
                      selectedScreen === 2 ? theme.palette.success.dark : 'black'
                    }`,
                    display: 'flex', // Flexbox for centering
                    alignItems: 'center', // Vertical centering
                    justifyContent: 'center', // Horizontal centering
                    backgroundColor: `${
                      selectedScreen === 2 ? theme.palette.success.light : 'white'
                    }`,
                    transition: 'border-color 0.3s, background-color 0.3s',
                    '&:hover': {
                      borderColor: theme.palette.success.main, // Change border color on hover
                      backgroundColor: theme.palette.success.light, // Optional: Add background color change
                      '& .hover-typography': {
                        color: theme.palette.success.main, // Change Typography color on hover
                      },
                    },
                  }}
                >
                  <Typography
                    variant="h1"
                    className="hover-typography"
                    sx={{
                      fontSize: '5rem',
                      fontFamily: 'Georgia',
                      color: `${selectedScreen === 2 ? theme.palette.success.dark : 'black'}`,
                      transition: 'color 0.1s',
                    }}
                    fontStyle="bold"
                    fontWeight={900}
                  >
                    II
                  </Typography>
                </Grid>
                <Grid
                  size={{ xs: 12 }}
                  onClick={() => setSelectedScreen('3')}
                  sx={{
                    height: '26vh', // Full height for vertical centering
                    overflow: 'hidden',
                    border: `${selectedScreen === 3 ? '5px' : '2.5px'} solid ${
                      selectedScreen === 3 ? theme.palette.success.dark : 'black'
                    }`,
                    display: 'flex', // Flexbox for centering
                    alignItems: 'center', // Vertical centering
                    justifyContent: 'center', // Horizontal centering
                    backgroundColor: `${
                      selectedScreen === 3 ? theme.palette.success.light : 'white'
                    }`,
                    transition: 'border-color 0.3s, background-color 0.3s',
                    '&:hover': {
                      borderColor: theme.palette.success.main, // Change border color on hover
                      backgroundColor: theme.palette.success.light, // Optional: Add background color change
                      '& .hover-typography': {
                        color: theme.palette.success.main, // Change Typography color on hover
                      },
                    },
                  }}
                >
                  <Typography
                    variant="h1"
                    className="hover-typography"
                    sx={{
                      fontSize: '5rem',
                      fontFamily: 'Georgia',
                      color: `${selectedScreen === 3 ? theme.palette.success.dark : 'black'}`,
                      transition: 'color 0.1s',
                    }}
                    fontStyle="bold"
                    fontWeight={900}
                  >
                    III
                  </Typography>
                </Grid>
                <Grid
                  size={{ xs: 12 }}
                  onClick={() => setSelectedScreen('6')}
                  sx={{
                    height: '27vh', // Full height for vertical centering
                    overflow: 'hidden',
                    border: `${selectedScreen === 6 ? '5px' : '2.5px'} solid ${
                      selectedScreen === 6 ? theme.palette.success.dark : 'black'
                    }`,
                    display: 'flex', // Flexbox for centering
                    alignItems: 'center', // Vertical centering
                    justifyContent: 'center', // Horizontal centering
                    backgroundColor: `${
                      selectedScreen === 6 ? theme.palette.success.light : 'white'
                    }`,
                    transition: 'border-color 0.3s, background-color 0.3s',
                    '&:hover': {
                      borderColor: theme.palette.success.main, // Change border color on hover
                      backgroundColor: theme.palette.success.light, // Optional: Add background color change
                      '& .hover-typography': {
                        color: theme.palette.success.main, // Change Typography color on hover
                      },
                    },
                  }}
                >
                  <Typography
                    variant="h1"
                    className="hover-typography"
                    sx={{
                      fontSize: '5rem',
                      fontFamily: 'Georgia',
                      color: `${selectedScreen === 6 ? theme.palette.success.dark : 'black'}`,
                      transition: 'color 0.1s',
                    }}
                    fontStyle="bold"
                    fontWeight={900}
                  >
                    VI
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        );
      default:
        return (
          <Grid container>
            <Grid size={{ xs: 12 }}>
              <Typography variant="h4" fontStyle="bold" fontWeight={900} mt={0.5}>
                Monitoring Dashboard
              </Typography>
              <Typography variant="h6" fontStyle="bold" fontWeight={900} mt={0.5}>
                Please select a Grid
              </Typography>
            </Grid>
          </Grid>
        );
    }
  };
  return (
    <Box
      mt={0}
      sx={{
        flexGrow: 1,
        margin: 0,
        padding: 0,
        marginLeft: `calc(${customizer.SidebarWidth}px)`,
        transition: theme.transitions.create('margin-left', {
          duration: theme.transitions.duration.shortest,
        }),
      }}
    >
      {renderLayout()}
    </Box>
  );
};

export default ConfigPreview;
