import React from 'react';
import { Tooltip, Typography, TypographyProps } from '@mui/material';
import { useTranslation } from 'react-i18next';
import i18n from 'src/utils/i18n';

/**
 * Formats a number with locale-aware abbreviations by flooring the value.
 *
 * English ("en"):
 *   1,000 -> "1k"
 *   1,000,000 -> "1M"
 *   1,000,000,000 -> "1B"
 *   1,000,000,000,000 -> "1T"
 *
 * Indonesian ("id"):
 *   1.000 -> "1Rb"
 *   1.000.000 -> "1Jt"
 *   1.000.000.000 -> "1M"
 *   1.000.000.000.000 -> "1T"
 */
export function formatAbbreviatedNumber(
  value: number | null | undefined,
  lang?: string,
): string {
  if (value === null || value === undefined || isNaN(value)) return '0';

  const currentLang = (lang || i18n.language || 'en').toLowerCase();
  const isIndonesian = currentLang.startsWith('id');

  const suffixes = isIndonesian
    ? { thousand: 'Rb', million: 'Jt', billion: 'M', trillion: 'T' }
    : { thousand: 'k', million: 'M', billion: 'B', trillion: 'T' };

  const num = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (num < 1000) {
    return `${sign}${Math.floor(num)}`;
  } else if (num < 1000000) {
    return `${sign}${Math.floor(num / 1000)}${suffixes.thousand}`;
  } else if (num < 1000000000) {
    return `${sign}${Math.floor(num / 1000000)}${suffixes.million}`;
  } else if (num < 1000000000000) {
    return `${sign}${Math.floor(num / 1000000000)}${suffixes.billion}`;
  } else {
    return `${sign}${Math.floor(num / 1000000000000)}${suffixes.trillion}`;
  }
}

export interface AbbreviatedNumberProps extends TypographyProps {
  value: number | null | undefined;
  prefix?: string;
  suffix?: string;
  fallback?: string;
  lang?: string;
}

export const AbbreviatedNumber: React.FC<AbbreviatedNumberProps> = ({
  value,
  prefix = '',
  suffix = '',
  fallback = '-',
  lang,
  ...typographyProps
}) => {
  const { i18n: i18nInstance } = useTranslation();
  const activeLang = lang || i18nInstance?.language;

  if (value === null || value === undefined || isNaN(value)) {
    return (
      <Typography component="span" {...typographyProps}>
        {fallback}
      </Typography>
    );
  }

  const locale = (activeLang || 'en').toLowerCase().startsWith('id') ? 'id-ID' : 'en-US';
  const fullText = `${prefix}${value.toLocaleString(locale)}${suffix}`;
  const abbreviatedText = `${prefix}${formatAbbreviatedNumber(value, activeLang)}${suffix}`;

  return (
    <Tooltip title={fullText} arrow placement="top">
      <Typography
        component="span"
        {...typographyProps}
        sx={{
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          maxWidth: '100%',
          display: 'inline-block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          ...typographyProps.sx,
        }}
      >
        {abbreviatedText}
      </Typography>
    </Tooltip>
  );
};

export default AbbreviatedNumber;
