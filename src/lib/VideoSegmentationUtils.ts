import {FilesetResolver, ImageSegmenter, ImageSegmenterResult} from "@mediapipe/tasks-vision";

import * as React from "react";

// 项目地址和模型路径
const basePath = 'http://192.168.110.137:3000/';
const modelPath = `${basePath}mediapipe/models/selfie_segmenter.tflite`;

export async function initializeImageSegmenter(): Promise<ImageSegmenter> {
    try {
        const vision = await FilesetResolver.forVisionTasks(
            `${basePath}mediapipe/vision`
        );

        // 使用更高质量的模型，启用输出置信度掩码
        const segmenter = await ImageSegmenter.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: modelPath,
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            outputCategoryMask: false,
            outputConfidenceMasks: true
        })
        return segmenter;

    } catch (error) {
        console.error('初始化图像分割器失败:', error);
        throw error;
    }
}


// 绘制背景
// export function drawBackground (
//     ctx: CanvasRenderingContext2D, // 画布上下文
//     video: HTMLVideoElement, // 视频
//     width: number, // 画布宽度
//     height: number, // 画布高度
//     tempCanvas: HTMLCanvasElement, // 临时画布
//   //  tempCtx: CanvasRenderingContext2D,
//     backgroundType: String, // 背景类型
//     backgroundImg?: HTMLImageElement, // 背景图片
//     backgroundVideo?: HTMLVideoElement, // 背景视频
//     backgroundVideoPlaying?: boolean, // 背景视频加载状态
// ){
//     ctx.clearRect(0, 0, width, height);
//
//     if (backgroundType === 'blur' && video) {
//         const tempCtx = tempCanvas.getContext('2d');
//         if (!tempCtx) return;
//
//         tempCanvas.width = width;
//         tempCanvas.height = height;
//         tempCtx.clearRect(0, 0, width, height);
//
//         // 更平滑的模糊效果
//         tempCtx.filter = 'blur(12px) brightness(110%)';
//         tempCtx.drawImage(
//             video,
//             -30,
//             -30,
//             width + 60,
//             height + 60
//         );
//         tempCtx.filter = 'none';
//
//         ctx.drawImage(tempCanvas, 0, 0);
//     } else if (backgroundType === 'image' && backgroundImg) {
//         const img = backgroundImg;
//         const imgAspect = img.width / img.height;
//         const canvasAspect = width / height;
//
//         let renderWidth, renderHeight, offsetX, offsetY;
//
//         if (imgAspect > canvasAspect) {
//             renderHeight = height;
//             renderWidth = renderHeight * imgAspect;
//             offsetX = (width - renderWidth) / 2;
//             offsetY = 0;
//         } else {
//             renderWidth = width;
//             renderHeight = renderWidth / imgAspect;
//             offsetX = 0;
//             offsetY = (height - renderHeight) / 2;
//         }
//
//         ctx.drawImage(
//             img,
//             offsetX,
//             offsetY,
//             renderWidth,
//             renderHeight
//         );
//     } else if (backgroundType === 'video' && backgroundVideo && backgroundVideoPlaying) {
//         const video = backgroundVideo;
//         const videoAspect = video.videoWidth / video.videoHeight;
//         const canvasAspect = width / height;
//
//         let renderWidth, renderHeight, offsetX, offsetY;
//
//         if (videoAspect > canvasAspect) {
//             renderHeight = height;
//             renderWidth = renderHeight * videoAspect;
//             offsetX = (width - renderWidth) / 2;
//             offsetY = 0;
//         } else {
//             renderWidth = width;
//             renderHeight = renderWidth / videoAspect;
//             offsetX = 0;
//             offsetY = (height - renderHeight) / 2;
//         }
//
//         ctx.drawImage(
//             video,
//             offsetX,
//             offsetY,
//             renderWidth,
//             renderHeight
//         );
//     } else {
//         // 更自然的纯色背景
//         const gradient = ctx.createLinearGradient(0, 0, width, height);
//         gradient.addColorStop(0, '#3498db');
//         gradient.addColorStop(1, '#2c3e50');
//         ctx.fillStyle = gradient;
//         ctx.fillRect(0, 0, width, height);
//     }
// }


export function drawBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    predictWebcamObject: PredictWebcamObject
) {
    ctx.clearRect(0, 0, width, height);
    const backgroundType = predictWebcamObject.backgroundType;
    const videoRef = predictWebcamObject.videoRef;
    const tempCanvasRef = predictWebcamObject.tempCanvasRef;
    const tempCtxRef = predictWebcamObject.tempCtxRef;
    const backgroundImgRef = predictWebcamObject.backgroundImgRef;
    const backgroundVideoRef = predictWebcamObject.backgroundVideoRef;
    const backgroundVideoPlayingRef = predictWebcamObject.backgroundVideoPlayingRef;
    if (backgroundType.current === 'blur' && videoRef.current) {
        const tempCanvas = tempCanvasRef.current;
        const tempCtx = tempCtxRef.current;
        if (!tempCtx || !tempCanvas) return;

        tempCanvas.width = width;
        tempCanvas.height = height;
        tempCtx.clearRect(0, 0, width, height);

        // 更平滑的模糊效果
        tempCtx.filter = 'blur(12px) brightness(110%)';
        tempCtx.drawImage(
            videoRef.current,
            -30,
            -30,
            width + 60,
            height + 60
        );
        tempCtx.filter = 'none';

        ctx.drawImage(tempCanvas, 0, 0);
    } else if (backgroundType.current === 'image' && backgroundImgRef.current) {
        const img = backgroundImgRef.current;
        const imgAspect = img.width / img.height;
        const canvasAspect = width / height;

        let renderWidth, renderHeight, offsetX, offsetY;

        if (imgAspect > canvasAspect) {
            renderHeight = height;
            renderWidth = renderHeight * imgAspect;
            offsetX = (width - renderWidth) / 2;
            offsetY = 0;
        } else {
            renderWidth = width;
            renderHeight = renderWidth / imgAspect;
            offsetX = 0;
            offsetY = (height - renderHeight) / 2;
        }

        ctx.drawImage(
            img,
            offsetX,
            offsetY,
            renderWidth,
            renderHeight
        );
    } else if (backgroundType.current === 'video' && backgroundVideoRef.current && backgroundVideoPlayingRef.current) {
        const video = backgroundVideoRef.current;
        const videoAspect = video.videoWidth / video.videoHeight;
        const canvasAspect = width / height;

        let renderWidth, renderHeight, offsetX, offsetY;

        if (videoAspect > canvasAspect) {
            renderHeight = height;
            renderWidth = renderHeight * videoAspect;
            offsetX = (width - renderWidth) / 2;
            offsetY = 0;
        } else {
            renderWidth = width;
            renderHeight = renderWidth / videoAspect;
            offsetX = 0;
            offsetY = (height - renderHeight) / 2;
        }

        ctx.drawImage(
            video,
            offsetX,
            offsetY,
            renderWidth,
            renderHeight
        );
    } else {
        // 更自然的纯色背景
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#3498db');
        gradient.addColorStop(1, '#2c3e50');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }
}


export function callbackForVideo(result: ImageSegmenterResult,
                                 predictWebcamObject: PredictWebcamObject
) {
    const canvasRef = predictWebcamObject.canvasRef;
    const videoRef = predictWebcamObject.videoRef;
    const maskCtxRef = predictWebcamObject.maskCtxRef;
    const compositeCtxRef = predictWebcamObject.compositeCtxRef;
    const tempCanvasRef = predictWebcamObject.tempCanvasRef;
    const maskCanvasRef = predictWebcamObject.maskCanvasRef;
    const compositeCanvasRef = predictWebcamObject.compositeCanvasRef;
    const tempCtxRef = predictWebcamObject.tempCtxRef;
    if (!canvasRef.current || !result.confidenceMasks || !videoRef.current) {
        return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || !maskCtxRef.current || !compositeCtxRef.current) return;

    const video = videoRef.current;
    const width = video.videoWidth;
    const height = video.videoHeight;

    // 确保画布尺寸正确
    if (canvas.width !== width || canvas.height !== height) {
        console.log("canvas.width", canvas.width);
        console.log("canvas.height", canvas.height);
        console.log("width", width);
        console.log("height", height);
        canvas.width = width;
        canvas.height = height;
    }

    // 获取最可能类别的置信度掩码（人物）
    const mask: Uint8Array = result.confidenceMasks[0].getAsUint8Array();

    // 设置三个canvas的尺寸
    tempCanvasRef.current.width = width;
    tempCanvasRef.current.height = height;
    maskCanvasRef.current.width = width;
    maskCanvasRef.current.height = height;
    compositeCanvasRef.current.width = width;
    compositeCanvasRef.current.height = height;

    // 1. 绘制背景到主canvas
    drawBackground(
        ctx,
        width,
        height,
        predictWebcamObject
    );

    // 2. 绘制原始视频帧到临时canvas
    const tempCtx = tempCtxRef.current;
    if (!tempCtx) return;

    tempCtx.clearRect(0, 0, width, height);
    tempCtx.drawImage(video, 0, 0, width, height);


    // 3. 处理掩码到maskCanvas（边缘羽化处理）
    const maskCtx = maskCtxRef.current;
    if (!maskCtx) return;

    const maskImageData = maskCtx.createImageData(width, height);
    const maskData = maskImageData.data;

    // 使用更精细的掩码处理算法
    for (let i = 0; i < mask.length; i++) {
        const confidence = mask[i] / 255; // 归一化置信度
        const j = i * 4;

        // 边缘羽化：对低置信度的像素应用平滑过渡
        let alpha;
        if (confidence < 0.2) {
            alpha = 0; // 低于阈值完全透明
        } else if (confidence < 0.5) {
            // 在0.2-0.5之间的平滑过渡
            alpha = (confidence - 0.2) * (1 / (0.5 - 0.2));
        } else {
            alpha = 1; // 高置信度完全不透明
        }

        maskData[j] = 255;
        maskData[j + 1] = 255;
        maskData[j + 2] = 255;
        maskData[j + 3] = alpha * 255; // 应用羽化后的alpha
    }

    maskCtx.putImageData(maskImageData, 0, 0);

    // 4. 应用高斯模糊使边缘更平滑
    maskCtx.save();
    maskCtx.filter = 'blur(2px)';
    maskCtx.drawImage(maskCanvasRef.current, 0, 0);
    maskCtx.restore();

    // 5. 在复合canvas上合成前景
    const compositeCtx = compositeCtxRef.current;
    if (!compositeCtx) return;

    compositeCtx.clearRect(0, 0, width, height);
    compositeCtx.drawImage(tempCanvasRef.current, 0, 0);
    compositeCtx.globalCompositeOperation = 'destination-in';
    compositeCtx.drawImage(maskCanvasRef.current, 0, 0);

    // 6. 将合成后的前景绘制到主canvas
    ctx.drawImage(compositeCanvasRef.current, 0, 0);

    // 7. 在边缘添加1px描边消除杂边
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.stroke();
    requestAnimationFrame(() => predictWebcam(predictWebcamObject));
}

export type PredictWebcamObject = {
    imageSegmenterRef: React.RefObject<ImageSegmenter | null>,
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    videoRef: React.RefObject<HTMLVideoElement | null>,
    backgroundType: React.RefObject<string>,
    backgroundImgRef: React.RefObject<HTMLImageElement | null>,
    backgroundVideoRef: React.RefObject<HTMLVideoElement | null>,
    backgroundVideoPlayingRef: React.RefObject<boolean>,
    tempCanvasRef: React.RefObject<HTMLCanvasElement>,
    tempCtxRef: React.RefObject<CanvasRenderingContext2D | null>,
    maskCanvasRef: React.RefObject<HTMLCanvasElement>,
    maskCtxRef: React.RefObject<CanvasRenderingContext2D | null>,
    compositeCanvasRef: React.RefObject<HTMLCanvasElement>,
    compositeCtxRef: React.RefObject<CanvasRenderingContext2D | null>,
    lastWebcamTime: React.MutableRefObject<number>,
}

export async function predictWebcam(
    predictWebcamObject: PredictWebcamObject
) {
    //console.log('开始预测')
    const video = predictWebcamObject.videoRef.current;
    const canvas = predictWebcamObject.canvasRef.current;
    const imageSegmenter = predictWebcamObject.imageSegmenterRef.current;
    if (!video || !video.srcObject ||
        !canvas || !imageSegmenter) {
        console.log('退出预测')
        return;
    }

    if (video.currentTime == predictWebcamObject.lastWebcamTime.current) {
        requestAnimationFrame(() => predictWebcam(predictWebcamObject));
        return;
    }
    // console.log('开始预测')
    predictWebcamObject.lastWebcamTime.current = video.currentTime;

    try {
        const result = await imageSegmenter.segmentForVideo(
            video,
            performance.now()
        );
        try {
            if (predictWebcamObject.backgroundType.current!=='not') {
                //console.log('开始预测背景');
                callbackForVideo(result,
                    predictWebcamObject
                );
            }else {
                const ctx = canvas.getContext('2d');
                if (ctx) { // 绘制当前视频帧到Canvas
                    // console.log('开始预测原图')
                    // 确保画布尺寸正确
                    const width = video.videoWidth;
                    const height = video.videoHeight;
                    if (canvas.width !== width || canvas.height !== height) {
                        canvas.width = width;
                        canvas.height = height;
                    }
                    ctx.drawImage(video, 0, 0, width, height);
                }
                // 递归调用实现连续绘制
                requestAnimationFrame(() => predictWebcam(predictWebcamObject));
            }
        } finally {
            // 确保在函数结束时关闭所有掩码
            if (result.confidenceMasks) {
                result.confidenceMasks.forEach(mask => mask.close());
            }
            if (result.categoryMask) {
                result.categoryMask.close();
            }
        }
    } catch (error) {
        console.error('分割错误:', error);
    }
}



