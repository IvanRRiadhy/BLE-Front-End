import { FC } from 'react';
import { useSelector } from 'src/store/Store';
import { Link } from 'react-router';
import LogoImage from 'src/assets/images/logos/BI_Logo.png';
import LogoIcon from 'src/assets/images/logos/BI_Logo_Mini2.png';
import { styled } from '@mui/material';
import { RootState } from 'src/store/Store';

const Logo: FC = () => {
  const customizer = useSelector((state: RootState) => state.customizer);
  const settings = useSelector((state: RootState) => state.settings);

  const LinkStyled = styled(Link)(() => ({
    height: settings.TopbarHeight,
    width: '220px',
    overflow: 'hidden',
    display: 'block',
    padding: '4px', // Added padding for spacing
  }));

  return (
    <LinkStyled
      to="/security-view/dashboard"
      style={{
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <img
        src={LogoImage}
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
