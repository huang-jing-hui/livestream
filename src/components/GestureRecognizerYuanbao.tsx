import {useEffect, useRef, useState} from "react";
import {
    GestureRecognizer,
    FilesetResolver,
    DrawingUtils
} from "@mediapipe/tasks-vision";
import "../styles/GestureRecognizerYuanbao.css";
import EventBus from "@/js/eventBus";
import {MessageData} from "@/components/chat";
import {Message} from "@/components/stream-player-v2";
import {useChat, useDataChannel} from "@livekit/components-react";
import {DataPacket_Kind, Participant} from "livekit-client";


export function GestureRecognizerComponent() {
    //const [gestureRecognizer, setGestureRecognizer] = useState<GestureRecognizer | null>(null);
    const [webcamRunning, setWebcamRunning] = useState(false);
    const [gestureResult, setGestureResult] = useState<string>("");
    //const [canvasReady, setCanvasReady] = useState(false); // 新增状态
    const webcamRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null); // 新增容器引用
    const lastVideoTimeRef = useRef(-1);
    const requestRef = useRef<number>(0);
    const basePath = window.location.origin + "/";
    const modelPath = `${basePath}mediapipe/models/gesture_recognizer.task`;
    const [categoryName, setCategoryName] = useState(""); // 视觉状态
    //使用ref来存储识别器和画布引用
    const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
    const canvasReadyRef = useRef(false);


    const [encoder] = useState(() => new TextEncoder());
    const {send} = useDataChannel("reactions");
    const {send: sendChat} = useChat();

    const onSend = (emoji: string) => {
        send(encoder.encode(emoji), {kind: DataPacket_Kind.LOSSY});
        if (sendChat) {
            sendChat(emoji);
        }
    };


    // 初始化手势识别器
    const initializeGestureRecognizer = async () => {
        try {
            const vision = await FilesetResolver.forVisionTasks(
                `${basePath}mediapipe/vision`
            );

            // 确保画布元素存在
            if (!canvasRef.current) {
                console.error("Canvas element not found during initialization");
                return;
            }

            // 确保画布有尺寸
            if (canvasRef.current.width === 0 || canvasRef.current.height === 0) {
                console.warn("Canvas has zero dimensions, setting default size");
                canvasRef.current.width = 480;
                canvasRef.current.height = 360;
            }

            // 尝试获取上下文以验证画布是否可用
            const testCtx = canvasRef.current.getContext("2d");
            if (!testCtx) {
                console.error("Failed to get 2D context during initialization");
                return;
            }

            const recognizer = await GestureRecognizer.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: modelPath,
                    delegate: "GPU"
                },
                runningMode: "VIDEO" as const,
            });
            gestureRecognizerRef.current = recognizer;
            //setGestureRecognizer(recognizer);
            console.log("手势识别器初始化成功");
            canvasReadyRef.current = true;
            //setCanvasReady(true); // 标记画布已准备好

        } catch (error) {
            console.error("初始化手势识别器失败:", error);
            alert(`初始化失败: ${error instanceof Error ? error.message : "未知错误"}`);
        }
    };

    useEffect(() => {
        initializeGestureRecognizer().then(() => {
                if (!webcamRunning) {
                    enableCam();
                }
            }
        );
        return () => {
            cancelAnimationFrame(requestRef.current);
            if (gestureRecognizerRef.current) {
                gestureRecognizerRef.current.close();
            }
        };
    }, []);

    // useEffect(() => {
    //     const handler = (data: MessageData) => {
    //         // 机器视觉消息
    //         console.log('接收机器视觉消息:', data);
    //         const gestureRecognizerMessage = (data && JSON.parse(data.message)) as Message;
    //         setWebcamRunning(gestureRecognizerMessage.stats);
    //         if (!canvasReady) {
    //             initializeGestureRecognizer().then(() => {
    //                     enableCam()
    //                 }
    //             )
    //         }else {
    //             enableCam()
    //         }
    //
    //
    //     };
    //
    //     EventBus.subscribe("gesture", handler);
    //     return () => EventBus.unsubscribe("gesture", handler);
    // }, []);

    // 启用/禁用摄像头
    const enableCam = async () => {


        if (!gestureRecognizerRef.current || !canvasReadyRef.current) {
            alert("请等待手势识别器初始化完成");
            return;
        }

        if (webcamRunning) {
            setWebcamRunning(false);
            setCategoryName("");
            const stream = webcamRef.current?.srcObject as MediaStream;
            stream?.getTracks().forEach((track) => track.stop());
            return;
        }

        setWebcamRunning(true);

        // 获取摄像头权限
        const constraints = {
            video: {
                width: {ideal: 480},
                height: {ideal: 360},
                facingMode: "user"
            }
        } as MediaStreamConstraints;
        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (webcamRef.current) {
                webcamRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("访问摄像头失败:", err);
            setWebcamRunning(false);
            alert("无法访问摄像头，请确保已授予权限");
        }
    };


    // 摄像头预测
    const predictWebcam = async () => {
        if (!webcamRunning || !gestureRecognizerRef.current || !webcamRef.current || !canvasRef.current) {
            return;
        }

        const nowInMs = Date.now();
        const video = webcamRef.current;

        // 确保视频时间已更新
        if (video.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = video.currentTime;

            try {
                const results = gestureRecognizerRef.current.recognizeForVideo(video, nowInMs);

                // 获取画布上下文 - 添加详细的错误处理
                const canvasCtx = canvasRef.current.getContext("2d");
                if (!canvasCtx) {
                    console.error("无法获取Canvas 2D上下文");
                    console.log("canvasRef.current:", canvasRef.current);
                    console.log("canvas尺寸:", canvasRef.current.width, "x", canvasRef.current.height);
                    return;
                }

                // 设置画布尺寸与视频匹配
                if (canvasRef.current.width !== video.videoWidth ||
                    canvasRef.current.height !== video.videoHeight) {
                    console.log("更新画布尺寸")
                    console.log("canvasRef.current.width", canvasRef.current.width);
                    console.log("canvasRef.current.height", canvasRef.current.height);
                    console.log("video.videoWidth", video.videoWidth);
                    console.log("video.videoHeight", video.videoHeight);

                    canvasRef.current.width = video.videoWidth;
                    canvasRef.current.height = video.videoHeight;

                    // 更新容器尺寸
                    if (containerRef.current) {
                        console.log("更新容器尺寸")
                        console.log("containerRef.current.style.width", containerRef.current.style.width);
                        console.log("containerRef.current.style.height", containerRef.current.style.height);
                        containerRef.current.style.width = `${video.videoWidth}px`;
                        containerRef.current.style.height = `${video.videoHeight}px`;
                    }
                }

                // 清除画布

                canvasCtx.save();
                canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

                if (results.landmarks) {
                    const drawingUtils = new DrawingUtils(canvasCtx);
                    for (const landmarks of results.landmarks) {
                        drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, {
                            color: "#00FF00",
                            lineWidth: 5,
                        });
                        drawingUtils.drawLandmarks(landmarks, {
                            color: "#FF0000",
                            lineWidth: 2,
                        });
                    }
                }
                canvasCtx.restore();


                // 显示结果
                if (results.gestures && results.gestures.length > 0 && results.gestures[0].length > 0) {
                    const categoryName = results.gestures[0][0].categoryName;
                    let categoryNameStr = "未知";

                    // 手势名称映射
                    const gestureMap: Record<string, string> = {
                        "Closed_Fist": "紧握拳头",
                        "Open_Palm": "张开手掌",
                        "Pointing_Up": "向上指",
                        "Thumb_Up": "点赞",
                        "Victory": "剪刀手",
                        "Thumb_Down": "鄙视",
                        "ILoveYou": "爱你哟"
                    };

                    categoryNameStr = gestureMap[categoryName] || categoryName;
                    const categoryScore = (results.gestures[0][0].score * 100).toFixed(2);

                    // 获取左右手信息
                    let handedness = "未知";
                    if (results.handednesses && results.handednesses.length > 0 && results.handednesses[0].length > 0) {
                        handedness = results.handednesses[0][0].displayName;
                    }
                    setCategoryName(categoryName);
                    setGestureResult(
                        `手势: ${categoryNameStr}\n置信度: ${categoryScore}%\n左右手: ${handedness}`
                    );
                } else {
                    setGestureResult("");
                }
            } catch (error) {
                console.error("手势识别失败:", error);
            }
        }

        requestRef.current = requestAnimationFrame(predictWebcam);
    };
    const emojiMap: Record<string, string> = {
        "Closed_Fist": "✊",
        "Open_Palm": "🙌",
        "Thumb_Up": "👍",
        "Victory": "✌️",
        "ILoveYou": "❤️"
    };
    useEffect(() => {
        if (categoryName) {
            console.log('当前手势:', categoryName)
            const emoji = emojiMap[categoryName];
            if (emoji) {
                onSend(emoji)
            }
        }
    }, [categoryName]);

    // 当摄像头开始运行时的处理
    useEffect(() => {
        if (webcamRunning && webcamRef.current) {
            // 确保视频已加载
            if (webcamRef.current.readyState >= HTMLMediaElement.HAVE_METADATA) {
                predictWebcam();
            } else {
                webcamRef.current.onloadeddata = predictWebcam;
            }
        }
    }, [webcamRunning]);

    return (
        <div className="container">
            {/*<h1>机器学习 手势识别</h1>*/}

            {/* 使用容器包裹视频和画布 */}
            <div
                ref={containerRef}
                className="webcam-container"
                style={{
                    position: 'relative',
                    width: '480px',
                    height: '360px',
                    margin: '0 auto',
                    backgroundColor: '#f0f0f0' // 添加背景色以便调试
                }}
            >
                <video
                    ref={webcamRef}
                    autoPlay
                    playsInline
                    className="webcam-video"
                    width="480"
                    height="360"
                    style={{
                        display: webcamRunning ? "block" : "none",
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transform: 'scaleX(-1)' // 水平翻转
                    }}
                />
                <canvas
                    ref={canvasRef}
                    className="output-canvas"
                    width="480"
                    height="360"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        zIndex: 10,
                        border: '1px solid red' // 添加边框以便调试
                    }}
                />

                {gestureResult && (
                    <div className="gesture-output">
                        {gestureResult.split('\n').map((line, i) => (
                            <div key={i}>{line}</div>
                        ))}
                    </div>
                )}

                {/*/!* 添加调试信息 *!/*/}
                {/*<div className="debug-info">*/}
                {/*    <button*/}
                {/*        onClick={enableCam}*/}
                {/*        className="webcam-button"*/}
                {/*        disabled={!canvasReady} // 在画布准备好之前禁用按钮*/}
                {/*    >*/}
                {/*        {webcamRunning ? "禁用摄像头" : "启用摄像头"}*/}
                {/*        {!canvasReady && " (加载中...)"}*/}
                {/*    </button>*/}
                {/*    <p>画布状态: {canvasReady ? "已准备好" : "未准备好"}</p>*/}
                {/*    <p>画布尺寸: {canvasRef.current ? `${canvasRef.current.width}x${canvasRef.current.height}` : "未加载"}</p>*/}
                {/*</div>*/}
            </div>


        </div>
    );
};

export default GestureRecognizerComponent;
