"use client";

import { ParticipantMetadata, RoomMetadata } from "@/lib/controller";
import {
  useLocalParticipant,
  useParticipants,
  useRoomContext,
} from "@livekit/components-react";
import { Cross1Icon, PersonIcon } from "@radix-ui/react-icons";
import {
  Avatar,
  Button,
  Dialog,
  Flex,
  IconButton,
  Text,
} from "@radix-ui/themes";
import { Participant } from "livekit-client";
import { useAuthToken } from "./token-context";

function ParticipantListItem({
  participant,
  isCurrentUser,
  isHost = false,
}: {
  participant: Participant;
  isCurrentUser: boolean;
  isHost?: boolean;
}) {
  const authToken = useAuthToken();
  const participantMetadata = (participant.metadata &&
    JSON.parse(participant.metadata)) as ParticipantMetadata;
  console.log(JSON.stringify(participant))
  const room = useRoomContext();
  const roomMetadata = (room.metadata &&
    JSON.parse(room.metadata)) as RoomMetadata;

  const onInvite = async () => {
    // TODO: optimistic update
    await fetch("/api/invite_to_stage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${authToken}`,
      },
      body: JSON.stringify({
        identity: participant.identity,
      }),
    });
  };

  // TODO: optimistic update
  const onRaiseHand = async () => {
    await fetch("/api/raise_hand", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${authToken}`,
      },
    });
  };

  // TODO: optimistic update
  const onCancel = async () => {
    await fetch("/api/remove_from_stage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${authToken}`,
      },
      body: JSON.stringify({
        identity: participant.identity,
      }),
    });
  };

  function HostActions() {
    if (!isCurrentUser) {
      if (
        participantMetadata.invited_to_stage &&
        participantMetadata.hand_raised
      ) {
        return (
          <Button size="1" variant="outline" onClick={onCancel}>
            下台
          </Button>
        );
      } else if (participantMetadata.hand_raised) {
        return (
          <Flex gap="2">
            <Button size="1" onClick={onInvite}>
              接受
            </Button>
            <Button size="1" variant="outline" onClick={onCancel}>
              拒绝
            </Button>
          </Flex>
        );
      } else if (participantMetadata.invited_to_stage) {
        return (
          <Button size="1" variant="outline" disabled>
            等候
          </Button>
        );
      } else if (!participantMetadata.invited_to_stage) {
        return (
          <Button size="1" onClick={onInvite}>
            邀请上台
          </Button>
        );
      }
    }
    return null
  }

  function ViewerActions() {
    if (isCurrentUser) {
      if (
        participantMetadata.invited_to_stage &&
        participantMetadata.hand_raised
      ) {
        return (
          <Button size="1" onClick={onCancel}>
            下台
          </Button>
        );
      } else if (
        participantMetadata.invited_to_stage &&
        !participantMetadata.hand_raised
      ) {
        return (
          <Flex gap="2">
            <Button size="1" onClick={onRaiseHand}>
              接受
            </Button>
            <Button size="1" variant="outline" onClick={onCancel}>
              拒绝
            </Button>
          </Flex>
        );
      } else if (
        !participantMetadata.invited_to_stage &&
        participantMetadata.hand_raised
      ) {
        return (
          <Button size="1" variant="outline" onClick={onCancel}>
            取消
          </Button>
        );
      } else if (
        !participantMetadata.invited_to_stage &&
        !participantMetadata.hand_raised
      ) {
        return (
          <Button size="1" onClick={onRaiseHand}>
            举手
          </Button>
        );
      }
    }
    return null;
  }

  return (
    <Flex key={participant.sid} justify="between">
      <Flex align="center" gap="2">
        <Avatar
          size="1"
          fallback={participant.identity[0] ?? <PersonIcon />}
          radius="full"
        />
        <Text className={isCurrentUser ? "text-accent-11" : ""}>
          {participant.identity}
          {isCurrentUser && " (you)"}
        </Text>
      </Flex>
      {isHost && roomMetadata.allow_participation ? (
        <HostActions />
      ) : (
        <ViewerActions />
      )}
    </Flex>
  );
}

export function PresenceDialog({
  children,
  isHost = false,
}: {
  children: React.ReactNode;
  isHost?: boolean;
}) {
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const hosts = participants.filter(
    (participant) => participant.permissions?.canPublish ?? false
  );
  const viewers = participants.filter(
    (participant) => !participant.permissions?.canPublish
  );

  return (
    <Dialog.Root>
      <Dialog.Trigger>{children}</Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title>
          <Flex justify="between" align="center">
            观众列表
            <Dialog.Close>
              <IconButton variant="ghost" color="gray">
                <Cross1Icon />
              </IconButton>
            </Dialog.Close>
          </Flex>
        </Dialog.Title>
        <Flex direction="column" gap="4" mt="4">
          {hosts.length > 0 && (
            <Flex direction="column" gap="2">
              <Text size="1" className="uppercase font-bold text-gray-11">
                {hosts.length > 1 ? "台上" : "Host"}
              </Text>
              {hosts.map((participant) => (
                <ParticipantListItem
                  key={participant.identity}
                  participant={participant}
                  isCurrentUser={
                    participant.identity === localParticipant.identity
                  }
                  isHost={isHost}
                />
              ))}
            </Flex>
          )}
          {viewers.length > 0 && (
            <Flex direction="column" gap="2">
              <Text size="1" className="uppercase font-bold text-gray-11">
                观众
              </Text>
              {viewers.map((participant) => (
                <ParticipantListItem
                  key={participant.identity}
                  participant={participant}
                  isCurrentUser={
                    participant.identity === localParticipant.identity
                  }
                  isHost={isHost}
                />
              ))}
            </Flex>
          )}
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
