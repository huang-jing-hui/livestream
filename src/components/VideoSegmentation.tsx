// src/components/VideoSegmentation.tsx
import * as React from 'react';
import {useContext, useEffect, useRef, useState} from 'react';
import {ImageSegmenter} from '@mediapipe/tasks-vision';
import {initializeImageSegmenter, predictWebcam, type PredictWebcamObject} from "@/lib/VideoSegmentationUtils";
import {BackgroundContext} from "@/components/stream-player-v2";
import {useLocalParticipant, useMediaDeviceSelect} from "@livekit/components-react";
import {createLocalAudioTrack, createLocalVideoTrack, Track} from "livekit-client";
import {ParticipantMetadata} from "@/lib/controller";


interface VideoSegmentationProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    isHost: boolean;
}

export const VideoSegmentation: React.FC<VideoSegmentationProps> = ({videoRef, canvasRef,isHost}) => {
    const backgroundVideoRef = useRef<HTMLVideoElement>(null);
    const imageSegmenterRef = useRef<ImageSegmenter | null>(null);
    const backgroundType = useRef<'not' | 'none' | 'blur' | 'image' | 'video'>('not');
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
    const [backgroundVideo, setBackgroundVideo] = useState<string | null>(null);
    const backgroundImgRef = useRef<HTMLImageElement | null>(null);
    const tempCanvasRef = useRef(document.createElement('canvas'));
    const tempCtxRef = useRef<CanvasRenderingContext2D | null>(null);
    const maskCanvasRef = useRef(document.createElement('canvas'));
    const maskCtxRef = useRef<CanvasRenderingContext2D | null>(null);
    const compositeCanvasRef = useRef(document.createElement('canvas'));// 复合canvas
    const compositeCtxRef = useRef<CanvasRenderingContext2D | null>(null);// 复合canvas 2d上下文
    const backgroundVideoPlayingRef = useRef(false);
    const lastWebcamTime = useRef(-1);
    const {background,setBackground} = useContext(BackgroundContext);
    // 获取本地参与者信息
    const {cameraTrack, microphoneTrack, localParticipant} = useLocalParticipant();
    const isPushTheFlowRef = useRef(false);

    // 初始化Canvas上下文和模型
    useEffect(() => {
        tempCtxRef.current = tempCanvasRef.current.getContext('2d');
        maskCtxRef.current = maskCanvasRef.current.getContext('2d');
        compositeCtxRef.current = compositeCanvasRef.current.getContext('2d');
        init().then(()=>{
            if (isHost) {
                toggleWebcam();
            }
        });

        return () => {
            if (videoRef.current?.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            }
            if (backgroundVideoRef.current) {
                backgroundVideoRef.current.pause();
            }
            if (imageSegmenterRef.current) {
                imageSegmenterRef.current.close()
            }
        };
    }, []);

    const init = async () => {
        if (imageSegmenterRef.current) {
            imageSegmenterRef.current.close();
        }
        initializeImageSegmenter().then(imageSegmenter => {
            console.log("初始化图像分割器成功");
            imageSegmenterRef.current = imageSegmenter;
        }).catch(error => {
            console.error('初始化图像分割器失败:', error);
        });
    };


    // 处理背景图片加载
    useEffect(() => {
        if (backgroundImage) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                backgroundImgRef.current = img;
            };
            img.onerror = (e) => {
                console.error("背景图片加载失败", e);
            };
            img.src = backgroundImage;
        }
    }, [backgroundImage]);

    // 处理背景视频加载
    useEffect(() => {
        if (backgroundVideo && backgroundVideoRef.current) {
            backgroundVideoRef.current.src = backgroundVideo;
            backgroundVideoRef.current.loop = true;
            backgroundVideoRef.current.muted = true;

            const playVideo = async () => {
                try {
                    await backgroundVideoRef.current?.play();
                    backgroundVideoPlayingRef.current = true;
                } catch (error) {
                    console.error("背景视频播放失败:", error);
                    backgroundVideoPlayingRef.current = false;
                }
            };

            playVideo();
        }
    }, [backgroundVideo]);

    // 当摄像头设备变化时，更新本地视频轨道
    const {activeDeviceId: activeCameraDeviceId} = useMediaDeviceSelect({
        kind: "videoinput",
    });

    useEffect(() => {
        toggleWebcam()
    }, [activeCameraDeviceId]);

    const localMetadata = (localParticipant.metadata &&
        JSON.parse(localParticipant.metadata)) as ParticipantMetadata;

    useEffect(() => {
        if (localMetadata?.invited_to_stage || localMetadata?.hand_raised) {
            toggleWebcam()
        }
    }, [localMetadata?.invited_to_stage, localMetadata?.hand_raised]);

    const po = {
        imageSegmenterRef: imageSegmenterRef,
        canvasRef: canvasRef,
        videoRef: videoRef,
        backgroundType: backgroundType,
        backgroundImgRef: backgroundImgRef,
        backgroundVideoRef: backgroundVideoRef,
        backgroundVideoPlayingRef: backgroundVideoPlayingRef,
        tempCanvasRef: tempCanvasRef,
        tempCtxRef: tempCtxRef,
        maskCanvasRef: maskCanvasRef,
        maskCtxRef: maskCtxRef,
        compositeCanvasRef: compositeCanvasRef,
        compositeCtxRef: compositeCtxRef,
        lastWebcamTime: lastWebcamTime
    } as PredictWebcamObject;


    // 开启/关闭摄像头
    const toggleWebcam = async () => {
        try {
            console.log("开启摄像头");

            const track= await createLocalVideoTrack({
                deviceId: activeCameraDeviceId
            });
            const audioTrack = await createLocalAudioTrack();
            const video = videoRef.current;
            if (video) {
                track.attach(video);
                //video.srcObject = stream;
                video.onloadedmetadata = () => {
                    video.play().then(() => {
                        requestAnimationFrame(() => predictWebcam(po));
                        if (canvasRef.current) {
                            console.log("开始推流")
                            const canvasStream = canvasRef.current.captureStream();
                            const videoTracks = canvasStream.getVideoTracks();
                            console.log("视频轨道:", videoTracks);

                            // 推送视频流
                            localParticipant.publishTrack(videoTracks[0],{
                                name: localParticipant.identity+'canvas',
                                stream: localParticipant.identity+'canvas',
                                source: Track.Source.Camera
                            })
                            // 推送音频流
                            localParticipant.publishTrack(audioTrack,{
                                name: localParticipant.identity+'canvas',
                                stream: localParticipant.identity+'canvas',
                                source: Track.Source.Microphone
                            })
                        }
                        pushTheFlow()
                    }).catch(e => console.error("视频播放失败:", e));
                };
            }
        } catch (error) {
            console.error('访问摄像头失败:', error);
            alert('无法访问摄像头，请确保您已授予权限');
        }
    };

    const pushTheFlow = async () => {
        const tracks = localParticipant.getTracks();
        //console.log("tracks:", tracks)
        tracks.forEach(track => {
            if ((track.source===Track.Source.Camera|| track.source===Track.Source.Microphone)&&track.trackName !== localParticipant.identity + 'canvas') {
                if (track.track && track.track.mediaStreamTrack) {
                    localParticipant.unpublishTrack(track.track.mediaStreamTrack)
                }
            }

        });
        requestAnimationFrame(pushTheFlow);
    }

    // 设置背景类型
    const handleBackgroundTypeChange = (type: 'not' | 'none' | 'blur' | 'image' | 'video') => {
        if (!isPushTheFlowRef.current) {
            isPushTheFlowRef.current = true;
        }
        console.log("设置背景类型", type);
        backgroundType.current = type;
        setBackground(type);
    };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoFileInputRef = useRef<HTMLInputElement>(null);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setBackgroundImage(event.target.result as string);
                    handleBackgroundTypeChange('image');
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const videoUrl = URL.createObjectURL(file);
            setBackgroundVideo(videoUrl);
            handleBackgroundTypeChange('video');
        }
    };

    return (
        <div className="segment-container">

            <div className="controls">

                <div className="background-controls">
                    <select
                        className="control-btn"
                        value={background}
                        onChange={(e) => {
                            const selectedValue = e.target.value as 'not' | 'none' | 'blur' | 'image' | 'video';


                            // 根据选择的类型触发相应的文件选择
                            if (selectedValue === 'image') {
                                // 触发图片文件选择
                                fileInputRef.current?.click();
                            } else if (selectedValue === 'video') {
                                // 触发视频文件选择
                                videoFileInputRef.current?.click();
                            } else {
                                handleBackgroundTypeChange(selectedValue);
                            }
                        }}
                    >
                        <option value="not">🥽 无背景</option>
                        <option value="none">🎨 纯色背景</option>
                        <option value="blur">🌀 背景模糊</option>
                        <option value="image">🖼️ 图片背景</option>
                        <option value="video">🎥 视频背景</option>

                    </select>
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleImageSelect}
                        style={{display: 'none'}}
                    />
                    <input
                        type="file"
                        ref={videoFileInputRef}
                        accept="video/*"
                        onChange={handleVideoSelect}
                        style={{display: 'none'}}
                    />
                </div>


            </div>


            <video ref={backgroundVideoRef} playsInline className="hidden"/>

            {/*<video ref={canvasVideoRef} playsInline*/}
            {/*       style={{*/}
            {/*           display: "block",*/}
            {/*       }}/>*/}
        </div>
    );
};

export default VideoSegmentation;
