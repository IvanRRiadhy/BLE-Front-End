import { Box, Typography } from "@mui/material";
import React from "react";

interface TopButtonProps {
  icon: React.ElementType;
  label: string;
  label2?: string;
  num?: number;
  color: string;
}

const TopButton: React.FC<TopButtonProps> = ({
  icon: Icon,
  label,
  label2,
  num,
  color,
}) => {
  return (
    <Box
      sx={{
        width: "8.85vw",
        height: "7.15vh",
        px: 1.5,
        borderRadius: "15px",
        border: `1px solid ${color}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: "pointer",
        transition: "all 0.2s ease",
        "&:hover": {
          backgroundColor: "#023a6a",
          "& *": { color: "#fff" },
        },
      }}
    >
      {/* Left */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Icon size={20} color={color} />
        <Box>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color }}>
            {label}
          </Typography>
          {label2 && (
            <Typography sx={{ fontSize: 10, color }}>
              {label2}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Right */}
      <Typography
        sx={{
          fontSize: 16,
          fontWeight: 700,
          color: "#009900",
        }}
      >
        {num ?? "-"}
      </Typography>
    </Box>
  );
};

export default TopButton;
