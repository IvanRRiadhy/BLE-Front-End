import { useState } from 'react';
import {
  Card,
  Box,
  Tabs,
  Tab,
  Divider,
  CardContent,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSelector } from 'src/store/Store';
import { RootState } from 'src/store/Store';

type TabItem = {
  key: string;
  title: React.ReactNode;
  content: React.ReactNode;
  badge?: React.ReactNode;
};

type Props = {
  tabs: TabItem[];
  defaultActiveKey?: string;
};

const TabbedParentCard = ({ tabs, defaultActiveKey }: Props) => {
  const customizer = useSelector((state: RootState) => state.customizer);
  const theme = useTheme();
  const borderColor = theme.palette.divider;

  const [activeKey, setActiveKey] = useState(
    defaultActiveKey ?? tabs[0]?.key
  );

  const activeTab = tabs.find((t) => t.key === activeKey);

  return (
    <Card
      sx={{
        padding: 0,
        border: !customizer.isCardShadow
          ? `1px solid ${borderColor}`
          : 'none',
      }}
      elevation={customizer.isCardShadow ? 9 : 0}
      variant={!customizer.isCardShadow ? 'outlined' : undefined}
    >
      {/* Tab Header */}
      <Box px={2} pt={1}>
        <Tabs
          value={activeKey}
          onChange={(_, v) => setActiveKey(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.key}
              value={tab.key}
              label={
                <Box display="flex" alignItems="center" gap={1} minWidth={150}>
                  {tab.title}
                  {/* {tab.badge} */}
                </Box>
              }
            />
          ))}
        </Tabs>
      </Box>

      <Divider />

      {/* Content */}
      <CardContent>
        {activeTab?.content}
      </CardContent>
    </Card>
  );
};

export default TabbedParentCard;
