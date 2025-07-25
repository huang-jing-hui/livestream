"use client";

import { RoomMetadata } from "@/lib/controller";
import {
  ReceivedChatMessage,
  useChat,
  useLocalParticipant,
  useRoomInfo,
} from "@livekit/components-react";
import { PaperPlaneIcon, PersonIcon } from "@radix-ui/react-icons";
import {
  Avatar,
  Box,
  Flex,
  IconButton,
  Text,
  TextField,
} from "@radix-ui/themes";
import {useEffect, useMemo, useState} from "react";
import EventBus from "../js/eventBus"

function ChatMessage({ message }: { message: ReceivedChatMessage }) {
  const { localParticipant } = useLocalParticipant();

  return (
    <Flex gap="2" align="start" className="break-words w-[220px]">
      <Avatar
        size="1"
        fallback={message.from?.identity[0] ?? <PersonIcon />}
        radius="full"
      />
      <Flex direction="column">
        <Text
          weight="bold"
          size="1"
          className={
            localParticipant.identity === message.from?.identity
              ? "text-accent-11"
              : "text-gray-11"
          }
        >
          {message.from?.identity ?? "Unknown"}
        </Text>
        <Text size="1">{message.message}</Text>
      </Flex>
    </Flex>
  );
}
export type MessageData = {
  type: number; // 1: 聊天, 2: 白板 ,3:视觉
  message: string; // 内容
};
export function Chat() {
  const [draft, setDraft] = useState("");
  const { chatMessages, send } = useChat();
  const { metadata } = useRoomInfo();

  const { enable_chat: chatEnabled } = (
    metadata ? JSON.parse(metadata) : {}
  ) as RoomMetadata;

  const messages = useMemo(() => {
    // 1. 去重处理
    const uniqueMessages = chatMessages.filter(
        (msg, index, self) =>
            index === self.findIndex((m) => (
                m.timestamp === msg.timestamp &&
                m.message === msg.message
            ))
    );

    // 2. 分类处理
    const chatMsgs: ReceivedChatMessage[] = [];

    uniqueMessages.forEach((msg) => {
      try {
        // const parsed = JSON.parse(msg.message) as MessageData;
        //
        // switch(parsed.type) {
        //   case 1: // 聊天消息
        //     chatMsgs.push({
        //       timestamp: msg.timestamp,
        //       message: parsed.message,
        //       from: msg.from
        //     });
        //     break;
        //   case 2: // 白板消息
        //     EventBus.publish("bai_ban", parsed);
        //     break;
        //   case 3: // 屏幕消息
        //     EventBus.publish("pin_mu", parsed);
        //     break;
        //   default:
        //     console.warn('Unknown message type:', parsed.type);
        // }
        chatMsgs.push(msg);
      } catch (e) {
        console.error('Message parsing failed:', e);
        // 如果解析失败，默认作为聊天消息处理
        chatMsgs.push(msg);
      }
    });

    return chatMsgs;
  }, [chatMessages]);


  const onSend = async () => {
    if (draft.trim().length && send) {
      setDraft("");
      // const message  ={
      //   type: 1,
      //   message: draft
      // } as MessageData
      await send(JSON.stringify(draft));
    }
  };
  // const handler = (data: MessageData) => {
  //   // 处理白板消息
  //   console.log('准备推送消息:', data);
  //   if (send) {
  //     send(JSON.stringify(data)).then((m) => {
  //       console.log('消息推送成功');
  //     });
  //   }
  // };
  //
  // EventBus.subscribe("message", handler);
  // // 消息推送组件
  // useEffect(() => {
  //
  //   return () => EventBus.unsubscribe("message", handler);
  // }, );

  return (
    <Flex direction="column" className="h-full">
      <Box className="text-center p-2 border-b border-accent-5">
        <Text size="2" className="font-mono text-accent-11">
          在线聊天
        </Text>
      </Box>
      <Flex
        direction="column"
        justify="end"
        className="flex-1 h-full px-2 overflow-y-auto"
        gap="2"
      >
        {messages.map((msg) => (
          <ChatMessage message={msg} key={msg.timestamp} />
        ))}
      </Flex>
      <Box>
        <Flex gap="2" py="2" px="4" mt="4" className="border-t border-accent-5">
          <Box className="flex-1">
            <TextField.Input
              disabled={!chatEnabled}
              placeholder={
                chatEnabled ? "说点什么。。。" : "聊天已禁用"
              }
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyUp={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
          </Box>
          <IconButton onClick={onSend} disabled={!draft.trim().length}>
            <PaperPlaneIcon />
          </IconButton>
        </Flex>
      </Box>
    </Flex>
  );
}
