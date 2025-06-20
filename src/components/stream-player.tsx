import { useCopyToClipboard } from "@/lib/clipboard";
import { ParticipantMetadata, RoomMetadata } from "@/lib/controller";
import {
  AudioTrack,
  StartAudio,
  VideoTrack,
  useDataChannel,
  useLocalParticipant,
  useMediaDeviceSelect,
  useParticipants,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import { CopyIcon, EyeClosedIcon, EyeOpenIcon } from "@radix-ui/react-icons";
import { Avatar, Badge, Button, Flex, Grid, Text } from "@radix-ui/themes";
import Confetti from "js-confetti";
import {
  ConnectionState,
  LocalVideoTrack,
  Track,
  createLocalTracks,
} from "livekit-client";
import { useEffect, useRef, useState } from "react";
import { MediaDeviceSettings } from "./media-device-settings";
import { PresenceDialog } from "./presence-dialog";
import { useAuthToken } from "./token-context";

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

  return <canvas ref={canvasEl} className="absolute h-full w-full" />;
}


/**
 * StreamPlayer 组件用于渲染流媒体播放器界面，允许用户根据权限观看和控制直播。
 * @param {Object} props 组件属性
 * @param {boolean} props.isHost 是否为主播，默认为 false
 */
export function StreamPlayer({ isHost = false }) {
  // 使用 useCopyToClipboard 钩子来处理复制链接到剪贴板的功能
  const [_, copy] = useCopyToClipboard();

  // 本地视频轨道状态，用于管理本地视频流
  const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack>();

  // 本地视频元素引用，用于将视频流渲染到页面
  const localVideoEl = useRef<HTMLVideoElement>(null);

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

  // 当主播权限变化时，创建或更新本地视频轨道
  useEffect(() => {
    if (canHost) {
      const createTracks = async () => {
        const tracks = await createLocalTracks({ audio: true, video: true });
        const camTrack = tracks.find((t) => t.kind === Track.Kind.Video);
        if (camTrack && localVideoEl?.current) {
          camTrack.attach(localVideoEl.current);
        }
        setLocalVideoTrack(camTrack as LocalVideoTrack);
      };
      void createTracks();
    }
  }, [canHost]);

  // 当摄像头设备变化时，更新本地视频轨道
  const { activeDeviceId: activeCameraDeviceId } = useMediaDeviceSelect({
    kind: "videoinput",
  });

  useEffect(() => {
    if (localVideoTrack) {
      void localVideoTrack.setDeviceId(activeCameraDeviceId);
    }
  }, [localVideoTrack, activeCameraDeviceId]);

  // 获取远程视频轨道，过滤掉本地参与者
  const remoteVideoTracks = useTracks([Track.Source.Camera]).filter(
      (t) => t.participant.identity !== localParticipant.identity
  );

  // 获取远程音频轨道，过滤掉本地参与者
  const remoteAudioTracks = useTracks([Track.Source.Microphone]).filter(
      (t) => t.participant.identity !== localParticipant.identity
  );

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

  // 渲染组件界面
  return (
      <div className="relative h-full w-full bg-black">
        <Grid className="w-full h-full absolute" gap="2">
          {canHost && (
              <div className="relative">
                <Flex
                    className="absolute w-full h-full"
                    align="center"
                    justify="center"
                >
                  <Avatar
                      size="9"
                      fallback={localParticipant.identity[0] ?? "?"}
                      radius="full"
                  />
                </Flex>
                <video
                    ref={localVideoEl}
                    className="absolute w-full h-full object-contain -scale-x-100 bg-transparent"
                />
                <div className="absolute w-full h-full">
                  <Badge
                      variant="outline"
                      color="gray"
                      className="absolute bottom-2 right-2"
                  >
                    {localParticipant.identity} (you)
                  </Badge>
                </div>
              </div>
          )}
          {remoteVideoTracks.map((t) => (
              <div key={t.participant.identity} className="relative">
                <Flex
                    className="absolute w-full h-full"
                    align="center"
                    justify="center"
                >
                  <Avatar
                      size="9"
                      fallback={t.participant.identity[0] ?? "?"}
                      radius="full"
                  />
                </Flex>
                <VideoTrack
                    trackRef={t}
                    className="absolute w-full h-full bg-transparent"
                />
                <div className="absolute w-full h-full">
                  <Badge
                      variant="outline"
                      color="gray"
                      className="absolute bottom-2 right-2"
                  >
                    {t.participant.identity}
                  </Badge>
                </div>
              </div>
          ))}
        </Grid>
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
              {roomName && canHost && (
                  <Flex gap="2">
                    <MediaDeviceSettings localVideoTrack={localVideoTrack} />
                    {roomMetadata?.creator_identity !==
                        localParticipant.identity && (
                            <Button size="1" onClick={onLeaveStage}>
                              下台
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

