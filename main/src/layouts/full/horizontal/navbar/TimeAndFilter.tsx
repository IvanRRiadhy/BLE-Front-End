import { useEffect, useState } from 'react';
import { Typography } from '@mui/material';
import { useSelector } from 'src/store/Store';
// import { useTranslation } from 'react-i18next';

const TimeAndFilter = () => {
    const [currentDateTime, setCurrentDateTime] = useState<string>('');
    //   const { t } = useTranslation();
    const language = useSelector((state) => state.customizer.isLanguage);
    const getLanguageLabel = () => {
        // console.log(language);
      switch (language) {
        case 'en':
          return 'en-US';
        case 'id':
          return 'id-ID';
        default:
          return 'en-US';
      }
    }
    const formatDateTime = () => {
    const now = new Date();
    return new Intl.DateTimeFormat(getLanguageLabel(), {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false, // Use 24-hour format
    })
      .format(now)
      .replace(/\./g, ':'); // Replace dots with colons
  };
//   useEffect(() =>{
//     console.log(language);
//   },[language])

    useEffect(() => {
    setCurrentDateTime(formatDateTime()); // Set initial time immediately
    const interval = setInterval(() => {
      setCurrentDateTime(formatDateTime());
    }, 1000);

    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, [language]);
  return (
    <Typography variant="body1" sx={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
      {currentDateTime}
    </Typography>
  );
};

export default TimeAndFilter;
