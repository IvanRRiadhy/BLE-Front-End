import { FC } from 'react';
import { useSelector } from 'src/store/Store';
import { Link } from 'react-router';
import LogoImage from 'src/assets/images/logos/logoBioPng.png';
import LogoIcon from 'src/assets/images/logos/logoOnlyBio.png';
import { styled } from '@mui/material';
import { AppState } from 'src/store/Store';

const Logo: FC = () => {
  const customizer = useSelector((state: AppState) => state.customizer);

  const LinkStyled = styled(Link)(() => ({
    height: customizer.TopbarHeight,
    width: customizer.isCollapse ? '60px' : '220px',
    overflow: 'hidden',
    display: 'block',
    padding: '4px', // Added padding for spacing
  }));

  return (
    <LinkStyled
      to="/"
      style={{
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <img
        src={customizer.isCollapse ? LogoIcon : LogoImage}
        alt="Logo"
        style={{
          height: '100%', // Reduce the logo size
          maxHeight: '50px',
          width: '100%',
          objectFit: 'contain',
        }}
      />
    </LinkStyled>
  );
};

export default Logo;
