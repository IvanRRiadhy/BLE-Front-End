import { Box, Typography, Chip, Stack } from '@mui/material';
import { formatFullDateTime } from 'src/utils/time';
import { CardHistoryType } from 'src/store/apps/crud/cardRecord';
import { useSelector } from 'src/store/Store';
import { RootState } from 'src/store/Store';

interface CardHistoryItemProps {
  history: CardHistoryType;
  index: number;
  isLatest: boolean;
}

const CardHistoryItem = ({ history, index, isLatest }: CardHistoryItemProps) => {
  const language = useSelector((state: RootState) => state.customizer.isLanguage);
  const lang = language === 'id' ? 'id' : 'en';
  const append = language === 'id' ? 'hingga' : 'to';

  const startFormatted = history.checkinAt ? formatFullDateTime(history.checkinAt, lang) : '-';

  const endFormatted = history.checkoutAt
    ? formatFullDateTime(history.checkoutAt, lang)
    : lang === 'id'
      ? 'Aktif'
      : 'Active';

  return (
    <Box
      sx={{
        border: isLatest ? '2px solid' : '1px solid #DDD',
        borderColor: isLatest ? 'primary.main' : '#DDD',
        borderRadius: 1.5,
        p: 2,
        height: '100%',
        bgcolor: isLatest ? 'primary.lighter' : '#fafafa',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        '&:hover': {
          borderColor: 'secondary.main',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          transform: 'translateY(-2px)',
          bgcolor: '#f5f5f5',
        },
      }}
    >
      {/* Order badge */}
      <Chip
        size="small"
        label={`#${index + 1}`}
        sx={{
          position: 'absolute',
          top: 8,
          left: 8,
          bgcolor: 'grey.700',
          color: 'white',
          fontWeight: 700,
        }}
      />

      {/* Latest badge */}
      {isLatest && (
        <Chip
          size="small"
          label={lang === 'id' ? 'Terbaru' : 'Latest'}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: 'primary.main',
            color: 'white',
            fontWeight: 700,
          }}
        />
      )}

      {/* Card Number */}
      <Typography
        fontWeight={700}
        fontSize="0.85rem"
        sx={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          mt: 2,
        }}
      >
        Card Number: {history.cardNumber}
      </Typography>

      {/* Used By */}
      <Stack spacing={0.5} mt={1}>
        <Typography fontSize="0.8rem">
          Used By: <strong>{history.usedBy}</strong>
        </Typography>

        <Chip
          size="small"
          label={history.usedByType}
          sx={{
            width: 'fit-content',
            bgcolor: 'secondary.main',
            color: 'white',
            borderRadius: '8px',
          }}
        />
      </Stack>

      {/* Time Range */}
      <Typography fontWeight={400} fontSize="0.75rem" color="text.secondary" mt={1}>
        {startFormatted} {endFormatted.startsWith('A') ? '' : append} {endFormatted}
      </Typography>
    </Box>
  );
};

export default CardHistoryItem;
