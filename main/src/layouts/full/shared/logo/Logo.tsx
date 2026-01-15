import { FC } from 'react';
import { useSelector } from 'src/store/Store';
import { Link } from 'react-router';
import { styled } from '@mui/material';
import { RootState } from 'src/store/Store';
import LogoImage from 'src/assets/images/logos/BI_Logo.png';
import LogoIcon from 'src/assets/images/logos/BI_Logo_Mini2.png';

// ✅ Style outside the component (no Redux dependencies here)
const LinkStyled = styled(Link)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  padding: '4px',
  textDecoration: 'none',
  transition: 'width 0.3s ease',
}));

const ImgStyled = styled('img')({
  height: '100%',
  maxHeight: '50px',
  width: '100%',
  objectFit: 'contain',
  transition: 'opacity 0.3s ease',
  imageRendering: 'auto',
});

const Logo: FC = () => {
  const customizer = useSelector((state: RootState) => state.customizer);

  const logoSrc = customizer.isCollapse ? LogoIcon : LogoImage;
  const linkWidth = customizer.isCollapse ? '60px' : '180px';
  const topbarHeight = customizer.TopbarHeight ?? 64;

  return (
    <LinkStyled
      to="/"
      sx={{
        height: topbarHeight,
        width: linkWidth,
      }}
      aria-label="Home"
    >
      <ImgStyled
        src={logoSrc}
        alt="Logo"
        loading="lazy"
        decoding="async"
        // fetchPriority="high"
      />
    </LinkStyled>
  );
};

export default Logo;
