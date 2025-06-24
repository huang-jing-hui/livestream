import {useCopyToClipboard} from "@/lib/clipboard";
import {ParticipantMetadata, RoomMetadata} from "@/lib/controller";
import {
  AudioTrack,
  StartAudio, TrackReference,
  useDataChannel,
  useLocalParticipant,
  useMediaDeviceSelect,
  useParticipants,
  useRoomContext,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import {CopyIcon, EyeClosedIcon, EyeOpenIcon} from "@radix-ui/react-icons";
import {Badge, Button, Flex, Text} from "@radix-ui/themes";
import Confetti from "js-confetti";
import {
  ConnectionState,
  createLocalTracks,
  createLocalVideoTrack,
  LocalVideoTrack,
  Track,
  VideoPresets,
} from "livekit-client";
import {useEffect, useRef, useState} from "react";
import {MediaDeviceSettings} from "./media-device-settings";
import {PresenceDialog} from "./presence-dialog";
import {useAuthToken} from "./token-context";

function ConfettiCanvas() {
  const [confetti, setConfetti] = useState<Confetti>();
  const [decoder] = useState(() => new TextDecoder());
  const canvasEl = useRef<HTMLCanvasElement>(null);
  useDataChannel("reactions", (data) => {
    const options: { emojis?: string[]; confettiNumber?: number } = {};

    if (decoder.decode(data.payload) !== "🎉") {
      options.emojis = [decoder.decode(data.payload)];
      options.confettiNumber = 12;
    }

    confetti?.addConfetti(options);
  });

  useEffect(() => {
    setConfetti(new Confetti({ canvas: canvasEl?.current ?? undefined }));
  }, []);

  return <canvas ref={canvasEl} className="absolute h-full w-full" style={{ height: "20%" }}/>;
}


function SortIdentity(a: TrackReference, b: TrackReference) {
  // 获取a轨道参与者的custom_identity
  const aMeta = a.participant?.metadata;
  const aCustomIdentity = aMeta ? JSON.parse(aMeta).custom_identity : 999;

  // 获取b轨道参与者的custom_identity
  const bMeta = b.participant?.metadata;
  const bCustomIdentity = bMeta ? JSON.parse(bMeta).custom_identity : 999;

  if (aCustomIdentity !== bCustomIdentity) {
    return aCustomIdentity-bCustomIdentity;
  }
  return a.participant.identity.localeCompare(b.participant.identity);
}

/**
 * StreamPlayer 组件用于渲染流媒体播放器界面，允许用户根据权限观看和控制直播。
 * @param {Object} props 组件属性
 * @param {boolean} props.isHost 是否为主播，默认为 false
 */
export function StreamPlayer({ isHost = false }) {
  // 使用 useCopyToClipboard 钩子来处理复制链接到剪贴板的功能
  const [_, copy] = useCopyToClipboard();

  // 从上下文中获取房间信息
  const { metadata, name: roomName, state: roomState } = useRoomContext();
  // 解析房间元数据
  const roomMetadata = (metadata && JSON.parse(metadata)) as RoomMetadata;
  // 获取本地参与者信息
  const { localParticipant } = useLocalParticipant();
  // 解析本地参与者元数据
  const localMetadata = (localParticipant.metadata &&
      JSON.parse(localParticipant.metadata)) as ParticipantMetadata;
  // 确定参与者是否有主播权限
  const canHost =
      isHost || (localMetadata?.invited_to_stage && localMetadata?.hand_raised);
  // 当主播权限变化时，创建或更新本地视频轨道
  useEffect(() => {
    if (canHost) {
      const createTracks = async () => {
        const camTrack = await createLocalVideoTrack({
          facingMode: 'user',
          resolution: VideoPresets.h360,
        });
        await localParticipant.publishTrack(camTrack);
      };
      void createTracks();
    }
  }, [canHost]);

  // 获取参与者列表
  const participants = useParticipants();
  // 确定是否显示通知图标，根据参与者是否举手和是否被邀请上台
  const showNotification = isHost
      ? participants.some((p) => {
        const metadata = (p.metadata &&
            JSON.parse(p.metadata)) as ParticipantMetadata;
        return metadata?.hand_raised && !metadata?.invited_to_stage;
      })
      : localMetadata?.invited_to_stage && !localMetadata?.hand_raised;

  // 获取远程视频轨道
  const remoteVideoTracks = useTracks([Track.Source.Camera]);

  remoteVideoTracks.sort((a, b) => {
    return SortIdentity(a, b);
  });

  // 获取远程音频轨道
  const remoteAudioTracks = useTracks([Track.Source.Microphone]);
  remoteAudioTracks.sort((a, b) => {
    return SortIdentity(a, b);
  });

  // 获取身份验证令牌
  const authToken = useAuthToken();
  /**
   * 处理离开舞台的逻辑
   * 发送请求将本地参与者从舞台上移除
   */
  const onLeaveStage = async () => {
    await fetch("/api/remove_from_stage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${authToken}`,
      },
      body: JSON.stringify({
        identity: localParticipant.identity,
      }),
    });
  };

  const [screenShare, setScreenShare] = useState(false);
  const screenShareTracks = useTracks([Track.Source.ScreenShare]);
  useEffect(() => {
    if (roomState === ConnectionState.Connected) {
      localParticipant.setScreenShareEnabled(screenShare).then(
          (op) => {
            if (op?.track) {
              localParticipant.publishTrack(op.track).catch((err) => {
                console.error("屏幕共享轨道发布失败:", err);
              });
            }
          },
      )
    }
  }, [screenShare]);


  // 渲染组件界面
return (
    <div className="relative h-full max-h-screen w-full bg-black flex flex-col overflow-y-auto">
        {/* 顶部视频区域 - 横向排列 */}
        <div className="w-full overflow-x-auto flex-shrink-0" style={{ height: "30%" }}>
          <div className="flex h-full space-x-2 p-2">

            {remoteVideoTracks.map((t) => (
                <div key={t.participant.identity} className="relative" style={{ minWidth: "200px", height: "100%" }}>

                  {/* 移除Flex容器，直接显示视频 */}
                  <VideoTrack
                      trackRef={t}
                      className="absolute w-full h-full object-cover bg-transparent"
                  />

                  {/* 名字徽章 */}
                  <div className="absolute bottom-2 right-2 z-20">
                    <Badge
                        variant="outline"
                        color="gray"
                    >
                      {roomMetadata?.creator_identity === t.participant.identity ? (
                          <span className="inline-block px-1.5 py-0.5 text-xs font-semibold text-white bg-red-9 rounded mr-1">主播</span>
                      ) : (
                          <span className="inline-block px-1.5 py-0.5 text-xs font-semibold text-gray-700 bg-gray-300 rounded mr-1">观众</span>
                      )}
                      {t.participant.identity} {t.participant.identity === localParticipant.identity && " (you)"}

                    </Badge>
                  </div>
                </div>
            ))}
          </div>
        </div>

        {/* 修改后的白板区域 */}
        <div className="bg-gray-900 border-t border-gray-700 relative flex justify-center items-center" style={{ height: "70%", width: "100%" }}>
          <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
            {screenShareTracks && screenShareTracks.length > 0 && (<VideoTrack
                trackRef={screenShareTracks[0]}
                className="max-w-full max-h-full object-contain"
            />)}
          </div>
        </div>

        {/* 以下元素保持不变 */}
        {remoteAudioTracks.map((t) => (
            <AudioTrack trackRef={t} key={t.participant.identity} />
        ))}
        <ConfettiCanvas />
        <StartAudio
            label="Click to allow audio playback"
            className="absolute top-0 h-full w-full bg-gray-2-translucent text-white"
        />
        <div className="absolute top-0 w-full p-2">
          <Flex justify="between" align="end">
            <Flex gap="2" justify="center" align="center">
              <Button
                  size="1"
                  variant="soft"
                  disabled={!Boolean(roomName)}
                  onClick={() =>
                      copy(`${process.env.NEXT_PUBLIC_SERVER_URL}/watch/${roomName}`)
                  }
              >
                {roomState === ConnectionState.Connected ? (
                    <>
                      {roomName} <CopyIcon />
                    </>
                ) : (
                    "Loading..."
                )}
              </Button>
              {roomName && canHost &&(
                  <Flex gap="2">
                    <MediaDeviceSettings/>
                    {roomMetadata?.creator_identity !==
                        localParticipant.identity && (
                            <Button size="1" onClick={onLeaveStage}>
                              下台
                            </Button>
                        )}
                    {roomMetadata?.creator_identity ==
                        localParticipant.identity && (
                            <Button
                                size="1"
                                variant={screenShare ? "soft" : "surface"}
                                onClick={() => setScreenShare(!screenShare)}
                            >
                              屏幕共享 {screenShare ? "打开" : "关闭"}
                            </Button>
                        )}
                  </Flex>
              )}
            </Flex>
            <Flex gap="2">
              {roomState === ConnectionState.Connected && (
                  <Flex gap="1" align="center">
                    <div className="rounded-6 bg-red-9 w-2 h-2 animate-pulse" />
                    <Text size="1" className="uppercase text-accent-11">
                      Live
                    </Text>
                  </Flex>
              )}
              <PresenceDialog isHost={isHost}>
                <div className="relative">
                  {showNotification && (
                      <div className="absolute flex h-3 w-3 -top-1 -right-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-6 bg-accent-11 opacity-75"></span>
                        <span className="relative inline-flex rounded-6 h-3 w-3 bg-accent-11"></span>
                      </div>
                  )}
                  <Button
                      size="1"
                      variant="soft"
                      disabled={roomState !== ConnectionState.Connected}
                  >
                    {roomState === ConnectionState.Connected ? (
                        <EyeOpenIcon />
                    ) : (
                        <EyeClosedIcon />
                    )}
                    {roomState === ConnectionState.Connected
                        ? participants.length
                        : ""}
                  </Button>
                </div>
              </PresenceDialog>
            </Flex>
          </Flex>
        </div>
      </div>
  );
}

