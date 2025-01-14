import { useState } from 'react';
import {
  Group,
  Text,
  Button,
  Popover,
  Box,
  ActionIcon,
  CopyButton,
} from '@mantine/core';

interface User {
  id: number;
  username: string;
}

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

function Header({ user, onLogout }: HeaderProps) {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <header className="header">
      <Group justify="space-between" p="md">
        <Group>
          {/* User profile with ID */}
          <Popover
            opened={showProfile}
            onClose={() => setShowProfile(false)}
            position="bottom"
            width={200}
            withArrow
          >
            <Popover.Target>
              <ActionIcon
                size="lg"
                variant="subtle"
                onMouseEnter={() => setShowProfile(true)}
                onMouseLeave={() => setShowProfile(false)}
              >
                <Text>👤</Text>
              </ActionIcon>
            </Popover.Target>

            <Popover.Dropdown>
              <Box>
                <Text fw={500}>
                  Profile
                </Text>
                <Text size="sm" mt={5}>
                  Name: {user.username}
                </Text>
                <Group gap={5} mt={5}>
                  <Text size="sm">ID: #{user.id}</Text>
                  <CopyButton value={user.id.toString()}>
                    {({ copied, copy }) => (
                      <Button
                        variant="subtle"
                        size="xs"
                        onClick={copy}
                      >
                        {copied ? '✓ Copied' : 'Copy'}
                      </Button>
                    )}
                  </CopyButton>
                </Group>
              </Box>
            </Popover.Dropdown>
          </Popover>

          <Text fw={500}>{user.username}</Text>
        </Group>

        {/* Logout button */}
        <Button variant="subtle" color="red" onClick={onLogout}>
          Logout
        </Button>
      </Group>
    </header>
  );
}

export default Header;