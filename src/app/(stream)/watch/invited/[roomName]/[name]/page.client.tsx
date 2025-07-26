"use client";

import { Chat } from "@/components/chat";
import { ReactionBar } from "@/components/reaction-bar";
import { Spinner } from "@/components/spinner";
import { StreamPlayer } from "@/components/stream-player-v2";
import { TokenContext } from "@/components/token-context";
import { JoinStreamResponse } from "@/lib/controller";
import { cn } from "@/lib/utils";
import { LiveKitRoom } from "@livekit/components-react";
import { useEffect, useState } from "react";
import {Box, Flex} from "@radix-ui/themes";

export default function WatchPage({
                                    roomName,
                                    serverUrl,
                                    name,
                                  }: {
  roomName: string;
  serverUrl: string;
  name: string;
}) {
  const [authToken, setAuthToken] = useState("");
  const [roomToken, setRoomToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 组件加载时自动加入直播间
    const autoJoin = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/join_stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_name: roomName,
            identity: name,
            canPublish: false, // 默认以观众身份加入
          }),
        });

        if (!res.ok) {
          throw new Error(`加入失败: ${res.statusText}`);
        }

        const responseData = (await res.json()) as JoinStreamResponse;
        setAuthToken(responseData.auth_token);
        setRoomToken(responseData.connection_details.token);
      } catch (err) {
        console.error("加入直播间错误:", err);
        setError(err instanceof Error ? err.message : "未知错误");
      } finally {
        setLoading(false);
      }
    };

    // 确保名称和房间名不为空
    if (name && roomName) {
      autoJoin();
    } else {
      setLoading(false);
      setError("名称或房间名称无效");
    }
  }, [name, roomName]);

  // 处理重试加入
  const retryJoin = async () => {
    setError(null);
    setLoading(true);

    const res = await fetch("/api/join_stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room_name: roomName,
        identity: name,
        canPublish: false,
      }),
    });

    if (!res.ok) {
      setError("加入失败，请稍后再试");
      setLoading(false);
      return;
    }

    const responseData = (await res.json()) as JoinStreamResponse;
    setAuthToken(responseData.auth_token);
    setRoomToken(responseData.connection_details.token);
    setLoading(false);
  };

  // 错误状态
  if (error) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-bold text-center mb-4">无法加入直播间</h2>
            <p className="text-red-500 text-center mb-6">{error}</p>

            <div className="flex justify-center">
              <button
                  onClick={retryJoin}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                重试
              </button>
            </div>
          </div>
        </div>
    );
  }

  // 加载状态
  if (loading || !authToken || !roomToken) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center">
          <Spinner />
          <p className="mt-4 text-lg">正在加入 {decodeURI(roomName)}...</p>
        </div>
    );
  }

  // 成功加入后渲染直播间
  return (
      <TokenContext.Provider value={authToken}>
        <LiveKitRoom serverUrl={serverUrl} token={roomToken}>
          <Flex className="w-full h-screen">
            <Flex direction="column" className="flex-1">
              <Box className="flex-1 bg-gray-1">
                <StreamPlayer />
              </Box>
              <ReactionBar />
            </Flex>
            <Box className="bg-accent-2 min-w-[280px] border-l border-accent-5">
              <Chat />
            </Box>
          </Flex>
        </LiveKitRoom>
      </TokenContext.Provider>
  );
}

// // 为完整保留样式定义，添加Flex和Box组件的默认导入
// const Flex = ({ children, className, ...props }: any) => (
//     <div className={`flex ${className}`} {...props}>
//       {children}
//     </div>
// );
//
// const Box = ({ children, className, ...props }: any) => (
//     <div className={className} {...props}>
//       {children}
//     </div>
// );
