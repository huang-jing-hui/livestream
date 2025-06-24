"use client";

import { InfoCircledIcon } from "@radix-ui/react-icons";
import {
  AccessibleIcon,
  IconButton,
  Popover,
  Strong,
  Text,
} from "@radix-ui/themes";

export function AllowParticipationInfo() {
  return (
    <Popover.Root>
      <Popover.Trigger>
        <IconButton size="1" variant="ghost" color="gray">
          <AccessibleIcon label="Learn more about panel background options">
            <InfoCircledIcon />
          </AccessibleIcon>
        </IconButton>
      </Popover.Trigger>

      <Popover.Content
        size="1"
        style={{ maxWidth: 360 }}
        side="top"
        align="center"
      >
        <Text as="p" size="1">
          如果启用，观众可以<Strong>举手</Strong>。什么时候
          主播接受后，他们可以共享自己的音频和视频。主播
          还可以<Strong>邀请</Strong>观众上台
        </Text>
      </Popover.Content>
    </Popover.Root>
  );
}
